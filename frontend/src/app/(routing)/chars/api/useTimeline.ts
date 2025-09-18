'use client';

import useSWR, { type Key } from 'swr';
import { Dayjs } from 'dayjs';
import type { AxiosRequestConfig } from 'axios';

import { axiosFetcher } from '@/shared/api/swr';
import { useFiltersStore } from '@/shared/filterStore/model/store';
import type { LineTimeseriesResponse } from '@/shared/interface/line';
import { buildMetricQuery, MetricQuery, normalizeKey } from '@/shared/api/metricQuery';
import type { ExtraFilters } from '@/shared/interface/filter';

/** ===== Конфиг универсального хука ===== */
// ...импорты как были

type SwrTuple = readonly [url: string, config?: AxiosRequestConfig];
type SwrKey = string | SwrTuple | null;

export type TimelineBuilderConfig<TApi> = {
  key: SwrKey | ((period: { from: Dayjs; to: Dayjs } | null) => SwrKey);
  map: (api: TApi) => LineTimeseriesResponse;
  swr?: {
    refreshInterval?: number;
    revalidateOnFocus?: boolean;
    dedupingInterval?: number;
  };
  /** как объединять локальные params c глобальными из стора */
  queryMerge?: {
    /** стратегия для tags: union (по умолчанию), override (брать только локальные), base (игнорить глобальные) */
    tags?: 'union' | 'override' | 'base';
  };
};

// use shared MetricQuery and ExtraFilters

// use shared normalizeKey/mergeParams via import

export function useTimeline<TApi>(cfg: TimelineBuilderConfig<TApi>) {
  const { value } = useFiltersStore();

  const period =
    value.range && value.range[0] && value.range[1]
      ? { from: value.range[0], to: value.range[1] }
      : null;

  const rawKey: SwrKey = typeof cfg.key === 'function' ? cfg.key(period) : cfg.key;

  const metricQuery: MetricQuery = buildMetricQuery(period, (value.extra ?? {}) as ExtraFilters);

  const keyForSWR: Key = normalizeKey(
    rawKey,
    metricQuery,
    cfg.queryMerge?.tags ?? 'union',
  ) as unknown as Key;

  const {
    data: api,
    error,
    isLoading,
    isValidating,
    mutate,
  } = useSWR<TApi>(keyForSWR, axiosFetcher, cfg.swr);

  const data: LineTimeseriesResponse | undefined = api ? cfg.map(api) : undefined;

  return { data, error, isLoading, isValidating, mutate };
}
