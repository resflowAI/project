// features/histograms/api/useHistogram.ts
'use client';

import useSWR, { type Key } from 'swr';
import dayjs, { Dayjs } from 'dayjs';
import type { AxiosRequestConfig } from 'axios';

import { axiosFetcher } from '@/shared/api/swr';
import { useFiltersStore } from '@/shared/filterStore/model/store';
import { ClusterBarsResponse } from '@/shared/interface/clusterBars';
import { buildMetricQuery, normalizeKey } from '@/shared/api/metricQuery';
import type { ExtraFilters } from '@/shared/interface/filter';

/** ===== Общие типы для гистограмм (совместимы с вашим UI) ===== */
export type ID = string;
export type ISODateString = string;
export type TimeRange = { from: ISODateString; to: ISODateString };

/** ===== Конфиг универсального хука ===== */
type SwrTuple = readonly [url: string, config?: AxiosRequestConfig];
type SwrKey = string | SwrTuple | null;

export type HistogramBuilderConfig<TApi> = {
  key: SwrKey | ((period: { from: Dayjs; to: Dayjs } | null) => SwrKey);
  map: (
    api: TApi,
  ) => Omit<ClusterBarsResponse, 'period'> & Partial<Pick<ClusterBarsResponse, 'period'>>;
  swr?: {
    refreshInterval?: number;
    revalidateOnFocus?: boolean;
    dedupingInterval?: number;
  };
};

/** ===== Формирование query из глобальных фильтров ===== */
const _toDateStr = (d: Dayjs) => d.format('YYYY-MM-DD');

/** ===== Универсальный хук гистограмм ===== */
export function useHistogram<TApi>(cfg: HistogramBuilderConfig<TApi>) {
  const { value } = useFiltersStore();

  const period =
    value.range && value.range[0] && value.range[1]
      ? { from: value.range[0], to: value.range[1] }
      : null;

  const rawKey: SwrKey = typeof cfg.key === 'function' ? cfg.key(period) : cfg.key;

  const metricQuery = buildMetricQuery(period, (value.extra ?? {}) as ExtraFilters);

  const keyForSWR: Key = normalizeKey(rawKey, metricQuery) as unknown as Key;

  const {
    data: api,
    error,
    isLoading,
    isValidating,
    mutate,
  } = useSWR<TApi>(keyForSWR, axiosFetcher, cfg.swr);

  const mapped = api ? cfg.map(api) : undefined;

  const data: ClusterBarsResponse | undefined = mapped
    ? {
        ...mapped,
        period:
          mapped.period ??
          (period
            ? {
                from: period.from.toISOString(),
                to: period.to.toISOString(),
              }
            : { from: dayjs().subtract(30, 'day').toISOString(), to: dayjs().toISOString() }),
      }
    : undefined;

  return { data, error, isLoading, isValidating, mutate };
}
