// Shared patient name formatting utilities.
// Patient names are stored as a single `full_name` field but should be
// displayed as "Last, First" in dropdowns and pickers throughout the app.

export function splitName(full?: string | null): { first: string; last: string } {
  const s = (full ?? "").trim();
  if (!s) return { first: "", last: "" };
  // If already "Last, First", normalise back to parts
  if (s.includes(",")) {
    const [last, rest] = s.split(",", 2);
    return { first: (rest ?? "").trim(), last: last.trim() };
  }
  const parts = s.split(/\s+/);
  if (parts.length === 1) return { first: parts[0], last: "" };
  const last = parts[parts.length - 1];
  const first = parts.slice(0, -1).join(" ");
  return { first, last };
}

export function formatLastFirst(full?: string | null): string {
  const { first, last } = splitName(full);
  if (!last) return first || (full ?? "");
  if (!first) return last;
  return `${last}, ${first}`;
}

// Sort an array of patient-like objects alphabetically by "Last, First".
export function sortByLastFirst<T extends { full_name?: string | null }>(items: T[]): T[] {
  return [...items].sort((a, b) =>
    formatLastFirst(a.full_name).localeCompare(formatLastFirst(b.full_name), undefined, { sensitivity: "base" })
  );
}
