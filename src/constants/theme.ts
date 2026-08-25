import type { PersonTheme } from '../types';

export const COLORS = {
  cream: '#FAF6EF',
  sage: '#7C8F6E',
  gold: '#C9A15A',
  charcoal: '#2E2A24',
  zoya: '#C98B93',
  abuzar: '#4F6D5C',
  done: '#8BA888',
  missed: '#C4A090',
} as const;

export const ZOYA_THEME: PersonTheme = {
  id: 'zoya',
  name: 'Zoya',
  accent: COLORS.zoya,
  accentLight: '#D9A9A0',
  accentSoft: '#F5E8EA',
  accentClass: 'zoya',
};

export const ABUZAR_THEME: PersonTheme = {
  id: 'abuzar',
  name: 'Abuzar',
  accent: COLORS.abuzar,
  accentLight: '#4A6670',
  accentSoft: '#E8EEEB',
  accentClass: 'abuzar',
};
