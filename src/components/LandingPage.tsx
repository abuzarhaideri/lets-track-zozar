import { motion } from 'framer-motion';
import { CalligraphyBanner } from './CalligraphyBanner';
import { formatGregorianDate, formatHijriDate } from '../utils/dates';

interface LandingPageProps {
  onEnter: (tab?: 'zoya' | 'abuzar') => void;
}

/**
 * Full-screen landing with Bismillah centerpiece and entry cards.
 */
export function LandingPage({ onEnter }: LandingPageProps) {
  return (
    <motion.div
      className="flex min-h-dvh flex-col items-center justify-center px-6 py-12 paper-texture"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8 }}
    >
      <motion.div
        className="w-full max-w-lg text-center"
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.9, delay: 0.2 }}
      >
        {/* Title */}
        <h1 className="font-heading text-4xl sm:text-5xl md:text-6xl font-semibold tracking-wide text-charcoal">
          LET&apos;S TRACK ZOZAR
        </h1>
        <p className="mt-3 font-heading text-lg sm:text-xl italic text-charcoal-muted">
          Little steps toward Jannah, together
        </p>

        {/* Date */}
        <div className="mt-6 text-sm text-charcoal-muted">
          <p>{formatGregorianDate()}</p>
          <p className="mt-1 opacity-75">{formatHijriDate()} AH</p>
        </div>

        {/* Arabic centerpiece */}
        <motion.div
          className="my-10 sm:my-14"
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.4, delay: 0.5 }}
        >
          <CalligraphyBanner variant="hero" rotateInterval={12000} />
        </motion.div>

        {/* Entry cards */}
        <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center">
          <EntryCard
            name="Zoya"
            subtitle="Her amal list"
            accent="#C98B93"
            accentSoft="#F5E8EA"
            onClick={() => onEnter('zoya')}
            delay={0.7}
          />
          <EntryCard
            name="Abuzar"
            subtitle="His amal list"
            accent="#4F6D5C"
            accentSoft="#E8EEEB"
            onClick={() => onEnter('abuzar')}
            delay={0.85}
          />
        </div>

        {/* View both link */}
        <motion.button
          type="button"
          onClick={() => onEnter()}
          className="mt-8 text-sm text-charcoal-muted underline-offset-4 hover:underline transition-all"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1 }}
        >
          View both together →
        </motion.button>
      </motion.div>
    </motion.div>
  );
}

function EntryCard({
  name,
  subtitle,
  accent,
  accentSoft,
  onClick,
  delay,
}: {
  name: string;
  subtitle: string;
  accent: string;
  accentSoft: string;
  onClick: () => void;
  delay: number;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      className="group flex-1 max-w-xs rounded-[1.25rem] p-6 sm:p-8 text-left soft-shadow transition-transform duration-300 hover:scale-[1.02]"
      style={{ backgroundColor: accentSoft }}
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, delay }}
      whileTap={{ scale: 0.98 }}
    >
      <span
        className="font-heading text-2xl font-semibold"
        style={{ color: accent }}
      >
        {name}&apos;s List
      </span>
      <p className="mt-1 text-sm text-charcoal-muted">{subtitle}</p>
      <span
        className="mt-4 inline-block text-sm font-medium opacity-0 transition-opacity group-hover:opacity-100"
        style={{ color: accent }}
      >
        Open →
      </span>
    </motion.button>
  );
}
