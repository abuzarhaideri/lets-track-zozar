import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import type { MonthRecord } from '../types';
import {
  countDoneInMonth,
  daysInMonth,
  formatMonthLabel,
  monthKey,
} from '../utils/dates';
import { getMonthSummary } from '../utils/storage';
import { DateCell } from './DateCell';

interface MonthCalendarStripProps {
  monthRecord: MonthRecord;
  taskId: string;
  accentColor: string;
  /** Current calendar month — expanded by default */
  isCurrentMonth: boolean;
  onToggleDay: (taskId: string, monthKeyStr: string, day: number) => void;
}

/**
 * Horizontal row of date cells for one task for one month.
 * Past months collapse into a soft accordion header.
 */
export function MonthCalendarStrip({
  monthRecord,
  taskId,
  accentColor,
  isCurrentMonth,
  onToggleDay,
}: MonthCalendarStripProps) {
  const [userExpanded, setUserExpanded] = useState<boolean | null>(null);
  const expanded = userExpanded ?? isCurrentMonth;

  const { year, month, days } = monthRecord;
  const key = monthKey(year, month);
  const totalDays = daysInMonth(year, month);
  const doneCount = countDoneInMonth(days, year, month);
  const summary = getMonthSummary(days, year, month);
  const label = formatMonthLabel(year, month);

  const dayNumbers = Array.from({ length: totalDays }, (_, i) => i + 1);

  // Accordion header for past months
  if (!isCurrentMonth) {
    return (
      <div className="mt-2">
        <button
          type="button"
          onClick={() => setUserExpanded((e) => !(e ?? isCurrentMonth))}
          className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm text-charcoal-muted transition-colors hover:bg-cream-dark/50"
          aria-expanded={expanded}
        >
          <span className="font-medium">{label}</span>
          <span className="text-xs opacity-70">
            {summary.done}/{summary.total} ✓
          </span>
          <motion.span
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={{ duration: 0.3 }}
            className="ml-2 text-xs opacity-50"
          >
            ▾
          </motion.span>
        </button>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className="overflow-hidden"
            >
              <CalendarGrid
                dayNumbers={dayNumbers}
                days={days}
                year={year}
                month={month}
                taskId={taskId}
                monthKeyStr={key}
                accentColor={accentColor}
                onToggleDay={onToggleDay}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="mt-2">
      <div className="mb-1.5 flex items-center justify-between px-0.5">
        <span className="text-xs font-medium text-charcoal-muted">{label}</span>
        <span className="text-xs text-charcoal-muted/70">
          {doneCount}/{totalDays} ✓
        </span>
      </div>
      <CalendarGrid
        dayNumbers={dayNumbers}
        days={days}
        year={year}
        month={month}
        taskId={taskId}
        monthKeyStr={key}
        accentColor={accentColor}
        onToggleDay={onToggleDay}
      />
    </div>
  );
}

/** Shared grid of date cells */
function CalendarGrid({
  dayNumbers,
  days,
  year,
  month,
  taskId,
  monthKeyStr,
  accentColor,
  onToggleDay,
}: {
  dayNumbers: number[];
  days: MonthRecord['days'];
  year: number;
  month: number;
  taskId: string;
  monthKeyStr: string;
  accentColor: string;
  onToggleDay: (taskId: string, monthKeyStr: string, day: number) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1 sm:gap-1.5 py-1">
      {dayNumbers.map((day) => (
        <DateCell
          key={day}
          day={day}
          status={days[day] ?? null}
          year={year}
          month={month}
          accentColor={accentColor}
          onToggle={() => onToggleDay(taskId, monthKeyStr, day)}
        />
      ))}
    </div>
  );
}
