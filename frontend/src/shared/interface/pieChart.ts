import type { ID } from '@/shared/interface/globalTypes';

export interface PieSlice {
  key: string;
  label: string;
  value: number;
  colorHex?: `#${string}`;
}

export interface PieResponse {
  id: ID;
  title: string;
  slices: PieSlice[];
  totalLabel?: string;
  /** Новое: переопределение центра (лейбл + значение строкой) */
  center?: {
    label?: string;
    value?: string;
  };
}

export interface PieCardProps {
  title?: string;
  response: PieResponse;
  height?: number;
  withBackground?: boolean;
  withPadding?: boolean;
  innerRadius?: number | string;
  outerRadius?: number | string;
  showLegend?: boolean;
  showPercent?: boolean;
  showTotalInCenter?: boolean;
  formatValue?: (v: number) => string;
  onSliceClick?: (slice: PieSlice) => void;
}
