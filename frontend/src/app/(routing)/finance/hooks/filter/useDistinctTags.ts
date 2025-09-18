'use client';

import useSWR from 'swr';
import { axiosFetcher } from '@/shared/api/swr';

type DistinctTagsRaw = { tags: string[] };

export function useDistinctTags() {
  const { data, isLoading, error } = useSWR<DistinctTagsRaw>(
    ['/filter/distinct_tags', { params: {} }],
    axiosFetcher,
    { dedupingInterval: 5 * 60_000 },
  );

  return {
    tags: data?.tags ?? [],
    isLoading,
    error,
  };
}
