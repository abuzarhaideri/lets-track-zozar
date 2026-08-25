import type { MonthRecord, PersonData, Task } from '../types';
import { daysInMonth, monthKey, todayParts } from './dates';

/** Max base XP earnable per task per month (1 XP per done day) */
export const MAX_BASE_XP_PER_TASK = 30;

/** Bonus XP granted for each complete 7-day done streak within a month */
export const STREAK_BONUS_XP = 10;

/** Days required for a streak bonus */
export const STREAK_DAYS = 7;

export interface TaskXpBreakdown {
  baseXp: number;
  streakBonus: number;
  totalXp: number;
  maxBaseXp: number;
  /** Number of complete 7-day streaks this month */
  weekStreaks: number;
}

/** Count complete 7-day streaks in a month's day map (non-overlapping blocks) */
export function countWeekStreaks(
  days: MonthRecord['days'],
  year: number,
  month: number,
): number {
  const total = daysInMonth(year, month);
  let streaks = 0;
  let run = 0;

  const flush = () => {
    streaks += Math.floor(run / STREAK_DAYS);
    run = 0;
  };

  for (let d = 1; d <= total; d++) {
    if (days[d] === 'done') {
      run++;
    } else {
      flush();
    }
  }
  flush();

  return streaks;
}

/** XP for one task in a specific month */
export function getTaskMonthXp(
  task: Task,
  year: number,
  month: number,
): TaskXpBreakdown {
  const key = monthKey(year, month);
  const record = task.months[key];
  const days = record?.days ?? {};

  let doneCount = 0;
  const total = daysInMonth(year, month);
  for (let d = 1; d <= total; d++) {
    if (days[d] === 'done') doneCount++;
  }

  const baseXp = Math.min(doneCount, MAX_BASE_XP_PER_TASK);
  const weekStreaks = countWeekStreaks(days, year, month);
  const streakBonus = weekStreaks * STREAK_BONUS_XP;

  return {
    baseXp,
    streakBonus,
    totalXp: baseXp + streakBonus,
    maxBaseXp: MAX_BASE_XP_PER_TASK,
    weekStreaks,
  };
}

/** Combined XP for all tasks in the current month */
export function getPersonMonthXp(
  person: PersonData,
  year?: number,
  month?: number,
): TaskXpBreakdown & { perTask: Record<string, TaskXpBreakdown> } {
  const parts = year !== undefined && month !== undefined
    ? { year, month }
    : todayParts();

  const perTask: Record<string, TaskXpBreakdown> = {};
  let baseXp = 0;
  let streakBonus = 0;
  let weekStreaks = 0;

  for (const task of person.tasks) {
    const xp = getTaskMonthXp(task, parts.year, parts.month);
    perTask[task.id] = xp;
    baseXp += xp.baseXp;
    streakBonus += xp.streakBonus;
    weekStreaks += xp.weekStreaks;
  }

  return {
    baseXp,
    streakBonus,
    totalXp: baseXp + streakBonus,
    maxBaseXp: MAX_BASE_XP_PER_TASK * person.tasks.length,
    weekStreaks,
    perTask,
  };
}

/** Format XP for display near a task */
export function formatTaskXp(xp: TaskXpBreakdown): string {
  if (xp.streakBonus > 0) {
    return `${xp.totalXp} XP (${xp.baseXp}/${xp.maxBaseXp} +${xp.streakBonus})`;
  }
  return `${xp.baseXp}/${xp.maxBaseXp} XP`;
}

/** Format total XP for header */
export function formatTotalXp(xp: TaskXpBreakdown): string {
  if (xp.streakBonus > 0) {
    return `${xp.totalXp} XP (+${xp.streakBonus} streak)`;
  }
  return `${xp.totalXp} XP`;
}
