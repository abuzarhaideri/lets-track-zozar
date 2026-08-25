import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { ARABIC_PHRASES } from '../constants/phrases';

interface CalligraphyBannerProps {
  /** Auto-rotate phrases every N ms (0 = no rotation) */
  rotateInterval?: number;
  className?: string;
  /** Larger variant for landing page centerpiece */
  variant?: 'default' | 'hero';
}

/**
 * Rotating Arabic calligraphy with English translation beneath.
 * Used as a calm visual break between sections.
 */
export function CalligraphyBanner({
  rotateInterval = 8000,
  className = '',
  variant = 'default',
}: CalligraphyBannerProps) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!rotateInterval) return;
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % ARABIC_PHRASES.length);
    }, rotateInterval);
    return () => clearInterval(timer);
  }, [rotateInterval]);

  const phrase = ARABIC_PHRASES[index];
  const isHero = variant === 'hero';

  return (
    <div
      className={`text-center px-4 ${className}`}
      aria-live="polite"
      aria-atomic="true"
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
          className="flex flex-col items-center gap-3"
        >
          <p
            className={`font-arabic text-charcoal leading-relaxed ${
              isHero
                ? 'text-3xl sm:text-4xl md:text-5xl'
                : 'text-xl sm:text-2xl'
            }`}
            dir="rtl"
            lang="ar"
          >
            {phrase.arabic}
          </p>
          <p
            className={`font-heading italic text-charcoal-muted ${
              isHero ? 'text-base sm:text-lg' : 'text-sm'
            }`}
          >
            {phrase.translation}
          </p>
        </motion.div>
      </AnimatePresence>

      {/* Soft decorative divider */}
      <div className="mt-6 flex items-center justify-center gap-3 opacity-40">
        <span className="h-px w-12 bg-gold" />
        <span className="text-gold text-xs">✦</span>
        <span className="h-px w-12 bg-gold" />
      </div>
    </div>
  );
}
