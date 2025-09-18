'use client';

import useSWR from 'swr';
import { axiosFetcher } from '@/shared/api/swr';
import { useFiltersStore } from '@/shared/filterStore/model/store';
import { buildMetricQuery, normalizeKey } from '@/shared/api/metricQuery';
import type { ExtraFilters } from '@/shared/interface/filter';

/** Ответ бэка */
export type DistinctTagsResponse = {
  tags: string[];
};

/** Внутренний query-тип (совместим с вашим API) */

// use shared buildMetricQuery + normalizeKey

/** Хук для списка тегов */
export function useDistinctTags() {
  const { value } = useFiltersStore();

  const period =
    value.range && value.range[0] && value.range[1]
      ? { from: value.range[0], to: value.range[1] }
      : null;

  const autoQuery = buildMetricQuery(period, (value.extra ?? {}) as ExtraFilters);

  const key = normalizeKey(['/filter/distinct_tags'], autoQuery);

  const { data, error, isLoading, mutate } = useSWR<DistinctTagsResponse>(key, axiosFetcher, {
    dedupingInterval: 5 * 60 * 1000,
  });

  return {
    tags: data?.tags ?? [],
    isLoading,
    isError: Boolean(error),
    mutate,
  };
}
