import { Dayjs } from 'dayjs';
import type { AxiosRequestConfig } from 'axios';
import type { ExtraFilters } from '@/shared/interface/filter';

export type MetricQuery = {
  service?: string[];
  start_date?: string;
  end_date?: string;
  min_rating?: number;
  max_rating?: number;
  text?: string;
  tags?: string[];
  source?: string[];
  comment_ids?: string[];
  concurrent?: string;
};

type QueryParams = Record<string, unknown> & { tags?: string[]; source?: string[] };

const toDateStr = (d: Dayjs) => d.format('YYYY-MM-DD');

/**
 * Build metric query from period and extra filters.
 * - service and source are arrays (repeat params)
 * - min/max rating default to 0 and 5 if not provided
 */
export function buildMetricQuery(period: { from: Dayjs; to: Dayjs } | null, extra: ExtraFilters): MetricQuery {
  const services = Array.isArray(extra.services) && extra.services.length ? extra.services : undefined;
  const start_date = period ? toDateStr(period.from) : undefined;
  const end_date = period ? toDateStr(period.to) : undefined;

  const min_rating = typeof extra.rating === 'number' && Number.isFinite(extra.rating) ? extra.rating : 0;
  const max_rating = 5;

  const text = typeof extra.text === 'string' && extra.text.trim() ? extra.text : undefined;
  const tags = Array.isArray(extra.tags) && extra.tags.length ? extra.tags : undefined;
  const source = Array.isArray(extra.services) ? undefined : undefined; // placeholder - source usually comes from sourceStore

  return { service: services, start_date, end_date, min_rating, max_rating, text, tags, source };
}

export type TagsStrategy = 'union' | 'override' | 'base';

export function mergeParams(
  base: QueryParams | undefined,
  extra: MetricQuery,
  tagsStrategy: TagsStrategy = 'union',
): QueryParams {
  const baseTags = base?.tags;
  const extraTags = extra.tags;

  let tags: string[] | undefined;
  switch (tagsStrategy) {
    case 'override':
      tags = baseTags ?? extraTags;
      break;
    case 'base':
      tags = baseTags;
      break;
    case 'union':
    default:
      tags = baseTags && extraTags ? Array.from(new Set([...baseTags, ...extraTags])) : (extraTags ?? baseTags);
  }

  const baseSource = base?.source;
  const extraSource = extra.source;
  const source = baseSource && extraSource ? Array.from(new Set([...baseSource, ...extraSource])) : (extraSource ?? baseSource);

  const merged: QueryParams = { ...(base ?? {}), ...extra };
  if (tags) merged.tags = tags;
  if (source) merged.source = source;
  return merged;
}

export type SwrTuple = readonly [url: string, config?: AxiosRequestConfig];
export type SwrKey = string | SwrTuple | null;

export function normalizeKey(raw: SwrKey, params: MetricQuery, tagsStrategy: TagsStrategy = 'union'): SwrKey {
  if (!raw) return null;
  if (typeof raw === 'string') {
    const cfg: AxiosRequestConfig = { params: { ...params } as QueryParams };
    return [raw, cfg] as const;
  }
  const [url, cfg] = raw;
  const prevParams = (cfg?.params as QueryParams | undefined) ?? undefined;
  const mergedParams = mergeParams(prevParams, params, tagsStrategy);
  const nextCfg: AxiosRequestConfig = { ...(cfg ?? {}), params: mergedParams };
  return [url, nextCfg] as const;
}
