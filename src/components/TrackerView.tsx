import { motion } from 'framer-motion';
import { useState } from 'react';
import { ABUZAR_THEME, ZOYA_THEME } from '../constants/theme';
import { BackupModal } from './BackupModal';
import { ChecklistColumn } from './ChecklistColumn';

interface TrackerViewProps {
  onBack: () => void;
  /** Optional initial mobile tab */
  initialTab?: 'zoya' | 'abuzar';
}

/**
 * Split tracker — Zoya left, Abuzar right on desktop;
 * tab toggle on mobile.
 */
export function TrackerView({ onBack, initialTab = 'zoya' }: TrackerViewProps) {
  const [mobileTab, setMobileTab] = useState<'zoya' | 'abuzar'>(initialTab);
  const [isBackupOpen, setIsBackupOpen] = useState(false);

  return (
    <motion.div
      className="min-h-dvh flex flex-col"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Top bar */}
      <header className="sticky top-0 z-10 border-b border-cream-dark/80 bg-cream/90 backdrop-blur-sm px-4 py-3">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            className="text-sm text-charcoal-muted transition-colors hover:text-charcoal"
          >
            ← Home
          </button>
          <h1 className="font-heading text-lg sm:text-xl font-semibold text-charcoal">
            LET&apos;S TRACK ZOZAR
          </h1>
          <button
            type="button"
            onClick={() => setIsBackupOpen(true)}
            className="rounded-xl border border-cream-dark bg-white/80 px-3 py-1.5 text-xs font-semibold text-charcoal shadow-sm transition-colors hover:border-sage/50"
            title="Backup or restore progress data"
          >
            💾 Backup
          </button>
        </div>

        {/* Mobile tab switcher */}
        <div className="mx-auto mt-3 flex max-w-xs gap-1 rounded-2xl bg-cream-dark/60 p-1 lg:hidden">
          {([ZOYA_THEME, ABUZAR_THEME] as const).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setMobileTab(t.id)}
              className={`flex-1 rounded-xl py-2 text-sm font-medium transition-all duration-300 ${
                mobileTab === t.id
                  ? 'text-white soft-shadow'
                  : 'text-charcoal-muted hover:text-charcoal'
              }`}
              style={
                mobileTab === t.id ? { backgroundColor: t.accent } : undefined
              }
            >
              {t.name}
            </button>
          ))}
        </div>
      </header>

      {/* Split columns — both always mounted; CSS toggles visibility on mobile */}
      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col lg:flex-row">
        <div
          className={`lg:w-1/2 border-b lg:border-b-0 lg:border-r border-cream-dark/60 ${
            mobileTab !== 'zoya' ? 'hidden lg:block' : ''
          }`}
          style={{ backgroundColor: `${ZOYA_THEME.accentSoft}40` }}
        >
          <ChecklistColumn theme={ZOYA_THEME} />
        </div>

        <div
          className={`lg:w-1/2 ${
            mobileTab !== 'abuzar' ? 'hidden lg:block' : ''
          }`}
          style={{ backgroundColor: `${ABUZAR_THEME.accentSoft}40` }}
        >
          <ChecklistColumn theme={ABUZAR_THEME} />
        </div>
      </div>

      <BackupModal isOpen={isBackupOpen} onClose={() => setIsBackupOpen(false)} />
    </motion.div>
  );
}
