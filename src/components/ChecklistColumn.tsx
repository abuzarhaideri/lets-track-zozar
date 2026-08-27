import { motion } from 'framer-motion';
import { useState } from 'react';
import { ENCOURAGEMENT } from '../constants/phrases';
import { usePersonData } from '../hooks/usePersonData';
import type { PersonTheme } from '../types';
import {
  formatGregorianDate,
  formatHijriDate,
  formatMonthLabel,
  getRecentPastMonthOptions,
  monthKey,
  parseMonthKey,
  todayParts,
} from '../utils/dates';
import { formatTotalXp, getPersonMonthXp } from '../utils/xp';
import { CalligraphyBanner } from './CalligraphyBanner';
import { TaskRow } from './TaskRow';
import { UndoToast } from './UndoToast';

interface ChecklistColumnProps {
  theme: PersonTheme;
}

function getEncouragement(done: number, total: number): string {
  if (total === 0) return ENCOURAGEMENT.none;
  const ratio = done / total;
  if (done === 0) return ENCOURAGEMENT.none;
  if (ratio >= 1) return ENCOURAGEMENT.all;
  if (ratio >= 0.75) return ENCOURAGEMENT.most;
  if (ratio >= 0.4) return ENCOURAGEMENT.halfway;
  return ENCOURAGEMENT.started;
}

/**
 * One person's full checklist column — reused for Zoya and Abuzar.
 */
