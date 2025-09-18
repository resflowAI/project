'use client';

import useSWR, { type Key } from 'swr';
import { Dayjs } from 'dayjs';
import type { AxiosRequestConfig } from 'axios';
import type { ExtraFilters } from '@/shared/interface/filter';
import { buildMetricQuery, normalizeKey } from '@/shared/api/metricQuery';
import { axiosFetcher } from '@/shared/api/swr';
import { useFiltersStore } from '@/shared/filterStore/model/store';
import type { PieResponse } from '@/shared/interface/pieChart';

type SwrTuple = readonly [url: string, config?: AxiosRequestConfig];
type SwrKey = string | SwrTuple | null;

export type PieBuilderConfig<TApi> = {
  key: SwrKey | ((period: { from: Dayjs; to: Dayjs } | null) => SwrKey);
  map: (api: TApi) => PieResponse;
  swr?: { refreshInterval?: number; revalidateOnFocus?: boolean; dedupingInterval?: number };
};

// metric query helpers are centralized in shared/api/metricQuery.ts

/** Универсальный pie-хук */
export function usePieBlock<TApi>(cfg: PieBuilderConfig<TApi>) {
  const { value: filterValue } = useFiltersStore();

  const period =
    filterValue.range && filterValue.range[0] && filterValue.range[1]
      ? { from: filterValue.range[0], to: filterValue.range[1] }
      : null;

  const query = buildMetricQuery(period, (filterValue.extra ?? {}) as ExtraFilters);
  const keyForSWR: Key = normalizeKey(typeof cfg.key === 'function' ? cfg.key(period) : cfg.key, query) as Key;

  const {
    data: api,
    isLoading,
    error,
    isValidating,
    mutate,
  } = useSWR<TApi>(keyForSWR, axiosFetcher, cfg.swr);

  return {
    data: api ? cfg.map(api) : (undefined as PieResponse | undefined),
    isLoading,
    error,
    isValidating,
    mutate,
  };
}
