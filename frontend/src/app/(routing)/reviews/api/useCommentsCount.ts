// src/features/comments-table/api/useCommentsCount.ts
'use client';

import useSWR from 'swr';
import type { AxiosRequestConfig } from 'axios';
import { axiosFetcher, HttpError } from '@/shared/api/swr';
import type { CommentsCountResponse, CommentTableQuery } from '@/shared/interface/reviews';
import { useFiltersStore } from '@/shared/filterStore/model/store';
import { buildMetricQuery, normalizeKey } from '@/shared/api/metricQuery';
import type { ExtraFilters } from '@/shared/interface/filter';
import type { Dayjs } from 'dayjs';
import type { SwrKey } from '@/shared/api/swr';

const stripPaging = (q: CommentTableQuery): Omit<CommentTableQuery, 'limit' | 'offset'> => {
  const { limit, offset, ...rest } = q;
  return rest;
};

export function useCommentsCount(query: CommentTableQuery) {
  const { value: filterValue } = useFiltersStore();

  const period: { from: Dayjs; to: Dayjs } | null =
    filterValue.range && filterValue.range[0] && filterValue.range[1]
      ? { from: filterValue.range[0], to: filterValue.range[1] }
      : null;

  const metricQuery = buildMetricQuery(period, (filterValue.extra ?? {}) as ExtraFilters);

  const baseKey = [
    '/metrics/count_comments',
    { params: stripPaging(query) } as AxiosRequestConfig,
  ] as const;
  const key = normalizeKey(baseKey, metricQuery) as SwrKey;

  const swr = useSWR<CommentsCountResponse, HttpError>(key, axiosFetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 5_000,
  });

  // Парсим строку в число; если что-то не так — 0
  const total: number =
    swr.data && Number.isFinite(Number(swr.data.value)) ? Number(swr.data.value) : 0;

  return { ...swr, total };
}
