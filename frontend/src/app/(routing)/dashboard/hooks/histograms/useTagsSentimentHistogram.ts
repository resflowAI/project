// features/histograms/hooks/useTagsSentimentHistogram.ts
'use client';

import { ClusterBarRow, ClusterBarsResponse } from '@/shared/interface/clusterBars';
import { useMappedSWR } from '@/shared/api/useMappedSWR';
import { useFiltersStore } from '@/shared/filterStore/model/store';
import { ID } from '@/shared/interface/globalTypes';

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

export function useTagsSentimentHistogram(concurrent?: string) {
  const { range, period, extra } = useFiltersStore().value;
  return useMappedSWR<TagsSentimentHistogramRaw, ClusterBarsResponse>(
    [
      '/histograms/tags_sentiment_histogram',
      { params: { top_n: 5, period, range, extra, concurrent } },
    ],
    (api) => {
      const rows: ClusterBarRow[] = api.data.map((r) => ({
        name: r.name,
        mentions: r.mentions,
        positive: r.positive,
        neutral: r.neutral,
        negative: r.negative,
      }));

      const serverKeys = Array.isArray(api.barKeys) ? api.barKeys : [];
      const normalizedKeys = serverKeys.map((k) => KEY_MAP[k] ?? k).filter(Boolean);
      const barKeys =
        normalizedKeys.length > 0 ? normalizedKeys : ['positive', 'neutral', 'negative'];

      return {
        id: api.id,
        title: api.title ?? 'Теги по тональностям',
        period: {
          from: range && range[0] ? range[0].toISOString() : '',
          to: range && range[1] ? range[1].toISOString() : '',
          granularity: undefined,
        },
        data: rows,
        barKeys,
        stacked: api.stacked ?? true,
        normalize100: api.normalize100 ?? false,
      };
    },
  );
}
