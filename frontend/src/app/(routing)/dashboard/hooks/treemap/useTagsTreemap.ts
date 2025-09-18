// features/treemap/hooks/useTagsTreemap.ts
'use client';

import { ID } from '@/shared/interface/globalTypes';
import { useTreemap } from '../../api/useTreemap';
import { useFiltersStore } from '@/shared/filterStore/model/store';
import { TreemapNode, TreemapResponse } from '@/shared/interface/treemap';

/** Сырой ответ /api/unusual_graphics/tags_treemap */
type TagsTreemapRaw = {
  id: ID;
  title: string;
  data: Array<{
    name: string;
    size: number;
    sentimentScore: number;
    color: string;
  }>;
};

export function useTagsTreemap(concurrent?: string) {
  const { period, range, extra } = useFiltersStore().value;
  return useTreemap<TagsTreemapRaw>({
    key: ['/unusual_graphics/tags_treemap', { params: { period, range, extra, concurrent } }],
    map: (api) => {
      // приведение типов и защита от мусора
      const nodes: TreemapNode[] = (api.data ?? []).map((n) => ({
        name: String(n.name),
        size: Number(n.size ?? 0),
        sentimentScore: Number(n.sentimentScore ?? 0),
        color: n.color,
      }));

      const res: TreemapResponse = {
        id: api.id,
        title: api.title ?? 'Объём и сентимент',
        data: nodes,
      };
      return res;
    },
  });
}
