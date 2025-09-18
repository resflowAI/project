'use client';

import useSWR, { type Key } from 'swr';
import { Dayjs } from 'dayjs';
import type { AxiosRequestConfig } from 'axios';
import { useFiltersStore } from '@/shared/filterStore/model/store';

import { ScatterSeries } from '@/shared/interface/scatter';

/** Любая точка: ключи будут сопоставляться через xKey/yKey/sizeKey */
export type ScatterDatum = Record<string, number | string>;

/** Что возвращает универсальный хук скаттера */
export type ScatterBlockResult = {
  series: ScatterSeries[];
  /** не обязателен, удобно для refLineY */
  avgSentiment?: number;
  xLabel?: string;
  yLabel?: string;
  title?: string;
};

type SwrTuple = readonly [url: string, config?: AxiosRequestConfig];
type SwrKey = string | SwrTuple | null;

export type ScatterBuilderConfig<TApi> = {
  key: SwrKey | ((period: { from: Dayjs; to: Dayjs } | null) => SwrKey);
  map: (api: TApi) => ScatterBlockResult;
  swr?: { refreshInterval?: number; revalidateOnFocus?: boolean; dedupingInterval?: number };
};

/** Query-формат, который ждут ручки метрик */
import { buildMetricQuery, normalizeKey } from '@/shared/api/metricQuery';
import type { ExtraFilters } from '@/shared/interface/filter';
import { axiosFetcher } from '@/shared/api/swr';

/** Универсальный скаттер-хук. Возвращает { data, isLoading }. */
export function useScatterBlock<TApi>(cfg: ScatterBuilderConfig<TApi>) {
  const { value: filterValue } = useFiltersStore();

  const period =
    filterValue.range && filterValue.range[0] && filterValue.range[1]
      ? { from: filterValue.range[0], to: filterValue.range[1] }
      : null;

  const query = buildMetricQuery(period, (filterValue.extra ?? {}) as ExtraFilters);
  const keyForSWR: Key = normalizeKey(
    typeof cfg.key === 'function' ? cfg.key(period) : cfg.key,
    query,
  ) as Key;

  const { data: api, isLoading } = useSWR<TApi>(keyForSWR, axiosFetcher, cfg.swr);

  return {
    data: api ? cfg.map(api) : (undefined as ScatterBlockResult | undefined),
    isLoading,
  };
}
