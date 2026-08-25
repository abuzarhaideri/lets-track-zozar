/** Build a stable month key like "2026-08" from year + 0-indexed month */
export function monthKey(year: number, month: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}`;
}

/** Parse "YYYY-MM" back to { year, month } */
export function parseMonthKey(key: string): { year: number; month: number } {
  const [y, m] = key.split('-').map(Number);
  return { year: y, month: m - 1 };
}

/** Days in a given month (handles leap years) */
export function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/** Compare month keys — newest first (descending) */
export function compareMonthKeysDesc(a: string, b: string): number {
  return b.localeCompare(a);
}

/** Today's calendar parts in local timezone */
export function todayParts(): { year: number; month: number; day: number } {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth(), day: now.getDate() };
}

/** Format month label e.g. "August 2026" */
export function formatMonthLabel(year: number, month: number): string {
  return new Date(year, month, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
}

/** Gregorian date string for display */
export function formatGregorianDate(date: Date = new Date()): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

/** Hijri date via Intl (Islamic Umm al-Qura calendar where supported) */
export function formatHijriDate(date: Date = new Date()): string {
  try {
    return new Intl.DateTimeFormat('en-US', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      calendar: 'islamic-uma',
    }).format(date);
  } catch {
    // Fallback for environments without islamic calendar
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  }
}

/** Whether a day cell should be interactive (today or past, not future) */
export function isDayEditable(year: number, month: number, day: number): boolean {
  const cell = new Date(year, month, day);
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  return cell <= today;
}

/** Whether this day is today */
export function isToday(year: number, month: number, day: number): boolean {
  const { year: y, month: m, day: d } = todayParts();
  return y === year && m === month && d === day;
}

/** Cycle empty → done → missed → empty */
export function cycleDayStatus(
  current: 'done' | 'missed' | null,
): 'done' | 'missed' | null {
  if (current === null) return 'done';
  if (current === 'done') return 'missed';
  return null;
}

/** Count done marks in a month record (only up to daysInMonth) */
export function countDoneInMonth(
  days: Record<number, 'done' | 'missed' | null>,
  year: number,
  month: number,
): number {
  const total = daysInMonth(year, month);
  let count = 0;
  for (let d = 1; d <= total; d++) {
    if (days[d] === 'done') count++;
  }
  return count;
}

/** Unique id for new tasks */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
