'use client';

import { useState } from 'react';
import useSWR from 'swr';
import type { Dayjs } from 'dayjs';
import type { AxiosRequestConfig } from 'axios';
import { axiosFetcher } from '@/shared/api/swr';
import { useFiltersStore } from '@/shared/filterStore/model/store';
import { buildMetricQuery, normalizeKey } from '@/shared/api/metricQuery';
import type { ExtraFilters } from '@/shared/interface/filter';
import type { TimeRange } from '@/shared/interface/globalTypes';
import type { IWordCloudResponse } from '@/shared/interface/worldCloud';
import type { SwrKey } from '@/shared/api/swr';

// Response types (subset based on API description)
export type ThemeSearchMetricValue = {
  id: string;
  value: number | string | null;
  unit?: string;
};

export type ThemeSearchMetrics = {
  total_count?: ThemeSearchMetricValue;
  avg_sentiment?: ThemeSearchMetricValue;
  avg_rating?: ThemeSearchMetricValue;
  [metricName: string]: ThemeSearchMetricValue | undefined;
};

export type ThemeSearchPieDatum = {
  name: string;
  value: number | string;
  color?: string;
};

export type ThemeSearchPieChart = {
  id: string;
  title?: string;
  data?: ThemeSearchPieDatum[];
  centralValue?: {
    label?: string;
    value?: string;
  };
};

export type ThemeSearchPiecharts = {
  sentiment?: ThemeSearchPieChart;
  services?: ThemeSearchPieChart;
  [chartName: string]: ThemeSearchPieChart | undefined;
};

export type ThemeSearchNearestTagRow = {
  name: string;
  mentions?: number;
  positive?: number;
  neutral?: number;
  negative?: number;
};

export type ThemeSearchNearestTags = {
  id?: string;
  title?: string;
  subtitle?: string;
  data?: ThemeSearchNearestTagRow[];
  period?: TimeRange;
  barKeys?: string[];
  stacked?: boolean;
  normalize100?: boolean;
};

export type ThemeSearchResponse = {
  metrics?: ThemeSearchMetrics;
  wordcloud?: IWordCloudResponse | undefined;
  piecharts?: ThemeSearchPiecharts | undefined;
  nearest_tags?: ThemeSearchNearestTags | undefined;
};

export function useThemeSearch() {
  // container hook: returns state+actions and fetched data for the shared UI
  const [theme, setTheme] = useState<string>('');
  const [queryTheme, setQueryTheme] = useState<string | undefined>(undefined);

  const { value: filterValue } = useFiltersStore();

  const period: { from: Dayjs; to: Dayjs } | null =
    filterValue.range && filterValue.range[0] && filterValue.range[1]
      ? { from: filterValue.range[0], to: filterValue.range[1] }
      : null;

  const metricQuery = buildMetricQuery(period, (filterValue.extra ?? {}) as ExtraFilters);

  const baseKey = queryTheme
    ? ([
        '/searching/find_nearest_comments',
        { params: { theme: queryTheme } } as AxiosRequestConfig,
      ] as const)
    : null;

  const key = normalizeKey(baseKey, metricQuery) as SwrKey;

  const { data, isLoading, error, mutate } = useSWR<ThemeSearchResponse>(key, axiosFetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 30_000,
  });

  const onSearch = () => setQueryTheme(theme.trim() || undefined);
  const onReset = () => {
    setTheme('');
    setQueryTheme(undefined);
  };

  const periodRange = period
    ? ([period.from.toISOString(), period.to.toISOString()] as [string, string])
    : undefined;

  return { theme, setTheme, onSearch, onReset, data, isLoading, error, mutate, periodRange };
}
