'use client';

import {
  BackendTimeseriesRaw,
  createKVTimeseriesMapper,
  withTitle,
} from '@/shared/lib/merge/mergeSeries';
import { useTimeline } from '../../api/useTimeline';
import { useFiltersStore } from '@/shared/filterStore/model/store';

export function useRatingTimeline(concurrent?: string) {
  const { period, range, extra } = useFiltersStore().value;
  return useTimeline<BackendTimeseriesRaw>({
    key: ['/timeline/rating_timeline', { params: { period, range, extra, concurrent } }],
    map: withTitle(
      createKVTimeseriesMapper({
        fillMissing: 'null',
        yLeftDomain: [0, 5],
      }),
      'Рейтинг',
    ),
  });
}
