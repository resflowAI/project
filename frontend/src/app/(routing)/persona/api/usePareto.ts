// features/pareto/api/usePareto.ts
'use client';

import useSWR, { type Key } from 'swr';
import dayjs, { Dayjs } from 'dayjs';
import type { AxiosRequestConfig } from 'axios';

import { axiosFetcher } from '@/shared/api/swr';
import { ParetoResponse } from '@/shared/interface/pareto';
import { useFiltersStore } from '@/shared/filterStore/model/store';
import { buildMetricQuery, normalizeKey } from '@/shared/api/metricQuery';
import type { ExtraFilters } from '@/shared/interface/filter';

type SwrTuple = readonly [url: string, config?: AxiosRequestConfig];
type SwrKey = string | SwrTuple | null;

export type ParetoBuilderConfig<TApi> = {
  key: SwrKey | ((period: { from: Dayjs; to: Dayjs } | null) => SwrKey);
  map: (api: TApi) => Omit<ParetoResponse, 'period'> & Partial<Pick<ParetoResponse, 'period'>>;
  swr?: {
    refreshInterval?: number;
    revalidateOnFocus?: boolean;
    dedupingInterval?: number;
  };
};

/** ===== auto-query из стора ===== */
const _toDateStr = (d: Dayjs) => d.format('YYYY-MM-DD');

/** ===== Универсальный хук Pareto ===== */
export function usePareto<TApi>(cfg: ParetoBuilderConfig<TApi>) {
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

  const data: ParetoResponse | undefined = mapped
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
