export function getFormString(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value : "";
}
