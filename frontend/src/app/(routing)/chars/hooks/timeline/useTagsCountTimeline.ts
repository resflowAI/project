'use client';

import { useTimeline } from '../../api/useTimeline';
import {
  withTitle,
  createKVTimeseriesMapper,
  type BackendTimeseriesRaw,
} from '@/shared/lib/merge/mergeSeries';

export type UseTagsCountTimelineOptions = { tags?: string[]; title?: string };

const makeParams = (tags?: string[]) => (Array.isArray(tags) && tags.length > 0 ? { tags } : {});

export function useTagsCountTimeline(opts?: UseTagsCountTimelineOptions) {
  const params = makeParams(opts?.tags);

  return useTimeline<BackendTimeseriesRaw>({
    key: () => ['/timeline/tags_count_timeline', { params }],
    map: withTitle(
      createKVTimeseriesMapper({ fillMissing: 'zero' }),
      opts?.title ?? 'Динамика количества характеристик',
    ),
    swr: {
      refreshInterval: 30_000,
      dedupingInterval: 0,
      revalidateOnFocus: false,
    },
    queryMerge: { tags: 'base' }, // ⬅️ только локальные tags
  });
}
