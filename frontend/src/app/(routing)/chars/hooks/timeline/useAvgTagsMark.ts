'use client';

import { useTimeline } from '../../api/useTimeline';
import {
  withTitle,
  createKVTimeseriesMapper,
  type BackendTimeseriesRaw,
} from '@/shared/lib/merge/mergeSeries';

export type UseAvgTagsMarkOptions = { tags?: string[]; title?: string };
// ?tag=tag1&tag=tag2
/** формируем params только когда есть выбранные теги */
const makeParams = (tags?: string[]) => (Array.isArray(tags) && tags.length > 0 ? { tags } : {});

export function useAvgTagsMark(opts?: UseAvgTagsMarkOptions) {
  const params = makeParams(opts?.tags);

  return useTimeline<BackendTimeseriesRaw>({
    // если tags пустые — params будет пустым объектом, серверу ничего лишнего не шлём
    key: () => ['/timeline/avg_tags_mark', { params }],
    map: withTitle(
      createKVTimeseriesMapper({ fillMissing: 'null', yLeftDomain: [0, 5] }),
      opts?.title ?? 'Динамика сентимента характеристик',
    ),
    swr: {
      refreshInterval: 30_000,
      dedupingInterval: 0,
      revalidateOnFocus: false,
    },
    // ⬇️ берём только локальные tags из key.params, глобальные игнорим
    queryMerge: { tags: 'base' },
  });
}
