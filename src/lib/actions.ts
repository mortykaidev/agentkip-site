"use server";

import { revalidatePath, updateTag } from "next/cache";
import { put } from "@vercel/blob";
import { requireAdmin } from "@/lib/auth";
import { CONTENT_CACHE_TAG } from "@/lib/content";
import type { ContentMap } from "@/lib/content-types";
import { getStore } from "@/lib/store";
import {
  CONTENT_SCHEMAS,
  contactInputSchema,
  contentKeySchema,
  idInputSchema,
  waitlistInputSchema,
} from "@/lib/store-schemas";
import { getErrorMessage } from "@/lib/store-types";

/* Server actions for the public forms and the /admin site manager.
   Every admin-only action re-checks the gate itself — never trust the page gate. */

export type FormState = {
  status: "idle" | "success" | "error";
  message: string;
};

export type UploadResult =
  | { status: "success"; url: string }
  | { status: "error"; message: string };

const GENERIC_ERROR = "Something went wrong — please try again in a moment.";
const HONEYPOT_FIELD = "company";
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

function isBotSubmission(formData: FormData): boolean {
  const honeypot = formData.get(HONEYPOT_FIELD);
  return typeof honeypot === "string" && honeypot.length > 0;
}

function revalidateContent(): void {
  // updateTag = immediate expiry with read-your-own-writes (server actions only).
  updateTag(CONTENT_CACHE_TAG);
  // Belt and braces: bust the full route cache so edits show up immediately.
  revalidatePath("/", "layout");
}

/* ---------- Public forms ---------- */

export async function joinWaitlist(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    if (isBotSubmission(formData)) {
      // Pretend success so bots learn nothing.
      return { status: "success", message: "You're on the list." };
    }
    const parsed = waitlistInputSchema.safeParse({ email: formData.get("email") });
    if (!parsed.success) {
      return { status: "error", message: "Enter a valid email address." };
    }
    // Duplicate-tolerant by design: already-subscribed still reads as success.
    await getStore().addWaitlistEmail(parsed.data.email);
    return { status: "success", message: "You're on the list." };
  } catch (error) {
    console.error("[actions] joinWaitlist failed:", getErrorMessage(error));
    return { status: "error", message: GENERIC_ERROR };
  }
}

export async function sendContactMessage(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    if (isBotSubmission(formData)) {
      return { status: "success", message: "Message sent." };
    }
    const parsed = contactInputSchema.safeParse({
      name: formData.get("name"),
      email: formData.get("email"),
      message: formData.get("message"),
    });
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return {
        status: "error",
        message: issue ? `${String(issue.path[0] ?? "Input")}: ${issue.message}` : GENERIC_ERROR,
      };
    }
    await getStore().addContactMessage(parsed.data);
    return { status: "success", message: "Message sent." };
  } catch (error) {
    console.error("[actions] sendContactMessage failed:", getErrorMessage(error));
    return { status: "error", message: GENERIC_ERROR };
  }
}

/* ---------- Admin: content sections ---------- */

export async function saveContentSection(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    await requireAdmin();

    const keyResult = contentKeySchema.safeParse(formData.get("key"));
    if (!keyResult.success) {
      return { status: "error", message: "Unknown content section." };
    }
    const key = keyResult.data;

    const raw = formData.get("value");
    if (typeof raw !== "string") {
      return { status: "error", message: "Missing section payload." };
    }
    let json: unknown;
    try {
      json = JSON.parse(raw);
    } catch {
      return { status: "error", message: "The section payload was not valid JSON." };
    }

    const parsed = CONTENT_SCHEMAS[key].safeParse(json);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const where = issue && issue.path.length > 0 ? ` (${issue.path.join(" → ")})` : "";
      return {
        status: "error",
        message: issue ? `${issue.message}${where}` : "That content didn't validate.",
      };
    }

    await getStore().setSection(key, parsed.data as ContentMap[typeof key]);
    revalidateContent();
    return { status: "success", message: "Saved — the live site is updated." };
  } catch (error) {
    console.error("[actions] saveContentSection failed:", getErrorMessage(error));
    return { status: "error", message: GENERIC_ERROR };
  }
}

export async function resetContentSection(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    await requireAdmin();
    const keyResult = contentKeySchema.safeParse(formData.get("key"));
    if (!keyResult.success) {
      return { status: "error", message: "Unknown content section." };
    }
    await getStore().deleteSection(keyResult.data);
    revalidateContent();
    return { status: "success", message: "Reset — this section now uses the seeded defaults." };
  } catch (error) {
    console.error("[actions] resetContentSection failed:", getErrorMessage(error));
    return { status: "error", message: GENERIC_ERROR };
  }
}

/* ---------- Admin: submissions ---------- */

export async function deleteWaitlistEntry(formData: FormData): Promise<void> {
  await requireAdmin();
  const parsed = idInputSchema.safeParse({ id: formData.get("id") });
  if (!parsed.success) {
    throw new Error("Invalid waitlist entry id.");
  }
  await getStore().deleteWaitlistEntry(parsed.data.id);
  revalidatePath("/admin/waitlist");
}

export async function deleteContactMessage(formData: FormData): Promise<void> {
  await requireAdmin();
  const parsed = idInputSchema.safeParse({ id: formData.get("id") });
  if (!parsed.success) {
    throw new Error("Invalid message id.");
  }
  await getStore().deleteContactMessage(parsed.data.id);
  revalidatePath("/admin/messages");
}

/* ---------- Admin: gallery uploads (Vercel Blob) ---------- */

export async function uploadGalleryImage(formData: FormData): Promise<UploadResult> {
  try {
    await requireAdmin();

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return {
        status: "error",
        message: "Uploads are off (no BLOB_READ_WRITE_TOKEN). Paste an image URL instead.",
      };
    }
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return { status: "error", message: "Choose an image file to upload." };
    }
    if (!file.type.startsWith("image/")) {
      return { status: "error", message: "Only image files can be uploaded." };
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      return { status: "error", message: "Images must be 8 MB or smaller." };
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-").slice(-80);
    const blob = await put(`gallery/${crypto.randomUUID()}-${safeName}`, file, {
      access: "public",
    });
    return { status: "success", url: blob.url };
  } catch (error) {
    console.error("[actions] uploadGalleryImage failed:", getErrorMessage(error));
    return { status: "error", message: "Upload failed — please try again." };
  }
}
