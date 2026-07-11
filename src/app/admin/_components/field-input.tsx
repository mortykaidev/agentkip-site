"use client";

import { useId } from "react";
import type { FieldSpec } from "@/app/admin/_lib/sections";
import { ImageField } from "./image-field";

export const INPUT_CLASS =
  "w-full rounded-[10px] border border-hairline bg-elevated px-3.5 py-2.5 text-[15px] text-ink placeholder:text-ink-muted focus:border-hairline-strong focus:outline-none";

/** One labeled admin form control, driven by a FieldSpec. */
export function FieldInput({
  field,
  value,
  onChange,
  blobEnabled,
}: {
  field: FieldSpec;
  value: string;
  onChange: (next: string) => void;
  blobEnabled: boolean;
}) {
  const id = useId();

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-[13px] font-semibold text-ink-secondary">
        {field.label}
        {field.nullable ? <span className="font-normal text-ink-muted"> (optional)</span> : null}
      </label>

      {renderControl(field, id, value, onChange, blobEnabled)}

      {field.help ? <p className="mt-1.5 text-xs text-ink-muted">{field.help}</p> : null}
    </div>
  );
}

function renderControl(
  field: FieldSpec,
  id: string,
  value: string,
  onChange: (next: string) => void,
  blobEnabled: boolean,
) {
  switch (field.kind) {
    case "textarea":
    case "lines":
      return (
        <textarea
          id={id}
          value={value}
          rows={field.rows ?? 4}
          placeholder={field.placeholder}
          onChange={(event) => onChange(event.target.value)}
          className={`${INPUT_CLASS} resize-y`}
        />
      );
    case "select":
      return (
        <select
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={INPUT_CLASS}
        >
          {(field.options ?? []).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      );
    case "image":
      return <ImageField id={id} value={value} onChange={onChange} blobEnabled={blobEnabled} />;
    default:
      return (
        <input
          id={id}
          type="text"
          value={value}
          placeholder={field.placeholder}
          onChange={(event) => onChange(event.target.value)}
          className={INPUT_CLASS}
        />
      );
  }
}
