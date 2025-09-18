// shared/api/swr.ts
import type { AxiosRequestConfig, AxiosResponse } from 'axios';
import { http } from './axios';
import type { MetricQuery as SharedMetricQuery } from './metricQuery';
import { buildMetricQuery as buildSharedMetricQuery } from './metricQuery';
import type { ExtraFilters } from '@/shared/interface/filter';

// ❗️ВАЖНО: сторы импортируем как обычные функции (вне React)
// чтобы можно было читать текущее состояние без хуков:
import { useFiltersStore } from '@/shared/filterStore/model/store';
import { useSourceStore } from '@/features/filter-slice/jsonUpload/model/sourceStore';

/** Ключи, которые будет понимать fetcher */
export type SwrKey = string | readonly [url: string, config?: AxiosRequestConfig];

/** Узкий тип под axios-подобную ошибку */
type ApiError = {
  response?: {
    status?: number;
    data?: unknown;
  };
  message?: string;
};

/** Приводим ошибку к удобному виду (без any) */
export class HttpError extends Error {
  public readonly status?: number;
  public readonly data?: unknown;

  constructor(message: string, opts?: { status?: number; data?: unknown }) {
    super(message);
    this.name = 'HttpError';
    this.status = opts?.status;
    this.data = opts?.data;
  }
}

const toHttpError = (e: unknown): HttpError => {
  const isObj = typeof e === 'object' && e !== null;
  const msg =
    (isObj && 'message' in e && typeof (e as { message?: unknown }).message === 'string'
      ? (e as { message?: string }).message
      : undefined) ?? 'Request failed';

  if (isObj && 'response' in e) {
    const resp = (e as ApiError).response;
    return new HttpError(msg, { status: resp?.status, data: resp?.data });
  }
  return new HttpError(msg);
};

/* ===================== подмешивание глобальных фильтров ===================== */

/** Параметры, которые глобально подмешиваем в GET-запросы */
type GlobalQuery = SharedMetricQuery;

/** Берём глобальные фильтры и источники из zustand-сторов */
function selectGlobalQuery(): GlobalQuery {
  const { value } = useFiltersStore.getState();
  const { sources } = useSourceStore.getState?.() ?? { sources: ['parsing', 'uploading'] as string[] };

  const period =
    value.range && value.range[0] && value.range[1]
      ? { from: value.range[0], to: value.range[1] }
      : null;

  // reuse shared builder but pass only supported fields
  const extra: ExtraFilters = {
    services: value.extra?.services ?? [],
    rating: value.extra?.rating ?? 0,
    text: value.extra?.text ?? undefined,
    tags: value.extra?.tags ?? undefined,
  };

  const base = buildSharedMetricQuery(period, extra);

  // override source from sourceStore (default to both)
  return { ...base, source: Array.isArray(sources) && sources.length ? (sources as string[]) : ['parsing', 'uploading'] };
}

/** Слияние params так, чтобы массивы объединялись без дублей (tags/source) */
function mergeParams<A extends Record<string, unknown>, B extends Record<string, unknown>>(
  base: A | undefined,
  extra: B,
): A & B {
  const out: Record<string, unknown> = { ...(base ?? {}) };

  for (const [k, v] of Object.entries(extra)) {
    const current = out[k];
    if (Array.isArray(current) || Array.isArray(v)) {
      const arr = [
        ...(Array.isArray(current) ? (current as unknown[]) : current != null ? [current] : []),
        ...(Array.isArray(v) ? (v as unknown[]) : v != null ? [v] : []),
      ];
      // remove duplicates and nullish
      out[k] = Array.from(new Set(arr.filter((x) => x != null)));
    } else if (v !== undefined) {
      out[k] = v;
    }
  }

  return out as A & B;
}

/**
 * Флажок отключения авто-подмешивания глобальных параметров.
 * Можно передать в config: { __noGlobalParams: true }
 */
type AxiosConfigWithFlag = AxiosRequestConfig & { __noGlobalParams?: boolean };

/**
 * Универсальный fetcher для useSWR, который автоматически
 * подмешивает глобальные фильтры в **GET**-запросы.
 *
 * Примеры:
 * useSWR<User[]>('/users', axiosFetcher)                     // добавит ?source=&from=&to=...
 * useSWR<Metrics>(['/metrics', { params: { a:1 } }], ...)   // сольёт a=1 с глобальными
 * useSWR(['/_custom', { method: 'POST', data: { a:1 } }],)  // POST — без подмешивания
 * useSWR(['/_raw', { __noGlobalParams: true }], ...)        // отключить глобальные params
 */
export async function axiosFetcher<T>(key: SwrKey): Promise<T> {
  try {
    const globals = selectGlobalQuery();

    // Кейс: ключ — строка → GET + глобальные params
    if (typeof key === 'string') {
      const res: AxiosResponse<T> = await http.get<T>(key, { params: globals });
      return res.data;
    }

    // Кейс: ключ — [url, config]
    const [url, raw] = key;
    const cfg = (raw ?? {}) as AxiosConfigWithFlag;

    // если явно запретили подмешивание — просто отправляем
    if (cfg.__noGlobalParams) {
      const res: AxiosResponse<T> = await http.request<T>({ url, ...(cfg as AxiosRequestConfig) });
      return res.data;
    }

    // подмешиваем только для GET (method не указан или GET)
    const method = (cfg.method ?? 'GET').toUpperCase();
    const finalConfig: AxiosRequestConfig =
      method === 'GET'
        ? {
            ...cfg,
            params: mergeParams(cfg.params ?? {}, globals),
          }
        : cfg;

    const res: AxiosResponse<T> = await http.request<T>({ url, ...finalConfig });
    return res.data;
  } catch (e: unknown) {
    throw toHttpError(e);
  }
}