export function ChecklistColumn({ theme }: ChecklistColumnProps) {
  const {
    person,
    todayStats,
    allMonthKeys,
    storageAvailable,
    toggleDay,
    addTask,
    removeTask,
    updateTaskLabel,
    undoDelete,
    dismissUndo,
    pendingUndo,
    addPastMonth,
  } = usePersonData(theme.id);

  const { year, month } = todayParts();
  const currentMonthKey = monthKey(year, month);
  const [selectedMonthKey, setSelectedMonthKey] = useState(currentMonthKey);
  const [newTask, setNewTask] = useState('');
  const [showAdd, setShowAdd] = useState(false);

  const { year: activeYear, month: activeMonth } = parseMonthKey(selectedMonthKey);
  const activeMonthXp = getPersonMonthXp(person, activeYear, activeMonth);

  const pastMonthOptions = getRecentPastMonthOptions(12);

  const progress =
    todayStats.total > 0 ? (todayStats.done / todayStats.total) * 100 : 0;
  const message = getEncouragement(todayStats.done, todayStats.total);

  const handleAdd = () => {
    const trimmed = newTask.trim();
    if (trimmed) {
      addTask(trimmed);
      setNewTask('');
      setShowAdd(false);
    }
  };

  return (
    <motion.section
      className="flex h-full flex-col px-4 py-6 sm:px-6 sm:py-8 lg:px-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
    >
      {/* Header */}
      <header className="mb-6 text-center sm:text-left">
        <div className="mb-2 flex flex-wrap items-center justify-center sm:justify-start gap-x-2 gap-y-1">
          <span
            className="text-sm opacity-60"
            style={{ color: theme.accent }}
            aria-hidden
          >
            ✦
          </span>
          <h2
            className="font-heading text-2xl sm:text-3xl font-semibold tracking-wide"
            style={{ color: theme.accent }}
          >
            {theme.name}&apos;s Amal
          </h2>
          <motion.span
            key={activeMonthXp.totalXp}
            initial={{ opacity: 0.7, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-full px-3 py-0.5 text-xs font-medium text-white soft-shadow"
            style={{ backgroundColor: theme.accent }}
            title="Total XP earned for selected month (1 XP per check, +10 per week streak)"
          >
            {formatTotalXp(activeMonthXp)}
          </motion.span>
          <span
            className="inline-flex items-center gap-1 rounded-full bg-white/70 border border-cream-dark px-2.5 py-0.5 text-[10px] font-medium text-charcoal-muted shadow-2xs"
            title="Progress is automatically saved to browser local storage & backup"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Auto-saved
          </span>
        </div>

        <p className="text-xs sm:text-sm text-charcoal-muted">
          {formatGregorianDate()}
        </p>
        <p className="text-xs text-charcoal-muted/70 mt-0.5">
          {formatHijriDate()} AH
        </p>

        {!storageAvailable && (
          <p className="mt-2 rounded-lg bg-missed-soft/40 px-3 py-2 text-xs text-charcoal-muted">
            Progress may not save in private browsing — use a normal browser window.
          </p>
        )}

        {/* Daily progress */}
        <div className="mt-4">
          <div className="mb-1.5 flex items-center justify-between text-xs text-charcoal-muted">
            <span>Today</span>
            <span>
              {todayStats.done}/{todayStats.total} completed
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-cream-dark">
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: theme.accent }}
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          </div>
          <p className="mt-2 text-xs italic text-charcoal-muted/80">{message}</p>
        </div>

        {/* Month Selector / History Controls */}
        <div className="mt-4 border-t border-cream-dark/60 pt-3">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <span className="text-[11px] font-semibold text-charcoal-muted uppercase tracking-wider">
              📅 History & Months
            </span>

            {/* Quick dropdown to initialize any past month */}
            <select
              onChange={(e) => {
                if (e.target.value) {
                  addPastMonth(e.target.value);
                  setSelectedMonthKey(e.target.value);
                  e.target.value = '';
                }
              }}
              className="rounded-xl border border-cream-dark bg-white/80 px-2.5 py-1 text-xs text-charcoal shadow-2xs outline-none hover:border-sage/50 cursor-pointer"
              defaultValue=""
            >
              <option value="" disabled>
                + Track Past Month...
              </option>
              {pastMonthOptions.map((opt) => (
                <option key={opt.key} value={opt.key}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {allMonthKeys.map((key) => {
              const { year: y, month: m } = parseMonthKey(key);
              const label = formatMonthLabel(y, m);
              const isCurrent = key === currentMonthKey;
              const isSelected = selectedMonthKey === key;

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedMonthKey(key)}
                  className={`rounded-xl px-3 py-1 text-xs font-medium transition-all ${
                    isSelected
                      ? 'text-white shadow-xs font-semibold'
                      : 'bg-white/60 text-charcoal-muted border border-cream-dark hover:bg-white hover:text-charcoal'
                  }`}
                  style={isSelected ? { backgroundColor: theme.accent } : undefined}
                >
                  {label} {isCurrent ? '(Current)' : ''}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Task list */}
      <div className="flex-1 space-y-4 overflow-y-auto pb-4">
        {person.tasks.length === 0 && (
          <p className="text-center text-sm text-charcoal-muted py-8">
            No tasks yet — add your first amal below.
          </p>
        )}

        {person.tasks.map((task, i) => (
          <TaskRow
            key={task.id}
            task={task}
            theme={theme}
            selectedMonthKey={selectedMonthKey}
            onToggleDay={toggleDay}
            onUpdateLabel={updateTaskLabel}
            onRemove={removeTask}
            index={i}
          />
        ))}

        {/* Add task */}
        <div className="pt-2">
          {showAdd ? (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="space-y-2"
            >
              <input
                type="text"
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAdd();
                  if (e.key === 'Escape') {
                    setNewTask('');
                    setShowAdd(false);
                  }
                }}
                placeholder="New amal..."
                className="w-full rounded-xl border border-cream-dark bg-white/60 px-4 py-2 text-sm outline-none focus:border-sage/40"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleAdd}
                  disabled={!newTask.trim()}
                  className="rounded-xl px-4 py-2 text-sm text-white transition-opacity hover:opacity-90 disabled:opacity-40"
                  style={{ backgroundColor: theme.accent }}
                >
                  Add task
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setNewTask('');
                    setShowAdd(false);
                  }}
                  className="rounded-xl px-4 py-2 text-sm text-charcoal-muted hover:text-charcoal"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          ) : (
            <button
              type="button"
              onClick={() => setShowAdd(true)}
              className="text-sm transition-opacity hover:opacity-70"
              style={{ color: theme.accent }}
            >
              + Add task
            </button>
          )}
        </div>
      </div>

      {/* Reflection break */}
      <div className="mt-4 border-t border-cream-dark pt-6">
        <CalligraphyBanner rotateInterval={10000} />
      </div>

      {/* Undo toast after delete */}
      {pendingUndo && (
        <UndoToast
          taskLabel={pendingUndo.task.label}
          onUndo={undoDelete}
          onDismiss={dismissUndo}
          accentColor={theme.accent}
        />
      )}
    </motion.section>
  );
}
