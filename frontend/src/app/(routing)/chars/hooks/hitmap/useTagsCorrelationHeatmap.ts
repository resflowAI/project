// features/chars/hooks/hitmap/useTagsCorrelationHeatmap.ts
'use client';

import type { HeatmapCell, HeatmapData } from '@/shared/interface/hitmap';
import { useMappedSWR } from '@/shared/api/useMappedSWR';
import { useFiltersStore } from '@/shared/filterStore/model/store';
import { buildMetricQuery, normalizeKey } from '@/shared/api/metricQuery';
import type { ExtraFilters } from '@/shared/interface/filter';
import type { Dayjs } from 'dayjs';
import type { SwrKey } from '@/shared/api/swr';

/** Схема ответа бэка */
type BackendHeatmap = {
  id: string;
  title: string;
  tags: string[];
  data: Array<{ xTag: string; yTag: string; value: number }>;
  valueRange?: number[]; // пример: [0, 100]
};

/** Маппер → HeatmapData */
const mapBackendToHeatmap = (payload: BackendHeatmap): HeatmapData => {
  const cells: HeatmapCell[] = (payload.data ?? []).map((d) => ({
    x: d.xTag,
    y: d.yTag,
    v: d.value,
  }));

  // порядок осей по первому вхождению
  const xOrder = Array.from(new Set(cells.map((c) => c.x)));
  const yOrder = Array.from(new Set(cells.map((c) => c.y)));

  const values = cells.map((c) => c.v);
  const vMin = payload.valueRange?.length
    ? Math.min(...payload.valueRange)
    : values.length
      ? Math.min(...values)
      : undefined;
  const vMax = payload.valueRange?.length
    ? Math.max(...payload.valueRange)
    : values.length
      ? Math.max(...values)
      : undefined;

  return {
    xOrder,
    yOrder,
    cells,
    meta: { xLabel: 'X tag', yLabel: 'Y tag', vLabel: 'value', vMin, vMax, decimals: 2 },
  };
};

/** Готовый хук */
export function useTagsCorrelationHeatmap() {
  const { value: filterValue } = useFiltersStore();

  const period: { from: Dayjs; to: Dayjs } | null =
    filterValue.range && filterValue.range[0] && filterValue.range[1]
      ? { from: filterValue.range[0], to: filterValue.range[1] }
      : null;

  const query = buildMetricQuery(period, (filterValue.extra ?? {}) as ExtraFilters);
  const key = normalizeKey('/unusual_graphics/tags_correlation', query) as SwrKey;

  return useMappedSWR<BackendHeatmap, HeatmapData>(key, mapBackendToHeatmap, {
    dedupingInterval: 60_000,
    revalidateOnFocus: false,
  });
}
