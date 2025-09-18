import { Dayjs } from 'dayjs';

export type PeriodKey = 'all' | 'week' | 'month' | 'quarter' | 'today' | 'yesterday' | 'custom'; // 👈
export type Gender = 'any' | 'male' | 'female';

export interface ExtraFilters {
  // Only keep filters supported by OpenAPI
  rating?: number; // minimal rating
  tags?: string[];
  text?: string;
  services?: string[]; // array of services
  // placeholders for future scalable params
  comment_ids?: string[];
  concurrent?: string;
}

export type FiltersState = {
  period: PeriodKey;
  range?: [Dayjs, Dayjs] | null;
  extra: ExtraFilters;
};

export type RequestParams = {
  period: PeriodKey;
  from?: string;
  to?: string;
  extra?: ExtraFilters;
};
