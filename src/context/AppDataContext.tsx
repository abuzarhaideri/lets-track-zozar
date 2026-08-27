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
  applyPersonUpdate,
  ensureCurrentMonth,
  getTodayStats,
  isStorageAvailable,
  loadAppData,
  removeTask,
  restoreTask,
  saveAppData,
  setDayStatus,
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
  storageAvailable: boolean;
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
  const [storageAvailable] = useState(() => isStorageAvailable());
  const appDataRef = useRef(appData);
  const [undoSnapshots, setUndoSnapshots] = useState<
    Partial<Record<PersonId, DeletedTaskSnapshot>>
  >({});
  const undoTimers = useRef<Partial<Record<PersonId, ReturnType<typeof setTimeout>>>>({});

  // Keep ref in sync for lifecycle saves
  useEffect(() => {
    appDataRef.current = appData;
  }, [appData]);

  // Flush save when user leaves / backgrounds the app (important on mobile)
  useEffect(() => {
    const flush = () => saveAppData(appDataRef.current);

    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') flush();
    });

    return () => {
      window.removeEventListener('pagehide', flush);
    };
  }, []);

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

  /** All mutations go through functional setState to avoid stale overwrites */
  const mutate = useCallback(
    (updater: (prev: AppData) => AppData) => {
      setAppData((prev) => {
        const next = updater(prev);
        if (next !== prev) saveAppData(next);
        return next;
      });
    },
    [],
  );

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
      mutate((prev) =>
        applyPersonUpdate(prev, personId, (person) => {
          const task = person.tasks.find((t) => t.id === taskId);
          const current: DayStatus =
            task?.months[monthKeyStr]?.days[day] ?? null;
          const next = cycleDayStatus(current);
          return setDayStatus(person, taskId, monthKeyStr, day, next);
        }),
      );
    },
    [mutate],
  );

  const handleRemoveTask = useCallback(
    (personId: PersonId, taskId: string) => {
      let snapshot: DeletedTaskSnapshot | null = null;

      mutate((prev) => {
        const { person: nextPerson, removed, index } = removeTask(
          prev[personId],
          taskId,
        );
        if (!removed || index === -1) return prev;

        snapshot = { personId, task: removed, index };

        return { ...prev, [personId]: nextPerson };
      });

      if (!snapshot) return;

      clearUndoTimer(personId);
      setUndoSnapshots((prev) => ({ ...prev, [personId]: snapshot! }));

      undoTimers.current[personId] = setTimeout(() => {
        dismissUndo(personId);
      }, UNDO_TIMEOUT_MS);
    },
    [mutate, clearUndoTimer, dismissUndo],
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

      mutate((prev) =>
        applyPersonUpdate(prev, personId, (person) =>
          restoreTask(person, snapshot.task, snapshot.index),
        ),
      );
    },
    [undoSnapshots, mutate, clearUndoTimer],
  );

  const value = useMemo<AppDataContextValue>(
    () => ({
      getPerson,
      getTodayStats: (id) => getTodayStats(appData[id]),
      getMonthXp,
      storageAvailable,
      toggleDay,
      addTask: (id, label) =>
        mutate((prev) =>
          applyPersonUpdate(prev, id, (person) => addTask(person, label)),
        ),
      removeTask: handleRemoveTask,
      undoDelete,
      dismissUndo,
      pendingUndo: (id) => undoSnapshots[id] ?? null,
      updateTaskLabel: (id, taskId, label) =>
        mutate((prev) =>
          applyPersonUpdate(prev, id, (person) =>
            updateTaskLabel(person, taskId, label),
          ),
        ),
    }),
    [
      appData,
      getPerson,
      getMonthXp,
      storageAvailable,
      toggleDay,
      handleRemoveTask,
      undoDelete,
      dismissUndo,
      undoSnapshots,
      mutate,
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
    storageAvailable,
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
    storageAvailable,
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
