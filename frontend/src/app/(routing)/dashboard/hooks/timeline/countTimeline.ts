'use client';

import {
  BackendTimeseriesRaw,
  createKVTimeseriesMapper,
  withTitle,
} from '@/shared/lib/merge/mergeSeries';
import { useTimeline } from '../../api/useTimeline';
import { useFiltersStore } from '@/shared/filterStore/model/store';

type Options = { title?: string; concurrent?: string };

export function useCountTimeline(opts?: Options) {
  const { period, range, extra } = useFiltersStore().value;
  return useTimeline<BackendTimeseriesRaw>({
    key: [
      '/timeline/count_timeline',
      { params: { period, range, extra, concurrent: opts?.concurrent } },
    ],
    map: withTitle(
      createKVTimeseriesMapper({
        fillMissing: 'zero',
      }),
      opts?.title ?? 'Количество отзывов',
    ),
  });
}
