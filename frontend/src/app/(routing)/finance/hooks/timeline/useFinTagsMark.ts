// src/app/(routing)/finance/hooks/timeline/useFinTagsMark.ts
'use client';

import {
  withTitle,
  createKVTimeseriesMapper,
  type BackendTimeseriesRaw,
} from '@/shared/lib/merge/mergeSeries';
import { useTimeline } from '../../api/useTimeline';

export type UseFinTagsMarkOptions = {
  title?: string;
  endpoint?: string; // по умолчанию нужная ручка
  tag?: string; // ← выбранный тег (single)
};

export function useFinTagsMark(opts?: UseFinTagsMarkOptions) {
  const endpoint = opts?.endpoint ?? '/timeline/key_rate_tags_mark_correlation';

  // Передаём tags только когда он выбран
  const params = opts?.tag ? ({ tags: [opts.tag] } as const) : ({} as const);

  return useTimeline<BackendTimeseriesRaw>({
    // tuple-ключ с params → axiosFetcher сформирует ?tags=...
    key: () => [endpoint, { params }] as const,
    map: withTitle(
      createKVTimeseriesMapper({ fillMissing: 'null', yLeftDomain: [0, 5] }),
      opts?.title ?? 'Динамика сентимента финансовых тегов',
    ),
    swr: {
      revalidateOnFocus: false,
      dedupingInterval: 5 * 60_000,
    },
    // важно: используем ТОЛЬКО локальные теги из key.params
    queryMerge: { tags: 'base' },
  });
}
