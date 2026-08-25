/** Tick / cross / unmarked state for a single calendar day */
export type DayStatus = 'done' | 'missed' | null;

/** One month's worth of day marks for a task (keyed by day-of-month 1–31) */
export interface MonthRecord {
  year: number;
  /** 0-indexed month (January = 0) */
  month: number;
  days: Record<number, DayStatus>;
}

/** A single trackable deed / amal */
export interface Task {
  id: string;
  label: string;
  /** Months keyed as "YYYY-MM" (e.g. "2026-08") */
  months: Record<string, MonthRecord>;
}

/** All data for one person */
export interface PersonData {
  tasks: Task[];
}

/** Root persisted shape */
export interface AppData {
  zoya: PersonData;
  abuzar: PersonData;
}

export type PersonId = 'zoya' | 'abuzar';

/** Visual theme passed into shared components */
export interface PersonTheme {
  id: PersonId;
  name: string;
  accent: string;
  accentLight: string;
  accentSoft: string;
  /** Tailwind arbitrary or token name for progress bars etc. */
  accentClass: string;
}

/** Arabic phrase with English translation for CalligraphyBanner */
export interface ArabicPhrase {
  arabic: string;
  translation: string;
}
