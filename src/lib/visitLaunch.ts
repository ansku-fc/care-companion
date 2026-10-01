// Shared launch helper for the visit-intake route. The appointment slot travels
// as query params (not router state) so it survives redirects, the auth gate,
// re-navigation, and refresh — router state can be dropped by any of those.
// ISO datetime strings; no patient identifiers in the URL.
export function visitPathWithSlot(patientId: string, slotStart?: string, slotEnd?: string): string {
  const base = `/patients/${patientId}/visit/new`;
  if (!slotStart || !slotEnd) return base;
  return `${base}?${new URLSearchParams({ start: slotStart, end: slotEnd }).toString()}`;
}
