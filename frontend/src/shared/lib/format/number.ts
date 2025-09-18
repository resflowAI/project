// src/shared/lib/format/number.ts
import type { Delta } from '@/shared/interface/globalTypes';

export const formatInt = (n: number) =>
  new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(n);

/** Унифицированный форматтер дельты под новый тип Delta */
export function formatDeltaRaw(delta?: Delta): { text: string; sign: 'up' | 'down' | 'flat' } {
  if (!delta) return { text: '—', sign: 'flat' };

  const sign = delta.direction ?? (delta.rel > 0 ? 'up' : delta.rel < 0 ? 'down' : 'flat');
  const value = typeof delta.rel === 'number' ? delta.rel : 0;
  const text = `${value > 0 ? '+' : value < 0 ? '' : ''}${(value * 100).toFixed(2)}%`;
  return { text, sign };
}

/**
 * Универсально конвертирует строку в число, если это возможно.
 * Если строка не число — возвращает её как есть.
 */
export const toNumberSafe = (s: string): number | string => {
  const normalized = s.replace(/\s+/g, '').replace(',', '.');
  const n = Number(normalized);
  return Number.isFinite(n) ? n : s;
};

/**
 * Форматирует число с фиксированным количеством знаков после запятой.
 * Если аргумент не число — возвращает строку как есть.
 */
export const formatFixed = (val: number | string, fractionDigits = 2): string => {
  if (typeof val === 'number') {
    return val.toLocaleString('ru-RU', {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    });
  }
  return val;
};
