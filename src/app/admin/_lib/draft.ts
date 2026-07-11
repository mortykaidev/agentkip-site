import type { FieldSpec, SectionSpec } from "@/app/admin/_lib/sections";

/*
  Draft model for the admin editors: every field edits as a string, and
  converts back to the typed ContentMap value on submit (the server re-validates
  with zod either way). Pure functions, new objects only.
*/

export type RowDraft = Record<string, string>;

export type SectionDraft = {
  fields: RowDraft;
  rows: RowDraft[];
};

export function fieldToDraft(field: FieldSpec, raw: unknown): string {
  if (field.kind === "lines") return Array.isArray(raw) ? raw.join("\n") : "";
  if (field.kind === "tags") return Array.isArray(raw) ? raw.join(", ") : "";
  if (raw === null || raw === undefined) return "";
  return String(raw);
}

export function fieldFromDraft(field: FieldSpec, draft: string): unknown {
  if (field.kind === "lines") {
    return draft
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
  }
  if (field.kind === "tags") {
    return draft
      .split(",")
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);
  }
  const trimmed = draft.trim();
  if (field.nullable && trimmed === "") return null;
  return trimmed;
}

export function rowToDraft(fields: FieldSpec[], raw: Record<string, unknown>): RowDraft {
  return Object.fromEntries(fields.map((field) => [field.name, fieldToDraft(field, raw[field.name])]));
}

export function rowFromDraft(fields: FieldSpec[], draft: RowDraft): Record<string, unknown> {
  return Object.fromEntries(
    fields.map((field) => [field.name, fieldFromDraft(field, draft[field.name] ?? "")]),
  );
}

export function emptyRowDraft(fields: FieldSpec[]): RowDraft {
  return Object.fromEntries(
    fields.map((field) => [field.name, field.kind === "select" ? (field.options?.[0]?.value ?? "") : ""]),
  );
}

export function sectionToDraft(spec: SectionSpec, value: unknown): SectionDraft {
  if (spec.mode === "array") {
    const items = Array.isArray(value) ? (value as Record<string, unknown>[]) : [];
    return { fields: {}, rows: items.map((item) => rowToDraft(spec.fields, item)) };
  }
  const record = (value ?? {}) as Record<string, unknown>;
  const rowsRaw = spec.rowsField ? record[spec.rowsField.name] : undefined;
  const rows =
    spec.rowsField && Array.isArray(rowsRaw)
      ? (rowsRaw as Record<string, unknown>[]).map((item) => rowToDraft(spec.rowsField!.fields, item))
      : [];
  return { fields: rowToDraft(spec.fields, record), rows };
}

export function sectionFromDraft(spec: SectionSpec, draft: SectionDraft): unknown {
  if (spec.mode === "array") {
    return draft.rows.map((row) => rowFromDraft(spec.fields, row));
  }
  const base = rowFromDraft(spec.fields, draft.fields);
  if (!spec.rowsField) return base;
  return {
    ...base,
    [spec.rowsField.name]: draft.rows.map((row) => rowFromDraft(spec.rowsField!.fields, row)),
  };
}
