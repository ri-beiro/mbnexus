/**
 * Recurrence rules (section 25) as a small human-readable string stored in
 * tasks.recurrence_rule — not full RFC 5545 RRULE, which would be overkill
 * for the handful of patterns the master prompt actually asks for:
 *
 *   "daily"                  every day
 *   "weekly:MON,WED,FRI"     specific weekdays (3-letter, comma-separated)
 *   "monthly:15"             a fixed day of the month
 *   "yearly:MM-DD"           a fixed day of the year
 *   "interval:Nd"            every N days from the reference date
 */

const WEEKDAY_CODES = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"] as const;

function toDate(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00Z`);
}

function toIso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(isoDate: string, days: number): string {
  const date = toDate(isoDate);
  date.setUTCDate(date.getUTCDate() + days);
  return toIso(date);
}

function nextWeekly(codes: string[], fromDate: string): string | null {
  const targetDows = codes
    .map((c) => WEEKDAY_CODES.indexOf(c.trim().toUpperCase() as (typeof WEEKDAY_CODES)[number]))
    .filter((i) => i !== -1);
  if (targetDows.length === 0) return null;

  const fromDow = toDate(fromDate).getUTCDay();
  const offsets = targetDows.map((d) => ((d - fromDow - 1 + 7) % 7) + 1);
  return addDays(fromDate, Math.min(...offsets));
}

function nextMonthly(day: number, fromDate: string): string | null {
  if (!Number.isInteger(day) || day < 1 || day > 31) return null;
  const from = toDate(fromDate);

  const thisMonth = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), day));
  if (toIso(thisMonth) > fromDate) return toIso(thisMonth);

  const nextMonth = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth() + 1, day));
  return toIso(nextMonth);
}

function nextYearly(month: number, day: number, fromDate: string): string | null {
  if (!Number.isInteger(month) || month < 1 || month > 12) return null;
  if (!Number.isInteger(day) || day < 1 || day > 31) return null;
  const from = toDate(fromDate);

  const thisYear = new Date(Date.UTC(from.getUTCFullYear(), month - 1, day));
  if (toIso(thisYear) > fromDate) return toIso(thisYear);

  const nextYear = new Date(Date.UTC(from.getUTCFullYear() + 1, month - 1, day));
  return toIso(nextYear);
}

/** Next occurrence strictly after `fromDate`, or null if `rule` is empty or
 * unrecognized. */
export function computeNextOccurrence(rule: string | null, fromDate: string): string | null {
  if (!rule) return null;

  if (rule === "daily") return addDays(fromDate, 1);

  const [kind, arg] = rule.split(":", 2);

  if (kind === "interval" && arg?.endsWith("d")) {
    const days = Number(arg.slice(0, -1));
    return Number.isInteger(days) && days > 0 ? addDays(fromDate, days) : null;
  }

  if (kind === "weekly" && arg) return nextWeekly(arg.split(","), fromDate);

  if (kind === "monthly" && arg) return nextMonthly(Number(arg), fromDate);

  if (kind === "yearly" && arg) {
    const [month, day] = arg.split("-").map(Number);
    return nextYearly(month, day, fromDate);
  }

  return null;
}

export const RECURRENCE_PRESETS: { rule: string; label: string }[] = [
  { rule: "daily", label: "Diariamente" },
  { rule: "weekly:MON", label: "Toda segunda-feira" },
  { rule: "weekly:MON,WED,FRI", label: "Segunda, quarta e sexta" },
  { rule: "monthly:1", label: "Todo dia 1º do mês" },
  { rule: "interval:15d", label: "A cada 15 dias" },
];
