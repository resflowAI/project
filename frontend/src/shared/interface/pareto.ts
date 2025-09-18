import { ID, TimeRange } from './globalTypes';

/** Одна категория для диаграммы Парето */
export interface ParetoRow {
  name: string; // категория/аспект
  negative: number; // столбцы (кол-во/вес негатива)
  cumulative: number; // кумулятив (0..1 или 0..100 — см. cumulativeAsPercent)
}

/** Ответ бэка */
export interface ParetoResponse {
  id: ID;
  title: string;
  period: TimeRange;
  data: ParetoRow[]; // уже отсортировано по negative desc
  cumulativeAsPercent?: boolean; // если true — cumulative в 0..100
  threshold?: number; // порог, по умолчанию 0.8 (или 80)
}

/** Пропсы графика */
export interface ParetoChartProps {
  response: ParetoResponse;
  height?: number; // default 360
  className?: string;
}

