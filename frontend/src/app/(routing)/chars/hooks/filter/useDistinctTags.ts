'use client';

import useSWR from 'swr';
import { axiosFetcher } from '@/shared/api/swr';

export type DistinctTagsResponse = { tags: string[] };

export function useDistinctTags() {
  const { data, error, isLoading } = useSWR<DistinctTagsResponse>(
    ['/filter/distinct_tags', { params: {} }],
    axiosFetcher,
  );
  return { tags: data?.tags ?? [], isLoading, error };
}
