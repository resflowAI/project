// features/histograms/hooks/useTagsSentimentHistogram.ts
'use client';

import { ID, useHistogram } from '../../api/useHistograms';
import { ClusterBarRow, ClusterBarsResponse } from '@/shared/interface/clusterBars';

type TagsSentimentHistogramRaw = {
  id: ID;
  title: string;
  data: Array<{
    name: string;
    mentions: number;
    positive: number;
    neutral: number;
    negative: number;
  }>;
  barKeys?: string[]; // приходит на русском
  stacked?: boolean;
  normalize100?: boolean;
};

// соответствие «человекочитаемого» → канонического ключа данных
const KEY_MAP: Record<string, string> = {
  Позитивные: 'positive',
  Нейтральные: 'neutral',
  Негативные: 'negative',
  Упоминания: 'mentions',
};

export function useFinTagsSentimentHistogram() {
  return useHistogram<TagsSentimentHistogramRaw>({
    key: '/histograms/fin_tags_sentiment_histogram',
    map: (api) => {
      // данные уже с canonical-полями
      const rows: ClusterBarRow[] = api.data.map((r) => ({
        name: r.name,
        mentions: r.mentions,
        positive: r.positive,
        neutral: r.neutral,
        negative: r.negative,
      }));

      // нормализуем barKeys из русских в canonical
      const serverKeys = Array.isArray(api.barKeys) ? api.barKeys : [];
      const normalizedKeys = serverKeys.map((k) => KEY_MAP[k] ?? k).filter(Boolean);

      const barKeys =
        normalizedKeys.length > 0 ? normalizedKeys : ['positive', 'neutral', 'negative'];

      const res: Omit<ClusterBarsResponse, 'period'> &
        Partial<Pick<ClusterBarsResponse, 'period'>> = {
        id: api.id,
        title: api.title ?? 'Теги по тональностям',
        data: rows,
        barKeys, // ← теперь совпадает с полями данных
        stacked: api.stacked ?? true,
        normalize100: api.normalize100 ?? false,
      };
      return res;
    },
  });
}
