/** Store new slots in a locale-neutral format; each portal formats it for its user. */
export function serializeAppointmentSlot(date: string, time: string): string {
  return `${date}T${time}`;
}

export function formatAppointmentSlotForDisplay(slot: string, locale: "en" | "ar"): string {
  const match = slot.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}:\d{2})$/);
  if (!match) return slot;
  const [, year, month, day, time] = match;
  const localDate = new Date(Number(year), Number(month) - 1, Number(day));
  const dateLabel = new Intl.DateTimeFormat(locale === "ar" ? "ar-AE" : "en-AE", {
    weekday: "short", day: "numeric", month: "short", year: "numeric"
  }).format(localDate);
  return `${dateLabel}, ${time}`;
}

export function parseAppointmentSlot(slot?: string): { date: string; time: string } {
  const match = slot?.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})/);
  return match ? { date: match[1], time: match[2] } : { date: "", time: "" };
}

export function localToday(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}
