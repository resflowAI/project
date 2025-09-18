'use client';

import useSWR, { type Key } from 'swr';
import { Dayjs } from 'dayjs';
import type { AxiosRequestConfig } from 'axios';

import { axiosFetcher } from '@/shared/api/swr';
import { useFiltersStore } from '@/shared/filterStore/model/store';
import type { LineTimeseriesResponse } from '@/shared/interface/line';
import { buildMetricQuery, MetricQuery } from '@/shared/api/metricQuery';
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

const _toDateStr = (d: Dayjs) => d.format('YYYY-MM-DD');

// use shared MetricQuery and ExtraFilters

type QueryParams = Record<string, unknown> & { tags?: string[] };

/** Слияние c контролем стратегии по tags */
function mergeParams(
  baseParams: QueryParams | undefined,
  extraParams: MetricQuery,
  tagsStrategy: 'union' | 'override' | 'base' = 'union',
): QueryParams {
  const baseTags = baseParams?.tags;
  const extraTags = extraParams.tags;

  let tags: string[] | undefined;
  switch (tagsStrategy) {
    case 'override':
      // локальные (base) имеют приоритет, без объединения
      tags = baseTags ?? extraTags;
      break;
    case 'base':
      // берём только локальные (если есть)
      tags = baseTags;
      break;
    case 'union':
    default:
      tags =
        baseTags && extraTags
          ? Array.from(new Set([...baseTags, ...extraTags]))
          : (extraTags ?? baseTags);
  }

  const merged: QueryParams = { ...(baseParams ?? {}), ...extraParams };
  if (tags) merged.tags = tags;

  return merged;
}

/** Нормализуем ключ к формату [url, { params }] c auto-query */
function normalizeKey(
  raw: SwrKey,
  params: MetricQuery,
  tagsStrategy: 'union' | 'override' | 'base' = 'union',
): SwrKey {
  if (!raw) return null;

  if (typeof raw === 'string') {
    const cfg: AxiosRequestConfig = { params: { ...params } as QueryParams };
    return [raw, cfg] as const;
  }

  const [url, cfg] = raw;
  const prevParams = (cfg?.params as QueryParams | undefined) ?? undefined;
  const mergedParams = mergeParams(prevParams, params, tagsStrategy);
  const nextCfg: AxiosRequestConfig = { ...(cfg ?? {}), params: mergedParams };
  return [url, nextCfg] as const;
}

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
