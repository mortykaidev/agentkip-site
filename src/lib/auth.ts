import "server-only";
import { auth } from "@clerk/nextjs/server";

/*
  Auth helpers. Clerk is optional in development: with no keys the site runs
  sign-in-less, and /admin opens ONLY in development so Brandon can preview
  the site manager locally. In production, admin requires a signed-in Clerk
  user whose id is in the ADMIN_USER_IDS allowlist.
*/

export function isClerkConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY,
  );
}

function adminUserIds(): string[] {
  const raw = process.env.ADMIN_USER_IDS ?? "";
  return raw
    .split(",")
    .map((id) => id.trim())
    .filter((id) => id.length > 0);
}

export type AdminDenialReason = "signed-out" | "not-admin" | "clerk-unconfigured";

export type AdminAccess = { allowed: true } | { allowed: false; reason: AdminDenialReason };

export async function checkAdminAccess(): Promise<AdminAccess> {
  if (!isClerkConfigured()) {
    if (process.env.NODE_ENV === "development") return { allowed: true };
    return { allowed: false, reason: "clerk-unconfigured" };
  }
  const { userId } = await auth();
  if (!userId) return { allowed: false, reason: "signed-out" };
  if (!adminUserIds().includes(userId)) return { allowed: false, reason: "not-admin" };
  return { allowed: true };
}

/** Gate for every admin server action — throws instead of returning a reason. */
export async function requireAdmin(): Promise<void> {
  const access = await checkAdminAccess();
  if (!access.allowed) {
    throw new Error("Not authorized: this action is restricted to the site owner.");
  }
}
