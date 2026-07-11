"use client";

import { emptyRowDraft, type RowDraft } from "@/app/admin/_lib/draft";
import type { FieldSpec } from "@/app/admin/_lib/sections";
import { FieldInput } from "./field-input";

const ICON_BUTTON =
  "kip-press flex size-8 items-center justify-center rounded-[10px] border border-hairline bg-surface text-sm text-ink-secondary transition-colors hover:border-hairline-strong hover:text-ink disabled:opacity-30 disabled:pointer-events-none";

function moveRow(rows: RowDraft[], index: number, delta: -1 | 1): RowDraft[] {
  const target = index + delta;
  if (target < 0 || target >= rows.length) return rows;
  const next = [...rows];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

/** Add / remove / reorder editor for array sections (FAQ, roadmap, gallery…). */
export function RowList({
  itemLabel,
  fields,
  rows,
  onChange,
  blobEnabled,
}: {
  itemLabel: string;
  fields: FieldSpec[];
  rows: RowDraft[];
  onChange: (rows: RowDraft[]) => void;
  blobEnabled: boolean;
}) {
  const setRowField = (index: number, name: string, value: string) => {
    onChange(rows.map((row, i) => (i === index ? { ...row, [name]: value } : row)));
  };

  return (
    <div className="space-y-4">
      {rows.length === 0 ? (
        <p className="rounded-[10px] border border-dashed border-hairline px-4 py-6 text-center text-sm text-ink-muted">
          Nothing here yet — add the first {itemLabel.toLowerCase()}.
        </p>
      ) : null}

      {rows.map((row, index) => (
        <div key={index} className="kip-card space-y-4 p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[13px] font-semibold uppercase tracking-[0.06em] text-ink-muted">
              {itemLabel} {index + 1}
            </p>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                aria-label={`Move ${itemLabel} ${index + 1} up`}
                disabled={index === 0}
                onClick={() => onChange(moveRow(rows, index, -1))}
                className={ICON_BUTTON}
              >
                ↑
              </button>
              <button
                type="button"
                aria-label={`Move ${itemLabel} ${index + 1} down`}
                disabled={index === rows.length - 1}
                onClick={() => onChange(moveRow(rows, index, 1))}
                className={ICON_BUTTON}
              >
                ↓
              </button>
              <button
                type="button"
                aria-label={`Remove ${itemLabel} ${index + 1}`}
                onClick={() => onChange(rows.filter((_, i) => i !== index))}
                className={`${ICON_BUTTON} hover:text-danger`}
              >
                ✕
              </button>
            </div>
          </div>

          {fields.map((field) => (
            <FieldInput
              key={field.name}
              field={field}
              value={row[field.name] ?? ""}
              onChange={(value) => setRowField(index, field.name, value)}
              blobEnabled={blobEnabled}
            />
          ))}
        </div>
      ))}

      <button
        type="button"
        onClick={() => onChange([...rows, emptyRowDraft(fields)])}
        className="kip-press w-full rounded-[10px] border border-dashed border-hairline-strong px-4 py-3 text-sm font-semibold text-ink-secondary transition-colors hover:text-ink"
      >
        + Add {itemLabel.toLowerCase()}
      </button>
    </div>
  );
}
