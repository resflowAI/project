// features/wordcloud/api/useWordCloud.ts
'use client';

import useSWR, { type Key } from 'swr';
import type { AxiosRequestConfig } from 'axios';
import dayjs, { Dayjs } from 'dayjs';

import { axiosFetcher } from '@/shared/api/swr';
import { useFiltersStore } from '@/shared/filterStore/model/store';
import { IUiWordItem, IWordCloudResponse } from '@/shared/interface/worldCloud';
import { buildMetricQuery, normalizeKey } from '@/shared/api/metricQuery';
import type { ExtraFilters } from '@/shared/interface/filter';

/** ===== Общие типы ===== */
type SwrTuple = readonly [url: string, config?: AxiosRequestConfig];
type SwrKey = string | SwrTuple | null;

export type WordCloudData = {
  id?: string;
  items: IUiWordItem[];
};

export type WordCloudBuilderConfig<TApi> = {
  /** ключ SWR (строка | [url, config] | функция от периода) */
  key: SwrKey | ((period: { from: Dayjs; to: Dayjs } | null) => SwrKey);
  /** маппер из API-формата в { items } для UI */
  map: (api: TApi) => WordCloudData;
  /** SWR-переопределения при необходимости */
  swr?: {
    refreshInterval?: number;
    revalidateOnFocus?: boolean;
    dedupingInterval?: number;
  };
};

/** ===== Формирование query из глобальных фильтров ===== */
// use shared builder + normalizeKey

/** ===== Универсальный хук для WordCloud ===== */
export function useWordCloud<TApi = IWordCloudResponse>(cfg: WordCloudBuilderConfig<TApi>) {
  const { value } = useFiltersStore();

  const period =
    value.range && value.range[0] && value.range[1]
      ? { from: value.range[0], to: value.range[1] }
      : null;

  const rawKey: SwrKey = typeof cfg.key === 'function' ? cfg.key(period) : cfg.key;

  const autoQuery = buildMetricQuery(period, (value.extra ?? {}) as ExtraFilters);

  const keyForSWR: Key = normalizeKey(rawKey, autoQuery) as unknown as Key;

  const {
    data: api,
    error,
    isLoading,
    isValidating,
    mutate,
  } = useSWR<TApi>(keyForSWR, axiosFetcher, cfg.swr);

  const data: WordCloudData | undefined = api ? cfg.map(api) : undefined;

  return {
    /** уже промапленные данные для тупого UI-компонента */
    data, // { id?, items: IUiWordItem[] }
    /** технические поля из SWR */
    error,
    isLoading,
    isValidating,
    mutate,
    /** на всякий — отдадим текущий применённый диапазон дат (ISO), если нужен в UI */
    periodISO: period
      ? { from: period.from.toISOString(), to: period.to.toISOString() }
      : {
          from: dayjs().subtract(30, 'day').toISOString(),
          to: dayjs().toISOString(),
        },
  };
}
