// src/entities/kpi/model/types.ts
// Используем типы бэка, здесь просто реэкспорт/проксирование,
// чтобы ui не зависел от внешних путей.

import { Delta, ID, ISODateString, TimeRange } from './globalTypes';

// Заглушки базовых алиасов — если они уже определены глобально, удали это.

export interface KpiSparkPoint {
  t: ISODateString;
  v: number;
}
export interface KpiCardPayload {
  id: ID;
  title: string;
  value: string;
  unit?: string;
  compare?: Delta;
  period: TimeRange;
  sparkline?: { data: KpiSparkPoint[] };
}
export interface KpiDeckResponse {
  updatedAt: ISODateString;
  items: KpiCardPayload[];
}
