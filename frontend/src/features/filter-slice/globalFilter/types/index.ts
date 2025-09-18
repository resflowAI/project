// features/global-filter/types.ts
import type { Dayjs } from 'dayjs';

/** Значение RangePicker, не подтягивая типы из rc-picker */
export type RangeValue = [Dayjs | null, Dayjs | null] | null;

/** Пропсы глобального фильтра */
export interface Props {
  /** Синхронизировать ли состояние с URL-параметрами */
  syncUrl?: boolean;
  /** Кастомный className для обёртки */
  className?: string;
}

export interface IAvailableFilterValues {
  banks: Array<{ label: string; options: Array<{ label: string; value: string }> }>;
  services: Array<{ label: string; options: Array<{ label: string; value: string }> }>;
  ratings: { min: number; max: number };
  dates: {
    min: string; // ISO
    max: string; // ISO
    default_min?: string; // 'DD-MM-YYYY'
    default_max?: string; // 'DD-MM-YYYY'
  };
}
