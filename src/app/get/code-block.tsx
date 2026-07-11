"use client";

import { useState } from "react";

/**
 * Copy-able mono code block for install/deploy steps.
 * Used by: src/app/get/os-tabs.tsx, src/app/docs/deploy/page.tsx.
 * Styled per plan: bg-elevated, rounded-[10px], mono text, small copy button.
 */
export function CodeBlock({ code, label }: { code: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="rounded-[10px] border border-hairline bg-elevated">
      {label ? (
        <div className="flex items-center justify-between border-b border-hairline px-3.5 py-2">
          <span className="text-xs font-semibold text-ink-muted">{label}</span>
        </div>
      ) : null}
      <div className="flex items-start justify-between gap-3 px-3.5 py-3">
        <pre className="min-w-0 flex-1 overflow-x-auto whitespace-pre-wrap break-words font-mono text-[13px] leading-relaxed text-ink-secondary">
          {code}
        </pre>
        <button
          type="button"
          onClick={handleCopy}
          className="kip-press shrink-0 rounded-[10px] border border-hairline bg-surface px-2.5 py-1.5 text-xs font-semibold text-ink-secondary transition-colors hover:text-ink"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}
