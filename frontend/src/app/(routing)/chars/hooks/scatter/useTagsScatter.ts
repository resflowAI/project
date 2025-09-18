'use client';

import type { ID } from '@/shared/interface/globalTypes';
import { ScatterDatum, ScatterSeries } from '@/shared/interface/scatter';
import { ScatterBlockResult, useScatterBlock } from '../../api/useScatterBlock';

/** Ответ бэка */
type BackendTagsScatter = {
  id: string;
  title: string;
  xLabel: string;
  yLabel: string;
  avgSentiment?: number;
  points: Array<{
    x: number;
    y: number;
    color?: string; // hex или имя — берём как есть, если похоже на hex, прокинем
    label?: string; // характеристика/тег
    mentions?: number; // размер точки
    sentiment?: number; // может совпадать с y, но сохраняем для тултипа
  }>;
  legend?: Array<{ color: string; label: string }>;
};

function asHex(c?: string): `#${string}` | undefined {
  if (!c) return undefined;
  // допустим #RRGGBB или #RGB
  const s = c.trim();
  if (/^#[0-9a-f]{3}([0-9a-f]{3})?$/i.test(s)) return s as `#${string}`;
  return undefined;
}

function mapBackend(payload: BackendTagsScatter): ScatterBlockResult {
  // группируем точки по legend.label (если легенды нет — одной серией)
  // но в данных каждой точке уже приходит label/color — используем label как name серии
  const bySeries = new Map<string, ScatterSeries>();

  const legendColorByLabel = new Map<string, string>();
  (payload.legend ?? []).forEach((l) => legendColorByLabel.set(l.label, l.color));

  const pushPoint = (seriesName: string, datum: ScatterDatum, color?: string) => {
    const key = seriesName || 'All';
    if (!bySeries.has(key)) {
      const id = key as ID;
      bySeries.set(key, {
        id,
        name: key,
        data: [],
        xKey: 'x',
        yKey: 'y',
        sizeKey: 'mentions',
        colorHex: asHex(color),
      });
    }
    bySeries.get(key)!.data.push(datum);
  };

  for (const p of payload.points ?? []) {
    const characteristic = p.label ?? '—';
    const legendColor = legendColorByLabel.get(characteristic);
    const color = asHex(p.color ?? legendColor);

    const datum: ScatterDatum = {
      x: p.x,
      y: p.y,
      mentions: p.mentions ?? 0,
      sentiment: p.sentiment ?? p.y,
      characteristic, // удобно для тултипа
    };

    pushPoint(characteristic, datum, color);
  }

  // если все серии одного цвета undefined — не страшно, компонент сам окрасит
  const series = Array.from(bySeries.values());

  return {
    series,
    avgSentiment: payload.avgSentiment,
    xLabel: payload.xLabel,
    yLabel: payload.yLabel,
    title: payload.title,
  };
}

/** Частный хук: /api/unusual_graphics/tags_scatter */
export function useTagsScatter() {
  return useScatterBlock<BackendTagsScatter>({
    key: '/unusual_graphics/tags_scatter',
    map: mapBackend,
  });
}
