"use client";

import { useActionState } from "react";
import { sendContactMessage, type FormState } from "@/lib/actions";

const INITIAL_STATE: FormState = { status: "idle", message: "" };

const FIELD_WRAP = "siri-glow rounded-[10px] border border-hairline bg-surface";
const FIELD_INPUT =
  "w-full bg-transparent px-3.5 py-2.5 text-[15px] text-ink placeholder:text-ink-muted focus:outline-none";
const FIELD_LABEL = "mb-1.5 block text-[13px] font-semibold text-ink-secondary";

/** Public contact form — submissions land in contact_messages and show in /admin. */
export function ContactForm({ className = "" }: { className?: string }) {
  const [state, formAction, isPending] = useActionState(sendContactMessage, INITIAL_STATE);

  if (state.status === "success") {
    return (
      <div className={`kip-card flex items-center gap-3 p-5 ${className}`} role="status">
        <span className="size-2 shrink-0 rounded-full bg-accent" aria-hidden="true" />
        <p className="text-sm font-medium text-ink">
          Message sent — Brandon will get back to you.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className={`space-y-4 ${className}`} noValidate>
      <div>
        <label htmlFor="contact-name" className={FIELD_LABEL}>
          Name
        </label>
        <div className={FIELD_WRAP}>
          <input
            id="contact-name"
            type="text"
            name="name"
            required
            autoComplete="name"
            placeholder="Your name"
            className={FIELD_INPUT}
          />
        </div>
      </div>

      <div>
        <label htmlFor="contact-email" className={FIELD_LABEL}>
          Email
        </label>
        <div className={FIELD_WRAP}>
          <input
            id="contact-email"
            type="email"
            name="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            className={FIELD_INPUT}
          />
        </div>
      </div>

      <div>
        <label htmlFor="contact-message" className={FIELD_LABEL}>
          Message
        </label>
        <div className={FIELD_WRAP}>
          <textarea
            id="contact-message"
            name="message"
            required
            rows={5}
            placeholder="Questions, bug reports, invite requests…"
            className={`${FIELD_INPUT} resize-y`}
          />
        </div>
      </div>

      {/* Honeypot — humans never see or fill this. */}
      <input
        type="text"
        name="company"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="hidden"
      />

      {state.status === "error" ? (
        <p className="text-sm text-danger" role="alert">
          {state.message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="kip-press inline-flex items-center justify-center rounded-[14px] bg-accent px-5 py-3 text-[15px] font-semibold text-on-accent transition-colors hover:brightness-105 disabled:opacity-50"
      >
        {isPending ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}
