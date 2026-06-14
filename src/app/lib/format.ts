import type { ConceptDocument, FindingSeverity } from "../../core/okf-types";
import { deriveTitle } from "../../core/source-model";

const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

export function conceptTitle(concept: ConceptDocument): string {
  return concept.title ?? deriveTitle(concept.path);
}

export function formatDate(value?: string): string {
  if (!value) return "Not provided";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return dateTimeFormatter.format(date);
}

export function severityBadge(severity: FindingSeverity): string {
  if (severity === "error") return "badge-danger";
  if (severity === "warning") return "badge-warning";
  return "badge-primary";
}

export function valueLabel(value: unknown): string {
  if (Array.isArray(value)) return value.map(valueLabel).join(", ");
  if (typeof value === "object" && value !== null) return JSON.stringify(value);
  if (value === undefined || value === null || value === "") return "Not provided";
  return String(value);
}
