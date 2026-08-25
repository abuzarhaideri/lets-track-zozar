import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { AppData, DayStatus, PersonData, PersonId, Task } from '../types';
import { cycleDayStatus } from '../utils/dates';
import { getPersonMonthXp } from '../utils/xp';
import {
  addTask,
  ensureCurrentMonth,
  getTodayStats,
  loadAppData,
  removeTask,
  restoreTask,
  saveAppData,
  setDayStatus,
  updatePersonData,
  updateTaskLabel,
} from '../utils/storage';

const UNDO_TIMEOUT_MS = 8000;

interface DeletedTaskSnapshot {
  personId: PersonId;
  task: Task;
  index: number;
}

interface AppDataContextValue {
  getPerson: (id: PersonId) => PersonData;
  getTodayStats: (id: PersonId) => ReturnType<typeof getTodayStats>;
  getMonthXp: (id: PersonId) => ReturnType<typeof getPersonMonthXp>;
  toggleDay: (
    personId: PersonId,
    taskId: string,
    monthKeyStr: string,
    day: number,
  ) => void;
  addTask: (personId: PersonId, label: string) => void;
  removeTask: (personId: PersonId, taskId: string) => void;
  undoDelete: (personId: PersonId) => void;
  dismissUndo: (personId: PersonId) => void;
  pendingUndo: (personId: PersonId) => DeletedTaskSnapshot | null;
  updateTaskLabel: (personId: PersonId, taskId: string, label: string) => void;
}

const AppDataContext = createContext<AppDataContextValue | null>(null);

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [appData, setAppData] = useState<AppData>(() => loadAppData());
  const [undoSnapshots, setUndoSnapshots] = useState<
    Partial<Record<PersonId, DeletedTaskSnapshot>>
  >({});
  const undoTimers = useRef<Partial<Record<PersonId, ReturnType<typeof setTimeout>>>>({});

  const clearUndoTimer = useCallback((personId: PersonId) => {
    const timer = undoTimers.current[personId];
    if (timer) {
      clearTimeout(timer);
      delete undoTimers.current[personId];
    }
  }, []);

  const dismissUndo = useCallback(
    (personId: PersonId) => {
      clearUndoTimer(personId);
      setUndoSnapshots((prev) => {
        const next = { ...prev };
        delete next[personId];
        return next;
      });
    },
    [clearUndoTimer],
  );

  // Month rollover check (shared for both people)
  useEffect(() => {
    const checkMonth = () => {
      setAppData((prev) => {
        const zoya = ensureCurrentMonth(prev.zoya);
        const abuzar = ensureCurrentMonth(prev.abuzar);
        if (zoya === prev.zoya && abuzar === prev.abuzar) return prev;
        const next = { zoya, abuzar };
        saveAppData(next);
        return next;
      });
    };

    checkMonth();
    const interval = setInterval(checkMonth, 60_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    return () => {
      Object.values(undoTimers.current).forEach(clearTimeout);
    };
  }, []);

  const persistPerson = useCallback((personId: PersonId, person: PersonData) => {
    setAppData((prev) => updatePersonData(prev, personId, person));
  }, []);

  const getPerson = useCallback(
    (id: PersonId) => appData[id],
    [appData],
  );

  const getMonthXp = useCallback(
    (id: PersonId) => getPersonMonthXp(appData[id]),
    [appData],
  );

  const toggleDay = useCallback(
    (
      personId: PersonId,
      taskId: string,
      monthKeyStr: string,
      day: number,
    ) => {
      const person = appData[personId];
      const task = person.tasks.find((t) => t.id === taskId);
      const current: DayStatus = task?.months[monthKeyStr]?.days[day] ?? null;
      const next = cycleDayStatus(current);
      persistPerson(personId, setDayStatus(person, taskId, monthKeyStr, day, next));
    },
    [appData, persistPerson],
  );

  const handleRemoveTask = useCallback(
    (personId: PersonId, taskId: string) => {
      const person = appData[personId];
      const { person: nextPerson, removed, index } = removeTask(person, taskId);
      if (!removed || index === -1) return;

      persistPerson(personId, nextPerson);

      clearUndoTimer(personId);
      setUndoSnapshots((prev) => ({
        ...prev,
        [personId]: { personId, task: removed, index },
      }));

      undoTimers.current[personId] = setTimeout(() => {
        dismissUndo(personId);
      }, UNDO_TIMEOUT_MS);
    },
    [appData, persistPerson, clearUndoTimer, dismissUndo],
  );

  const undoDelete = useCallback(
    (personId: PersonId) => {
      const snapshot = undoSnapshots[personId];
      if (!snapshot) return;

      clearUndoTimer(personId);
      setUndoSnapshots((prev) => {
        const next = { ...prev };
        delete next[personId];
        return next;
      });

      const person = appData[personId];
      persistPerson(personId, restoreTask(person, snapshot.task, snapshot.index));
    },
    [undoSnapshots, appData, persistPerson, clearUndoTimer],
  );

  const value = useMemo<AppDataContextValue>(
    () => ({
      getPerson,
      getTodayStats: (id) => getTodayStats(appData[id]),
      getMonthXp,
      toggleDay,
      addTask: (id, label) => persistPerson(id, addTask(appData[id], label)),
      removeTask: handleRemoveTask,
      undoDelete,
      dismissUndo,
      pendingUndo: (id) => undoSnapshots[id] ?? null,
      updateTaskLabel: (id, taskId, label) =>
        persistPerson(id, updateTaskLabel(appData[id], taskId, label)),
    }),
    [
      appData,
      getPerson,
      getMonthXp,
      toggleDay,
      handleRemoveTask,
      undoDelete,
      dismissUndo,
      undoSnapshots,
      persistPerson,
    ],
  );

  return (
    <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>
  );
}

export function useAppData() {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error('useAppData must be used within AppDataProvider');
  return ctx;
}

/** Convenience hook for a single person's column */
export function usePersonData(personId: PersonId) {
  const {
    getPerson,
    getTodayStats,
    getMonthXp,
    toggleDay,
    addTask,
    removeTask,
    undoDelete,
    dismissUndo,
    pendingUndo,
    updateTaskLabel,
  } = useAppData();

  const person = getPerson(personId);
  const todayStats = getTodayStats(personId);
  const monthXp = getMonthXp(personId);

  return {
    person,
    todayStats,
    monthXp,
    toggleDay: (taskId: string, monthKeyStr: string, day: number) =>
      toggleDay(personId, taskId, monthKeyStr, day),
    addTask: (label: string) => addTask(personId, label),
    removeTask: (taskId: string) => removeTask(personId, taskId),
    undoDelete: () => undoDelete(personId),
    dismissUndo: () => dismissUndo(personId),
    pendingUndo: pendingUndo(personId),
    updateTaskLabel: (taskId: string, label: string) =>
      updateTaskLabel(personId, taskId, label),
  };
}
