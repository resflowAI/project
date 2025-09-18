"use client";

import useSWR from 'swr';
import type { AxiosRequestConfig } from 'axios';

import { axiosFetcher, HttpError } from '@/shared/api/swr';
import { BackendErrorResponse, BackendValidationIssue, CommentTableQuery, CommentTableResponse } from '@/shared/interface/reviews';
import { useFiltersStore } from '@/shared/filterStore/model/store';
import { buildMetricQuery, normalizeKey } from '@/shared/api/metricQuery';
import type { ExtraFilters } from '@/shared/interface/filter';
import type { Dayjs } from 'dayjs';
import type { SwrKey } from '@/shared/api/swr';

/* ===== Type guards без any ===== */

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isBackendValidationIssue(v: unknown): v is BackendValidationIssue {
  return (
    isObject(v) && Array.isArray(v.loc) && typeof v.msg === 'string' && typeof v.type === 'string'
  );
}

function isBackendErrorResponse(v: unknown): v is BackendErrorResponse {
  return isObject(v) && Array.isArray(v.detail) && v.detail.every(isBackendValidationIssue);
}

/**
 * Хук загрузки таблицы отзывов
 */
export function useCommentsTable(query: CommentTableQuery) {
  // берём глобальные фильтры
  const { value: filterValue } = useFiltersStore();

  const period: { from: Dayjs; to: Dayjs } | null =
    filterValue.range && filterValue.range[0] && filterValue.range[1]
      ? { from: filterValue.range[0], to: filterValue.range[1] }
      : null;

  const metricQuery = buildMetricQuery(period, (filterValue.extra ?? {}) as ExtraFilters);

  const baseKey = ['/table/comment_table_rows', { params: query } as AxiosRequestConfig] as const;
  const key = normalizeKey(baseKey, metricQuery) as SwrKey;

  // вторым generic указываем тип ошибки — наш HttpError из fetcher'а
  const swr = useSWR<CommentTableResponse, HttpError>(key, axiosFetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 5_000,
  });

  // аккуратно извлекаем { detail: [...] } если сервер вернул такую структуру
  const validation: BackendErrorResponse | null =
    swr.error && isBackendErrorResponse(swr.error.data) ? swr.error.data : null;

  return {
    ...swr,
    validation,
  };
}
