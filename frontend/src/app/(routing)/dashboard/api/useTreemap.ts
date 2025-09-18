// features/treemap/api/useTreemap.ts
'use client';

import useSWR, { type Key } from 'swr';
import { Dayjs } from 'dayjs';
import type { AxiosRequestConfig } from 'axios';

import { axiosFetcher } from '@/shared/api/swr';
import { useFiltersStore } from '@/shared/filterStore/model/store';
import { TreemapResponse } from '@/shared/interface/treemap';
import { buildMetricQuery, normalizeKey } from '@/shared/api/metricQuery';
import type { ExtraFilters } from '@/shared/interface/filter';

type SwrTuple = readonly [url: string, config?: AxiosRequestConfig];
type SwrKey = string | SwrTuple | null;

export type TreemapBuilderConfig<TApi> = {
  /** ключ SWR (строка | [url, config] | функция от периода) */
  key: SwrKey | ((period: { from: Dayjs; to: Dayjs } | null) => SwrKey);
  /** маппер сырых API-данных в формат TreemapResponse */
  map: (api: TApi) => TreemapResponse;
  /** настройки SWR */
  swr?: {
    refreshInterval?: number;
    revalidateOnFocus?: boolean;
    dedupingInterval?: number;
  };
};

/** ===== сборка query из стора ===== */
const _toDateStr = (d: Dayjs) => d.format('YYYY-MM-DD');

/** ===== Универсальный хук тримэпов ===== */
export function useTreemap<TApi>(cfg: TreemapBuilderConfig<TApi>) {
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

  const data: TreemapResponse | undefined = api ? cfg.map(api) : undefined;

  return { data, error, isLoading, isValidating, mutate };
}
