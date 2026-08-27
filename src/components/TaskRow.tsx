import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import type { PersonTheme, Task } from '../types';
import { monthKey, parseMonthKey, todayParts } from '../utils/dates';
import { getSortedMonthKeys } from '../utils/storage';
import { formatTaskXp, getTaskMonthXp } from '../utils/xp';
import { MonthCalendarStrip } from './MonthCalendarStrip';

interface TaskRowProps {
  task: Task;
  theme: PersonTheme;
  selectedMonthKey?: string;
  onToggleDay: (taskId: string, monthKeyStr: string, day: number) => void;
  onUpdateLabel: (taskId: string, label: string) => void;
  onRemove: (taskId: string) => void;
  index: number;
}

/**
 * One amal row: label, XP badge, edit/delete actions, monthly calendar strips.
 */
export function TaskRow({
  task,
  theme,
  selectedMonthKey,
  onToggleDay,
  onUpdateLabel,
  onRemove,
  index,
}: TaskRowProps) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(task.label);
  const { year, month, day } = todayParts();
  const currentKey = monthKey(year, month);
  const activeKey = selectedMonthKey || currentKey;
  const { year: activeYear, month: activeMonth } = parseMonthKey(activeKey);

  const sortedKeys = getSortedMonthKeys(task);
  const taskXp = getTaskMonthXp(task, activeYear, activeMonth);
  const todayStatus = task.months[currentKey]?.days[day] ?? null;

  // Keep edit field in sync if label changes externally (e.g. undo)
  useEffect(() => {
    if (!editing) setEditValue(task.label);
  }, [task.label, editing]);

  const saveLabel = () => {
    const trimmed = editValue.trim();
    if (trimmed) {
      onUpdateLabel(task.id, trimmed);
      setEditing(false);
    }
  };

  const cancelEdit = () => {
    setEditValue(task.label);
    setEditing(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.05 }}
      className="rounded-2xl bg-white/40 paper-texture soft-shadow p-4 sm:p-5"
    >
      {/* Task header: label + XP + actions */}
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {editing ? (
            <div className="space-y-2">
              <input
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveLabel();
                  if (e.key === 'Escape') cancelEdit();
                }}
                className="w-full rounded-lg border border-cream-dark bg-cream px-3 py-2 text-sm outline-none focus:border-sage/50"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={saveLabel}
                  className="rounded-lg px-3 py-1 text-xs text-white"
                  style={{ backgroundColor: theme.accent }}
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="rounded-lg px-3 py-1 text-xs text-charcoal-muted hover:text-charcoal"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <p className="text-sm sm:text-base font-medium text-charcoal">
                {task.label}
              </p>
              <motion.p
                key={taskXp.totalXp}
                initial={{ opacity: 0.6, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mt-1 text-xs font-medium"
                style={{ color: theme.accent }}
              >
                {formatTaskXp(taskXp)}
                {taskXp.weekStreaks > 0 && (
                  <span className="ml-1.5 text-gold">
                    · {taskXp.weekStreaks} week streak{taskXp.weekStreaks > 1 ? 's' : ''}
                  </span>
                )}
              </motion.p>
            </>
          )}
        </div>

        {!editing && (
          <div className="flex shrink-0 items-center gap-1.5">
            {/* Quick Check Today Button */}
            <motion.button
              type="button"
              onClick={() => onToggleDay(task.id, currentKey, day)}
              whileTap={{ scale: 0.92 }}
              className={`flex items-center gap-1 rounded-xl px-2.5 py-1 text-xs font-medium transition-all ${
                todayStatus === 'done'
                  ? 'bg-done text-white shadow-sm glow-done'
                  : todayStatus === 'missed'
                  ? 'bg-missed-soft text-missed border border-missed/30'
                  : 'border border-cream-dark bg-white/80 text-charcoal hover:border-sage/60'
              }`}
              title="Click to toggle today's status"
            >
              <span>Today:</span>
              <span className="font-bold">
                {todayStatus === 'done' ? '✓ Done' : todayStatus === 'missed' ? '✕ Missed' : '+ Mark'}
              </span>
            </motion.button>

            <button
              type="button"
              onClick={() => setEditing(true)}
              className="rounded-lg px-1.5 py-1 text-xs text-charcoal-muted transition-colors hover:bg-cream-dark/60 hover:text-charcoal"
              aria-label="Edit task"
              title="Edit task label"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => onRemove(task.id)}
              className="rounded-lg px-1.5 py-1 text-xs text-charcoal-muted/60 transition-colors hover:bg-missed-soft/50 hover:text-missed"
              aria-label="Delete task"
              title="Delete task"
            >
              Delete
            </button>
          </div>
        )}
      </div>

      {/* Accent underline */}
      <div
        className="mb-3 h-0.5 w-12 rounded-full opacity-60"
        style={{ backgroundColor: theme.accent }}
      />

      {/* Month strips — newest first; current month expanded */}
      <div className="space-y-1">
        {sortedKeys.map((key) => {
          const record = task.months[key];
          if (!record) return null;
          return (
            <MonthCalendarStrip
              key={key}
              monthRecord={record}
              taskId={task.id}
              accentColor={theme.accent}
              isCurrentMonth={key === activeKey}
              onToggleDay={onToggleDay}
            />
          );
        })}
      </div>
    </motion.div>
  );
}
