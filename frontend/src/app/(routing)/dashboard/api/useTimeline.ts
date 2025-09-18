'use client';

import useSWR, { type Key } from 'swr';
import { Dayjs } from 'dayjs';
import type { AxiosRequestConfig } from 'axios';

import { axiosFetcher } from '@/shared/api/swr';
import { useFiltersStore } from '@/shared/filterStore/model/store';
import type { LineTimeseriesResponse } from '@/shared/interface/line';
import type { ExtraFilters } from '@/shared/interface/filter';
import { buildMetricQuery, normalizeKey } from '@/shared/api/metricQuery';

/** ===== Конфиг универсального хука ===== */
type SwrTuple = readonly [url: string, config?: AxiosRequestConfig];
type SwrKey = string | SwrTuple | null;

export type TimelineBuilderConfig<TApi> = {
  /** ключ SWR (строка | [url, config] | функция от периода) */
  key: SwrKey | ((period: { from: Dayjs; to: Dayjs } | null) => SwrKey);
  /** маппер из «сырых» API-данных в LineTimeseriesResponse */
  map: (api: TApi) => LineTimeseriesResponse;
  /** настройки SWR */
  swr?: {
    refreshInterval?: number;
    revalidateOnFocus?: boolean;
    dedupingInterval?: number;
  };
};

/** ===== Формирование query из глобальных фильтров ===== */
const _toDateStr = (d: Dayjs) => d.format('YYYY-MM-DD');

// use shared buildMetricQuery / normalizeKey

/** ===== Универсальный хук таймлайна ===== */
export function useTimeline<TApi>(cfg: TimelineBuilderConfig<TApi>) {
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

  const data: LineTimeseriesResponse | undefined = api ? cfg.map(api) : undefined;

  return { data, error, isLoading, isValidating, mutate };
}
