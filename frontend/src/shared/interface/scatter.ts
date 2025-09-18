// Строгие типы для scatter-графика (Recharts ScatterChart)

import type { ID } from '@/shared/interface/globalTypes';

/** Любая точка: ключи будут сопоставляться через xKey/yKey/sizeKey */
export type ScatterDatum = Record<string, number | string>;

/** Описание одной серии точек */
export interface ScatterSeries {
  id: ID;
  /** Отображаемое имя в легенде */
  name: string;
  /** Данные серии */
  data: ScatterDatum[];
  /** Ключи осей в объекте точки */
  xKey: string;
  yKey: string;
  /** Необязательный ключ радиуса/веса точки */
  sizeKey?: string;
  /** Цвет серии (если не указан — будет авто-палитра) */
  colorHex?: `#${string}`;
  /** Форма маркера (recharts) */
  shape?: 'circle' | 'square' | 'triangle' | 'diamond' | 'star' | 'wye' | 'cross';
}

/** Пропсы карточки-диаграммы */
export interface ScatterCardProps {
  title?: string;
  height?: number; // default 360
  withBackground?: boolean; // default true
  withPadding?: boolean; // default true
  showLegend?: boolean; // default true
  showGrid?: boolean; // default true

  /** Оси */
  xLabel?: string;
  yLabel?: string;
  xDomain?: [number, number];
  yDomain?: [number, number];
  /** Горизонтальная референс-линия (например, средний сентимент) */
  refLineY?: number;

  /** Содержимое */
  series: ScatterSeries[];

  /** Форматтеры тултипа/подписей (по желанию) */
  formatX?: (x: number | string) => string;
  formatY?: (y: number | string) => string;

  /** Коллбек клика по точке */
  onPointClick?: (payload: { seriesId: ID; datum: ScatterDatum }) => void;

  /** Русские подписи для полей тултипа (ключ -> подпись) */
  tooltipLabels?: Record<string, string>;
  /** Порядок отображения полей в тултипе */
  tooltipOrder?: string[];
}
