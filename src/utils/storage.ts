import { DEFAULT_TASK_LABELS } from '../constants/defaultTasks';
import type { AppData, DayStatus, MonthRecord, PersonData, PersonId, Task } from '../types';
import { daysInMonth, generateId, monthKey, parseMonthKey, todayParts } from './dates';

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
  days: Record<string | number, DayStatus | boolean | string> | undefined,
): Record<number, DayStatus> {
  const normalized: Record<number, DayStatus> = {};
  if (!days) return normalized;

  for (const [key, value] of Object.entries(days)) {
    const day = Number(key);
    if (day >= 1 && day <= 31) {
      if (value === 'done' || value === true || value === 'checked') {
        normalized[day] = 'done';
      } else if (value === 'missed') {
        normalized[day] = 'missed';
      }
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

const IDB_NAME = 'zozar-db';
const IDB_STORE = 'app_data';

function openIDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      return reject(new Error('IndexedDB unavailable'));
    }
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveToIndexedDB(data: AppData): Promise<void> {
  try {
    const db = await openIDB();
    const tx = db.transaction(IDB_STORE, 'readwrite');
    const store = tx.objectStore(IDB_STORE);
    store.put(data, STORAGE_KEY);
  } catch (err) {
    console.warn('[ZOZAR] IndexedDB save failed:', err);
  }
}

export async function loadFromIndexedDB(): Promise<AppData | null> {
  try {
    const db = await openIDB();
    return new Promise((resolve) => {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const store = tx.objectStore(IDB_STORE);
      const req = store.get(STORAGE_KEY);
      req.onsuccess = () => {
        const normalized = normalizeAppData(req.result);
        resolve(normalized);
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

function readRawStorage(key: string): string | null {
  try {
    const val = localStorage.getItem(key);
    if (val !== null) return val;
  } catch (e) {
    console.warn(`[ZOZAR] Failed reading localStorage for ${key}:`, e);
  }
  try {
    return sessionStorage.getItem(key);
  } catch (e) {
    console.warn(`[ZOZAR] Failed reading sessionStorage for ${key}:`, e);
    return null;
  }
}

function writeRawStorage(key: string, value: string): boolean {
  let success = false;
  try {
    localStorage.setItem(key, value);
    success = true;
  } catch (e) {
    console.warn(`[ZOZAR] Failed to write to localStorage for key ${key}:`, e);
  }
  try {
    sessionStorage.setItem(key, value);
    success = true;
  } catch (e) {
    console.warn(`[ZOZAR] Failed to write to sessionStorage for key ${key}:`, e);
  }
  return success;
}

/** Persist full app state — keeps primary, backup, and IndexedDB synchronized */
export function saveAppData(data: AppData): boolean {
  const serialized = JSON.stringify(data);
  const saved = writeRawStorage(STORAGE_KEY, serialized);
  writeRawStorage(BACKUP_KEY, serialized);
  saveToIndexedDB(data).catch(() => {});
  return saved;
}

/** Load from localStorage (with backup fallback), migrate month if needed */
export function loadAppData(): AppData {
  const rawPrimary = readRawStorage(STORAGE_KEY);
  const rawBackup = readRawStorage(BACKUP_KEY);

  let parsed: unknown = null;
  if (rawPrimary) {
    try {
      parsed = JSON.parse(rawPrimary);
    } catch {
      console.warn('[ZOZAR] Primary storage JSON corrupted. Trying backup...');
    }
  }

  if (!parsed && rawBackup) {
    try {
      parsed = JSON.parse(rawBackup);
    } catch {
      console.warn('[ZOZAR] Backup storage JSON corrupted.');
    }
  }

  if (!parsed) {
    const fresh = createDefaultAppData();
    saveAppData(fresh);
    return fresh;
  }

  const normalized = normalizeAppData(parsed);

  if (!normalized) {
    console.warn('[ZOZAR] Saved data could not be normalized; using defaults.');
    const fresh = createDefaultAppData();
    saveAppData(fresh);
    return fresh;
  }

  const migrated: AppData = {
    zoya: ensureCurrentMonth(normalized.zoya),
    abuzar: ensureCurrentMonth(normalized.abuzar),
  };

  saveAppData(migrated);
  return migrated;
}

/** Export current AppData as nicely formatted JSON string */
export function exportAppDataJson(data: AppData): string {
  return JSON.stringify(data, null, 2);
}

/** Parse and validate imported JSON string into AppData */
export function importAppDataJson(jsonString: string): AppData | null {
  try {
    const raw = JSON.parse(jsonString);
    const normalized = normalizeAppData(raw);
    if (!normalized) return null;
    return {
      zoya: ensureCurrentMonth(normalized.zoya),
      abuzar: ensureCurrentMonth(normalized.abuzar),
    };
  } catch (err) {
    console.error('[ZOZAR] Failed to import JSON data:', err);
    return null;
  }
}

/** Reset app data back to fresh defaults */
export function resetAppData(): AppData {
  const fresh = createDefaultAppData();
  saveAppData(fresh);
  return fresh;
}

/** Get one person's slice */
export function getPersonData(data: AppData, personId: PersonId): PersonData {
  return data[personId];
}

/** Replace one person's slice */
export function updatePersonData(
  data: AppData,
  personId: PersonId,
  person: PersonData,
): AppData {
  return { ...data, [personId]: person };
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
  const { year, month } = parseMonthKey(monthKeyStr);

  const tasks = person.tasks.map((task) => {
    if (task.id !== taskId) return task;
    const monthRecord =
      task.months[monthKeyStr] ?? createMonthRecord(year, month);

    const nextDays = { ...monthRecord.days };
    if (status === null) {
      delete nextDays[day];
    } else {
      nextDays[day] = status;
    }

    return {
      ...task,
      months: {
        ...task.months,
        [monthKeyStr]: { ...monthRecord, days: nextDays },
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

/** Gather all unique month keys recorded across all tasks for a person (sorted newest first) */
export function getAllPersonMonthKeys(person: PersonData): string[] {
  const { year, month } = todayParts();
  const currentKey = monthKey(year, month);
  const keySet = new Set<string>([currentKey]);

  for (const task of person.tasks) {
    for (const k of Object.keys(task.months)) {
      keySet.add(k);
    }
  }

  return Array.from(keySet).sort((a, b) => b.localeCompare(a));
}

/** Ensure a specific month (e.g. past month) is initialized across all tasks for a person */
export function addMonthToPerson(person: PersonData, monthKeyStr: string): PersonData {
  const { year, month } = parseMonthKey(monthKeyStr);
  let changed = false;

  const tasks = person.tasks.map((task) => {
    if (task.months[monthKeyStr]) return task;
    changed = true;
    return {
      ...task,
      months: {
        ...task.months,
        [monthKeyStr]: createMonthRecord(year, month),
      },
    };
  });

  return changed ? { tasks } : person;
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
