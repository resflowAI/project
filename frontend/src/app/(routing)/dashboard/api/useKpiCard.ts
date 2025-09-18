'use client';

import useSWR, { type Key } from 'swr';
import dayjs, { Dayjs } from 'dayjs';
import type { AxiosRequestConfig } from 'axios';

import { KpiCardPayload, KpiSparkPoint } from '@/shared/interface/kpiCars';
import { useFiltersStore } from '@/shared/filterStore/model/store';
import { axiosFetcher } from '@/shared/api/swr';
import { buildMetricQuery, normalizeKey } from '@/shared/api/metricQuery';
import type { ExtraFilters } from '@/shared/interface/filter';

type SwrTuple = readonly [url: string, config?: AxiosRequestConfig];
type SwrKey = string | SwrTuple | null;

export type KpiMapResult = {
  id: KpiCardPayload['id'];
  value: string;
  compare?: KpiCardPayload['compare'];
  sparkline?: KpiSparkPoint[];
  unit?: KpiCardPayload['unit'];
};

export type KpiBuilderConfig<TApi> = {
  key: SwrKey | ((period: { from: Dayjs; to: Dayjs } | null) => SwrKey);
  title: KpiCardPayload['title'];
  map: (api: TApi) => KpiMapResult;
  swr?: {
    refreshInterval?: number;
    revalidateOnFocus?: boolean;
    dedupingInterval?: number;
  };
};

/** форматируем дату как YYYY-MM-DD */
const _toDateString = (d: Dayjs) => d.format('YYYY-MM-DD');

/** Query-формат, который ждут ручки метрик */
// using shared metric query builders

export function useKpiCard<TApi>(cfg: KpiBuilderConfig<TApi>) {
  const { value: filterValue } = useFiltersStore();

  const periodRange =
    filterValue.range && filterValue.range[0] && filterValue.range[1]
      ? { from: filterValue.range[0], to: filterValue.range[1] }
      : null;

  const rawKey: SwrKey = typeof cfg.key === 'function' ? cfg.key(periodRange) : cfg.key;

  const metricQuery = buildMetricQuery(periodRange, (filterValue.extra ?? {}) as ExtraFilters);

  const keyForSWR: Key = normalizeKey(rawKey, metricQuery) as unknown as Key;

  const {
    data: api,
    error,
    isLoading,
    isValidating,
    mutate,
  } = useSWR<TApi>(keyForSWR, axiosFetcher, cfg.swr);

  const data: KpiCardPayload | undefined = api
    ? (() => {
        const mapped = cfg.map(api);
        const from = periodRange?.from ?? dayjs().subtract(30, 'day');
        const to = periodRange?.to ?? dayjs();

        return {
          id: mapped.id,
          title: cfg.title,
          value: mapped.value,
          unit: mapped.unit,
          compare: mapped.compare,
          // внутри карточки оставляем ISO, только в query уходит YYYY-MM-DD
          period: { from: from.toISOString(), to: to.toISOString() },
          sparkline: mapped.sparkline ? { data: mapped.sparkline } : undefined,
        } satisfies KpiCardPayload;
      })()
    : undefined;

  return { data, error, isLoading, isValidating, mutate };
}
