/* Базовые типы, чтобы не дублировать в каждом файле */
export type ID = string | number;
export type ISODateString = string; // 2025-09-19T00:00:00Z

export type Granularity = 'hour' | 'day' | 'week' | 'month' | 'quarter';

export interface TimeRange {
  from: ISODateString;
  to: ISODateString;
  granularity?: Granularity;
}

export type SentimentClass = 'positive' | 'neutral' | 'negative';

export interface Delta {
  abs: number; // абсолютное изменение к прошлому периоду
  rel: number; // относительное изменение, 0.25 = +25%
  direction: 'up' | 'down' | 'flat';
}

/**
 * ВАЖНО: Под Recharts все серии/категории приходят как массив объектов,
 * где ключи (dataKey) — названия полей в этих объектах. :contentReference[oaicite:0]{index=0}
 */
