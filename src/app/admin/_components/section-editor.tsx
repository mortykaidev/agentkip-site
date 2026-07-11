"use client";

import { useActionState, useState } from "react";
import {
  sectionFromDraft,
  sectionToDraft,
  type SectionDraft,
} from "@/app/admin/_lib/draft";
import type { SectionSpec } from "@/app/admin/_lib/sections";
import {
  resetContentSection,
  saveContentSection,
  type FormState,
} from "@/lib/actions";
import type { ContentKey } from "@/lib/content-types";
import { FieldInput } from "./field-input";
import { RowList } from "./row-list";

const INITIAL_STATE: FormState = { status: "idle", message: "" };

function Feedback({ state }: { state: FormState }) {
  if (state.status === "idle") return null;
  const isError = state.status === "error";
  return (
    <p
      role={isError ? "alert" : "status"}
      className={`rounded-[10px] px-3.5 py-2.5 text-sm font-medium ${
        isError ? "bg-elevated text-danger" : "bg-elevated text-accent"
      }`}
    >
      {state.message}
    </p>
  );
}

/** Spec-driven editor for one content section. Server actions re-validate everything. */
export function SectionEditor({
  sectionKey,
  spec,
  initialValue,
  blobEnabled,
}: {
  sectionKey: ContentKey;
  spec: SectionSpec;
  initialValue: unknown;
  blobEnabled: boolean;
}) {
  const [draft, setDraft] = useState<SectionDraft>(() => sectionToDraft(spec, initialValue));
  const [saveState, saveAction, isSaving] = useActionState(saveContentSection, INITIAL_STATE);
  const [resetState, resetAction, isResetting] = useActionState(
    resetContentSection,
    INITIAL_STATE,
  );

  const serialized = JSON.stringify(sectionFromDraft(spec, draft));

  const setField = (name: string, value: string) =>
    setDraft((prev) => ({ ...prev, fields: { ...prev.fields, [name]: value } }));

  return (
    <div className="space-y-6">
      <form action={saveAction} className="space-y-5">
        <input type="hidden" name="key" value={sectionKey} />
        <input type="hidden" name="value" value={serialized} />

        {spec.mode === "object" ? (
          <>
            {spec.fields.map((field) => (
              <FieldInput
                key={field.name}
                field={field}
                value={draft.fields[field.name] ?? ""}
                onChange={(value) => setField(field.name, value)}
                blobEnabled={blobEnabled}
              />
            ))}
            {spec.rowsField ? (
              <div>
                <p className="mb-2 text-[13px] font-semibold text-ink-secondary">
                  {spec.rowsField.label}
                </p>
                <RowList
                  itemLabel={spec.rowsField.itemLabel}
                  fields={spec.rowsField.fields}
                  rows={draft.rows}
                  onChange={(rows) => setDraft((prev) => ({ ...prev, rows }))}
                  blobEnabled={blobEnabled}
                />
              </div>
            ) : null}
          </>
        ) : (
          <RowList
            itemLabel={spec.itemLabel}
            fields={spec.fields}
            rows={draft.rows}
            onChange={(rows) => setDraft((prev) => ({ ...prev, rows }))}
            blobEnabled={blobEnabled}
          />
        )}

        <Feedback state={saveState} />

        <button
          type="submit"
          disabled={isSaving}
          className="kip-press w-full rounded-[14px] bg-accent px-5 py-3 text-[15px] font-semibold text-on-accent transition-colors hover:brightness-105 disabled:opacity-50 sm:w-auto"
        >
          {isSaving ? "Saving…" : "Save changes"}
        </button>
      </form>

      <form
        action={resetAction}
        onSubmit={(event) => {
          if (!window.confirm("Replace this section with the seeded defaults?")) {
            event.preventDefault();
          }
        }}
        className="space-y-3 border-t border-hairline pt-5"
      >
        <input type="hidden" name="key" value={sectionKey} />
        <Feedback state={resetState} />
        <button
          type="submit"
          disabled={isResetting}
          className="text-sm font-medium text-ink-muted transition-colors hover:text-danger disabled:opacity-50"
        >
          {isResetting ? "Resetting…" : "Reset to defaults"}
        </button>
        <p className="text-xs text-ink-muted">
          Removes the saved override; the site falls back to the seeded copy. Reload this page
          afterwards to see the defaults in the editor.
        </p>
      </form>
    </div>
  );
}
