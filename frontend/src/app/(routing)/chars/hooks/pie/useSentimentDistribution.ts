'use client';

import type { PieResponse, PieSlice } from '@/shared/interface/pieChart';
import { usePieBlock } from '../../api/usePieBlock';

type BackendSentimentDistribution = {
  id: string;
  title: string;
  data: Array<{ name: string; value: number }>;
  centralValue?: { label?: string; value?: string }; // оба поля опциональны
};

function mapBackend(p: BackendSentimentDistribution): PieResponse {
  const slices: PieSlice[] = (p.data ?? []).map((d, i) => ({
    key: d.name ?? `slice_${i}`,
    label: d.name ?? `Категория ${i + 1}`,
    value: typeof d.value === 'number' ? d.value : 0,
    // цвет можно проставить здесь при желании: colorHex: '#…'
  }));

  return {
    id: p.id,
    title: p.title,
    slices,
    // динамическая пара (лейбл + значение в центре), если пришла с бэка
    center:
      p.centralValue?.label || p.centralValue?.value
        ? { label: p.centralValue?.label, value: p.centralValue?.value }
        : undefined,
  };
}

export function useSentimentDistribution() {
  return usePieBlock<BackendSentimentDistribution>({
    key: '/pie/sentiment_distribution',
    map: mapBackend,
  });
}
