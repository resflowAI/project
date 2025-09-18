'use client';

import type { ID, ISODateString } from '@/shared/interface/globalTypes';
import type { LineTimeseriesResponse, TsPoint, TsSeriesDef } from '@/shared/interface/line';

type FillMissing = 'zero' | 'null';

export type BackendTimeseriesRaw = {
  id: ID;
  title?: string | null;
  data: Array<{
    t: ISODateString;
    value: Record<string, number | null | undefined>;
  }>;
  series?: Array<{
    key: string;
    label: string;
    yAxis?: 'left' | 'right';
  }>;
  yLeftDomain?: [number | null, number | null] | null;
  yRightDomain?: [number | null, number | null] | null;
};

export type CreateKVMapperOptions = {
  /** чем заполнять пропуски точек (когда в одну дату нет значения у конкретной серии) */
  fillMissing?: FillMissing;
  /** если нужно переопределить подписи */
  labelByKey?: Record<string, string>;
  /** явные домены, если нужно форснуть */
  yLeftDomain?: [number | null, number | null];
  yRightDomain?: [number | null, number | null];
  /** сортировать по возрастанию t (по умолчанию true) */
  sortAsc?: boolean;
};

/**
 * Универсальный маппер: формат бэка (KV в поле value) → LineTimeseriesResponse
 * - поддерживает любое число серий в value
 * - использует series с бэка, иначе генерирует из ключей value
 * - заполняет пропуски zero/null
 */
export function createKVTimeseriesMapper<T extends BackendTimeseriesRaw>(
  opts: CreateKVMapperOptions = {},
) {
  const { fillMissing = 'zero', labelByKey, yLeftDomain, yRightDomain, sortAsc = true } = opts;

  return (api: T): LineTimeseriesResponse => {
    const rows = Array.isArray(api.data) ? api.data.slice() : [];

    // 1) Соберём множество всех ключей серий из value (на всякий случай)
    const keysFromValues = new Set<string>();
    for (const r of rows) {
      const v = r?.value ?? {};
      for (const k of Object.keys(v)) keysFromValues.add(k);
    }

    // 2) Построим series:
    const baseSeries: TsSeriesDef[] =
      Array.isArray(api.series) && api.series.length > 0
        ? api.series.map((s) => ({
            key: s.key,
            label: labelByKey?.[s.key] ?? s.label ?? s.key,
            yAxis: s.yAxis ?? 'left',
          }))
        : Array.from(keysFromValues).map<TsSeriesDef>((key) => ({
            key,
            label: labelByKey?.[key] ?? key,
            yAxis: 'left',
          }));

    const seriesKeys = baseSeries.map((s) => s.key);
    const wantedSet = new Set(seriesKeys);

    // 3) Отсортируем строки по дате (если надо)
    if (sortAsc) {
      rows.sort((a, b) => String(a.t).localeCompare(String(b.t)));
    }

    // 4) Соберём TsPoint[]
    const data: TsPoint[] = rows.map<TsPoint>((r) => {
      const row: TsPoint = { t: r.t };
      const v = r.value ?? {};

      for (const key of seriesKeys) {
        const valRaw = v[key];
        if (valRaw == null || typeof valRaw !== 'number' || Number.isNaN(valRaw)) {
          row[key] = fillMissing === 'zero' ? 0 : null;
        } else {
          row[key] = valRaw;
        }
      }

      // если внезапно пришёл новый ключ, которого нет в series, пропускаем его (стабильность)
      // при желании можно включить динамическое добавление ключей — тогда обновляй seriesKeys.
      for (const key of Object.keys(v)) {
        if (!wantedSet.has(key)) {
          // noop
        }
      }
      return row;
    });

    // 5) Домены
    const leftDomain = yLeftDomain ?? api.yLeftDomain ?? undefined;
    const rightDomain = yRightDomain ?? api.yRightDomain ?? undefined;

    return {
      id: api.id,
      title: api.title ?? undefined,
      data,
      series: baseSeries,
      yLeftDomain: leftDomain ?? undefined,
      yRightDomain: rightDomain ?? undefined,
    };
  };
}

export function withTitle<TApi>(map: (api: TApi) => LineTimeseriesResponse, title?: string) {
  if (!title) return map;
  return (api: TApi): LineTimeseriesResponse => {
    const res = map(api);
    return { ...res, title };
  };
}
