import { AnimatePresence, motion } from 'framer-motion';

interface UndoToastProps {
  taskLabel: string;
  onUndo: () => void;
  onDismiss: () => void;
  accentColor: string;
}

/** Soft toast shown after deleting a task, with undo action */
export function UndoToast({
  taskLabel,
  onUndo,
  onDismiss,
  accentColor,
}: UndoToastProps) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 8 }}
        transition={{ duration: 0.35 }}
        className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-2xl bg-charcoal px-4 py-3 text-cream soft-shadow sm:bottom-8"
        role="status"
      >
        <span className="max-w-[200px] truncate text-sm sm:max-w-xs">
          Removed &ldquo;{taskLabel}&rdquo;
        </span>
        <button
          type="button"
          onClick={onUndo}
          className="shrink-0 rounded-lg px-3 py-1 text-sm font-medium text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: accentColor }}
        >
          Undo
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 text-cream/50 hover:text-cream text-xs"
          aria-label="Dismiss"
        >
          ✕
        </button>
      </motion.div>
    </AnimatePresence>
  );
}
