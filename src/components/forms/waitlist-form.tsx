"use client";

import { useActionState } from "react";
import { joinWaitlist, type FormState } from "@/lib/actions";

const INITIAL_STATE: FormState = { status: "idle", message: "" };

/** Public waitlist signup — duplicate-email tolerant, honeypot-protected. */
export function WaitlistForm({ className = "" }: { className?: string }) {
  const [state, formAction, isPending] = useActionState(joinWaitlist, INITIAL_STATE);

  if (state.status === "success") {
    return (
      <div className={`kip-card flex items-center gap-3 p-4 ${className}`} role="status">
        <span className="size-2 shrink-0 rounded-full bg-accent" aria-hidden="true" />
        <p className="text-sm font-medium text-ink">
          You&apos;re on the list. We&apos;ll email you when a beta spot opens up.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className={className} noValidate>
      <div className="siri-glow flex items-center gap-2 rounded-[14px] border border-hairline bg-surface p-1.5">
        <label htmlFor="waitlist-email" className="sr-only">
          Email address
        </label>
        <input
          id="waitlist-email"
          type="email"
          name="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          className="min-w-0 flex-1 bg-transparent px-3 py-2 text-[15px] text-ink placeholder:text-ink-muted focus:outline-none"
        />
        <button
          type="submit"
          disabled={isPending}
          className="kip-press shrink-0 rounded-[10px] bg-accent px-4 py-2 text-sm font-semibold text-on-accent transition-colors hover:brightness-105 disabled:opacity-50"
        >
          {isPending ? "Joining…" : "Join the waitlist"}
        </button>
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
        <p className="mt-2 text-sm text-danger" role="alert">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
