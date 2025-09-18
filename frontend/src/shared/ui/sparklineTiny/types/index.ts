import type { TooltipProps } from 'recharts';

export type Point = { t: string; v: number };

export type SparklineTinyProps = {
  data?: Point[];
  height?: number; // высота графика внутри карточки
  color?: string; // базовый цвет линии
};

export type FixedTooltipProps = TooltipProps<number, string> & {
    label?: string | number;
    payload?: Array<{ value: number; color?: string }>;
    coordinate?: { x?: number; y?: number };
  };