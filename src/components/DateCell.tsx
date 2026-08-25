import { motion } from 'framer-motion';
import type { DayStatus } from '../types';
import { isDayEditable, isToday } from '../utils/dates';

interface DateCellProps {
  day: number;
  status: DayStatus;
  year: number;
  month: number;
  accentColor: string;
  onToggle: () => void;
}

/**
 * Single day cell in the monthly calendar strip.
 * Cycles empty → tick → cross on tap (past/today only).
 */
export function DateCell({
  day,
  status,
  year,
  month,
  accentColor,
  onToggle,
}: DateCellProps) {
  const editable = isDayEditable(year, month, day);
  const today = isToday(year, month, day);

  const baseClasses =
    'relative flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-full text-[10px] sm:text-xs font-medium transition-all duration-300';

  let stateClasses = 'border border-cream-dark bg-cream/80 text-charcoal-muted';
  if (status === 'done') {
    stateClasses = 'bg-done text-white glow-done';
  } else if (status === 'missed') {
    stateClasses = 'bg-missed-soft text-missed border border-missed/30';
  } else if (!editable) {
    stateClasses = 'border border-cream-dark/60 bg-cream-dark/30 text-charcoal-muted/40 cursor-not-allowed';
  } else {
    stateClasses = 'border border-cream-dark bg-white/60 text-charcoal-muted hover:border-sage/40 cursor-pointer';
  }

  const ringStyle = today
    ? { boxShadow: `0 0 0 2px ${accentColor}55` }
    : undefined;

  return (
    <motion.button
      type="button"
      disabled={!editable}
      onClick={editable ? onToggle : undefined}
      className={`${baseClasses} ${stateClasses}`}
      style={ringStyle}
      whileTap={editable ? { scale: 0.88 } : undefined}
      whileHover={editable ? { scale: 1.06 } : undefined}
      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
      aria-label={`Day ${day}${status === 'done' ? ', done' : status === 'missed' ? ', missed' : ''}${today ? ', today' : ''}`}
      title={`${day}${today ? ' (today)' : ''}`}
    >
      {status === 'done' && (
        <motion.span
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-sm leading-none"
        >
          ✓
        </motion.span>
      )}
      {status === 'missed' && (
        <motion.span
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-xs leading-none text-missed"
        >
          ✕
        </motion.span>
      )}
      {status === null && (
        <span className="text-[10px] sm:text-xs opacity-70">{day}</span>
      )}
    </motion.button>
  );
}
