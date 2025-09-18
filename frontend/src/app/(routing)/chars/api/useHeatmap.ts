'use client';

import useSWR, { type Key } from 'swr';
import { Dayjs } from 'dayjs';
import type { AxiosRequestConfig } from 'axios';
import { useFiltersStore } from '@/shared/filterStore/model/store';
import { HeatmapData } from '@/shared/interface/hitmap';
import { axiosFetcher } from '@/shared/api/swr';
import { buildMetricQuery, normalizeKey } from '@/shared/api/metricQuery';
import type { ExtraFilters } from '@/shared/interface/filter';

// Типы компонента

type SwrTuple = readonly [url: string, config?: AxiosRequestConfig];
type SwrKey = string | SwrTuple | null;

export type HeatmapBuilderConfig<TApi> = {
  key: SwrKey | ((period: { from: Dayjs; to: Dayjs } | null) => SwrKey);
  map: (api: TApi) => HeatmapData;
  swr?: { refreshInterval?: number; revalidateOnFocus?: boolean; dedupingInterval?: number };
};

const _toDateString = (d: Dayjs) => d.format('YYYY-MM-DD');

/** Универсальный хук под теплограммы. Возвращает только { data, isLoading }. */
export function useHeatmapBlock<TApi>(cfg: HeatmapBuilderConfig<TApi>) {
  const { value: filterValue } = useFiltersStore();

  const period =
    filterValue.range && filterValue.range[0] && filterValue.range[1]
      ? { from: filterValue.range[0], to: filterValue.range[1] }
      : null;

  const metricQuery = buildMetricQuery(period, (filterValue.extra ?? {}) as ExtraFilters);
  const keyForSWR: Key = normalizeKey(
    typeof cfg.key === 'function' ? cfg.key(period) : cfg.key,
    metricQuery,
  ) as Key;

  const { data: api, isLoading } = useSWR<TApi>(keyForSWR, axiosFetcher, cfg.swr);

  return {
    data: api ? cfg.map(api) : (undefined as HeatmapData | undefined),
    isLoading,
  };
}
