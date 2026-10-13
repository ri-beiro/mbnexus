// Only month/day are ever compared — the stored year is irrelevant to
// whether today is the person's birthday.
export function isBirthdayToday(birthday: string | null, today: Date): boolean {
  if (!birthday) return false;
  const [, month, day] = birthday.split("-").map(Number);
  return today.getUTCMonth() + 1 === month && today.getUTCDate() === day;
}
