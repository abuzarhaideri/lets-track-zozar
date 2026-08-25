import { DEFAULT_TASK_LABELS } from '../constants/defaultTasks';
import type { AppData, DayStatus, MonthRecord, PersonData, PersonId, Task } from '../types';
import { daysInMonth, generateId, monthKey, todayParts } from './dates';

const STORAGE_KEY = 'zozar-tracker-v1';

/** Create empty month record for the given year/month */
export function createMonthRecord(year: number, month: number): MonthRecord {
  return { year, month, days: {} };
}

/** Build default tasks with the current month initialized */
function createDefaultTasks(): Task[] {
  const { year, month } = todayParts();
  const key = monthKey(year, month);

  return DEFAULT_TASK_LABELS.map((label) => ({
    id: generateId(),
    label,
    months: {
      [key]: createMonthRecord(year, month),
    },
  }));
}

function createDefaultPersonData(): PersonData {
  return { tasks: createDefaultTasks() };
}

function createDefaultAppData(): AppData {
  return {
    zoya: createDefaultPersonData(),
    abuzar: createDefaultPersonData(),
  };
}

/**
 * Ensure every task has a record for the current calendar month.
 * Called on load and after month rollover — never deletes old months.
 */
export function ensureCurrentMonth(person: PersonData): PersonData {
  const { year, month } = todayParts();
  const key = monthKey(year, month);

  let changed = false;
  const tasks = person.tasks.map((task) => {
    if (task.months[key]) return task;
    changed = true;
    return {
      ...task,
      months: {
        ...task.months,
        [key]: createMonthRecord(year, month),
      },
    };
  });

  return changed ? { tasks } : person;
}

/** Load from localStorage, migrate month if needed */
export function loadAppData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const fresh = createDefaultAppData();
      saveAppData(fresh);
      return fresh;
    }

    const parsed = JSON.parse(raw) as AppData;
    const migrated: AppData = {
      zoya: ensureCurrentMonth(parsed.zoya ?? createDefaultPersonData()),
      abuzar: ensureCurrentMonth(parsed.abuzar ?? createDefaultPersonData()),
    };

    if (migrated.zoya !== parsed.zoya || migrated.abuzar !== parsed.abuzar) {
      saveAppData(migrated);
    }
    return migrated;
  } catch {
    const fresh = createDefaultAppData();
    saveAppData(fresh);
    return fresh;
  }
}

/** Persist full app state */
export function saveAppData(data: AppData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

/** Get one person's slice */
export function getPersonData(data: AppData, personId: PersonId): PersonData {
  return data[personId];
}

/** Replace one person's slice and save */
export function updatePersonData(
  data: AppData,
  personId: PersonId,
  person: PersonData,
): AppData {
  const next = { ...data, [personId]: person };
  saveAppData(next);
  return next;
}

/** Set day status for a task in a specific month */
export function setDayStatus(
  person: PersonData,
  taskId: string,
  monthKeyStr: string,
  day: number,
  status: DayStatus,
): PersonData {
  const tasks = person.tasks.map((task) => {
    if (task.id !== taskId) return task;
    const month = task.months[monthKeyStr];
    if (!month) return task;

    const nextDays = { ...month.days };
    if (status === null) {
      delete nextDays[day];
    } else {
      nextDays[day] = status;
    }

    return {
      ...task,
      months: {
        ...task.months,
        [monthKeyStr]: { ...month, days: nextDays },
      },
    };
  });

  return { tasks };
}

/** Add a new custom task with current month initialized */
export function addTask(person: PersonData, label: string): PersonData {
  const trimmed = label.trim();
  if (!trimmed) return person;

  const { year, month } = todayParts();
  const key = monthKey(year, month);

  const newTask: Task = {
    id: generateId(),
    label: trimmed,
    months: { [key]: createMonthRecord(year, month) },
  };

  return { tasks: [...person.tasks, newTask] };
}

/** Remove task by id — returns removed task + index for undo */
export function removeTask(
  person: PersonData,
  taskId: string,
): { person: PersonData; removed: Task | null; index: number } {
  const index = person.tasks.findIndex((t) => t.id === taskId);
  if (index === -1) {
    return { person, removed: null, index: -1 };
  }
  const removed = person.tasks[index];
  return {
    person: { tasks: person.tasks.filter((t) => t.id !== taskId) },
    removed,
    index,
  };
}

/** Restore a previously deleted task at its original position */
export function restoreTask(
  person: PersonData,
  task: Task,
  index: number,
): PersonData {
  const tasks = [...person.tasks];
  const safeIndex = Math.min(Math.max(0, index), tasks.length);
  // Avoid duplicate if already restored
  if (tasks.some((t) => t.id === task.id)) return person;
  tasks.splice(safeIndex, 0, task);
  return { tasks };
}

/** Update task label */
export function updateTaskLabel(
  person: PersonData,
  taskId: string,
  label: string,
): PersonData {
  const trimmed = label.trim();
  if (!trimmed) return person;

  return {
    tasks: person.tasks.map((t) =>
      t.id === taskId ? { ...t, label: trimmed } : t,
    ),
  };
}

/** Sorted month keys for a task (newest first) */
export function getSortedMonthKeys(task: Task): string[] {
  return Object.keys(task.months).sort((a, b) => b.localeCompare(a));
}

/** Today's completion stats for encouragement message */
export function getTodayStats(person: PersonData): {
  done: number;
  total: number;
} {
  const { year, month, day } = todayParts();
  const key = monthKey(year, month);
  let done = 0;
  let total = person.tasks.length;

  for (const task of person.tasks) {
    const record = task.months[key];
    if (record?.days[day] === 'done') done++;
  }

  return { done, total };
}

/** Monthly summary for accordion header */
export function getMonthSummary(
  days: Record<number, DayStatus>,
  year: number,
  month: number,
): { done: number; total: number } {
  const total = daysInMonth(year, month);
  let done = 0;
  for (let d = 1; d <= total; d++) {
    if (days[d] === 'done') done++;
  }
  return { done, total };
}
