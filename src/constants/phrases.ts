import type { ArabicPhrase } from '../types';

/** Rotating calligraphy phrases — one shown at a time */
export const ARABIC_PHRASES: ArabicPhrase[] = [
  {
    arabic: 'بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ',
    translation: 'In the name of Allah, the Most Gracious, the Most Merciful',
  },
  {
    arabic: 'إِنَّ مَعَ الْعُسْرِ يُسْرًا',
    translation: 'Indeed, with hardship comes ease',
  },
  {
    arabic: 'وَقُل رَّبِّ زِدْنِي عِلْمًا',
    translation: 'My Lord, increase me in knowledge',
  },
  {
    arabic: 'خَيْرُ النَّاسِ أَنفَعُهُمْ لِلنَّاسِ',
    translation: 'The best of people are those most beneficial to others',
  },
  {
    arabic: 'رَبَّنَا تَقَبَّلْ مِنَّا',
    translation: 'Our Lord, accept this from us',
  },
  {
    arabic: 'وَمَا تَوْفِيقِي إِلَّا بِاللَّهِ',
    translation: 'My success is only by Allah',
  },
];

/** Gentle encouragement based on today's completion ratio */
export const ENCOURAGEMENT = {
  none: 'Every small deed counts — begin when you are ready.',
  started: 'MashaAllah, a beautiful start today.',
  halfway: 'Steady steps — consistency is loved by Allah.',
  most: 'Alhamdulillah, what a blessed day of amal.',
  all: 'SubhanAllah — may Allah accept every deed.',
} as const;
