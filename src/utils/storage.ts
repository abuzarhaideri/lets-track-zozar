import { DEFAULT_TASK_LABELS } from '../constants/defaultTasks';
import type { AppData, DayStatus, MonthRecord, PersonData, PersonId, Task } from '../types';
import { daysInMonth, generateId, monthKey, todayParts } from './dates';

const STORAGE_KEY = 'zozar-tracker-v1';
const BACKUP_KEY = 'zozar-tracker-v1-backup';

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

/** JSON.parse stores object keys as strings — normalize day numbers */
function normalizeDays(
  days: Record<string | number, DayStatus> | undefined,
): Record<number, DayStatus> {
  const normalized: Record<number, DayStatus> = {};
  if (!days) return normalized;

  for (const [key, value] of Object.entries(days)) {
    const day = Number(key);
    if (day >= 1 && day <= 31 && (value === 'done' || value === 'missed')) {
      normalized[day] = value;
    }
  }
  return normalized;
}

function normalizeMonthRecord(raw: Partial<MonthRecord> | undefined): MonthRecord | null {
  if (!raw || typeof raw.year !== 'number' || typeof raw.month !== 'number') {
    return null;
  }
  return {
    year: raw.year,
    month: raw.month,
    days: normalizeDays(raw.days as Record<string | number, DayStatus>),
  };
}

function normalizeTask(raw: Partial<Task> | undefined): Task | null {
  if (!raw?.id || !raw.label) return null;

  const months: Record<string, MonthRecord> = {};
  if (raw.months && typeof raw.months === 'object') {
    for (const [key, record] of Object.entries(raw.months)) {
      const normalized = normalizeMonthRecord(record);
      if (normalized) months[key] = normalized;
    }
  }

  return { id: raw.id, label: raw.label, months };
}

function normalizePersonData(raw: Partial<PersonData> | undefined): PersonData | null {
  if (!raw?.tasks || !Array.isArray(raw.tasks)) return null;

  const tasks = raw.tasks
    .map((t) => normalizeTask(t))
    .filter((t): t is Task => t !== null);

  if (tasks.length === 0) return null;
  return { tasks };
}

/** Validate and repair loaded data instead of discarding it */
export function normalizeAppData(raw: unknown): AppData | null {
  if (!raw || typeof raw !== 'object') return null;

  const data = raw as Partial<AppData>;
  const zoya = normalizePersonData(data.zoya);
  const abuzar = normalizePersonData(data.abuzar);

  if (!zoya && !abuzar) return null;

  return {
    zoya: zoya ?? createDefaultPersonData(),
    abuzar: abuzar ?? createDefaultPersonData(),
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

function readRawStorage(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    try {
      return sessionStorage.getItem(key);
    } catch {
      return null;
    }
  }
}

function writeRawStorage(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    try {
      sessionStorage.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  }
}

/** Persist full app state — also keeps a backup copy */
export function saveAppData(data: AppData): boolean {
  const serialized = JSON.stringify(data);
  const saved = writeRawStorage(STORAGE_KEY, serialized);
  writeRawStorage(BACKUP_KEY, serialized);
  return saved;
}

/** Load from localStorage (with backup fallback), migrate month if needed */
export function loadAppData(): AppData {
  const raw = readRawStorage(STORAGE_KEY) ?? readRawStorage(BACKUP_KEY);

  if (!raw) {
    const fresh = createDefaultAppData();
    saveAppData(fresh);
    return fresh;
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    const normalized = normalizeAppData(parsed);

    if (!normalized) {
      // Keep raw backup — don't overwrite with defaults on partial parse failure
      console.warn('[ZOZAR] Saved data could not be normalized; using defaults.');
      const fresh = createDefaultAppData();
      saveAppData(fresh);
      return fresh;
    }

    const migrated: AppData = {
      zoya: ensureCurrentMonth(normalized.zoya),
      abuzar: ensureCurrentMonth(normalized.abuzar),
    };

    // Always re-save after load to normalize key formats and ensure current month exists
    saveAppData(migrated);
    return migrated;
  } catch (err) {
    console.error('[ZOZAR] Failed to parse saved data:', err);
    const fresh = createDefaultAppData();
    saveAppData(fresh);
    return fresh;
  }
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

/** Apply a person update using latest full app state (avoids stale overwrites) */
export function applyPersonUpdate(
  data: AppData,
  personId: PersonId,
  updater: (person: PersonData) => PersonData,
): AppData {
  const nextPerson = updater(data[personId]);
  if (nextPerson === data[personId]) return data;
  return updatePersonData(data, personId, nextPerson);
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
  const total = person.tasks.length;

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

/** Whether browser storage is usable */
export function isStorageAvailable(): boolean {
  try {
    const test = '__zozar_storage_test__';
    localStorage.setItem(test, '1');
    localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
}
