// features/pareto/hooks/useNegativePareto.ts
'use client';

import { ParetoResponse, ParetoRow } from '@/shared/interface/pareto';
import { usePareto } from '../../api/usePareto';
import { ID } from '@/shared/interface/globalTypes';

/** Сырой ответ /api/unusual_graphics/pareto */
type NegativeParetoRaw = {
  id: ID;
  title: string;
  data: Array<{
    name: string;
    negative: number;
    cumulative: number; // может быть абсолютным числом или уже процентом
  }>;
  cumulativeAsPercent?: boolean; // true — cumulative в процентах
  threshold?: number; // 0.8 или 80
};

type UseNegativeParetoArgs = {
  tag?: string;
};

export function useNegativePareto({ tag }: UseNegativeParetoArgs = {}) {
  return usePareto<NegativeParetoRaw>({
    key: tag
      ? (['/unusual_graphics/pareto', { params: { tags: [tag] } }] as const)
      : '/unusual_graphics/pareto',
    map: (api) => {
      const rowsRaw = Array.isArray(api.data) ? api.data : [];

      // Определяем, надо ли переводить cumulative в проценты 0..100
      const flagPercent = !!api.cumulativeAsPercent;
      const lastCum = rowsRaw.length ? Number(rowsRaw[rowsRaw.length - 1]?.cumulative ?? 0) : 0;

      let data: ParetoRow[];
      if (flagPercent) {
        const looksLikePercent = lastCum <= 100 && rowsRaw.some((r) => r.cumulative <= 100);
        if (looksLikePercent) {
          data = rowsRaw.map((r) => ({
            name: String(r.name),
            negative: Number(r.negative ?? 0),
            cumulative: Number(r.cumulative ?? 0),
          }));
        } else {
          const total = lastCum || rowsRaw.reduce((acc, r) => acc + (Number(r.negative) || 0), 0);
          data = rowsRaw.map((r) => ({
            name: String(r.name),
            negative: Number(r.negative ?? 0),
            cumulative: total ? (Number(r.cumulative ?? 0) / total) * 100 : 0,
          }));
        }
      } else {
        data = rowsRaw.map((r) => ({
          name: String(r.name),
          negative: Number(r.negative ?? 0),
          cumulative: Number(r.cumulative ?? 0),
        }));
      }

      let threshold: number | undefined = api.threshold;
      if (typeof threshold === 'number') {
        threshold = threshold > 1 ? threshold / 100 : threshold;
      } else {
        threshold = 0.8;
      }

      const res: Omit<ParetoResponse, 'period'> & Partial<Pick<ParetoResponse, 'period'>> = {
        id: api.id,
        title: api.title ?? 'Pareto-анализ негатива (80/20)',
        data,
        cumulativeAsPercent: flagPercent,
        threshold,
      };
      return res;
    },
  });
}
