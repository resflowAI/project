// features/theme-search/api/useQueryWithProps.ts
'use client';

import useSWR, { type Key } from 'swr';
import type { AxiosRequestConfig } from 'axios';
import { axiosFetcher } from '@/shared/api/swr';

/** Ключи как в твоем useTimeline */
type SwrTuple = readonly [url: string, config?: AxiosRequestConfig];
export type SwrKey = string | SwrTuple | null;

/** Пропсы, которые может передать компонент в хук */
export type QueryProps = {
  /** Любые query-параметры попадут в config.params */
  params?: Record<string, unknown>;
};

/** Конфиг универсального хука */
export type QueryWithPropsConfig<TApi, TOut, TProps extends QueryProps> = {
  /** Ключ может зависеть от props */
  key: SwrKey | ((p: TProps) => SwrKey);
  /** Маппер API -> то, что вернет хук */
  map: (api: TApi, p: TProps) => TOut;
  /** Опции SWR */
  swr?: {
    refreshInterval?: number;
    revalidateOnFocus?: boolean;
    dedupingInterval?: number;
  };
};

/** Нормализация ключа в формат [url, { params }] + подмешивание props.params */
function normalizeKeyWithProps(p: QueryProps, raw: SwrKey): SwrKey {
  if (!raw) return null;

  if (typeof raw === 'string') {
    const cfg: AxiosRequestConfig = p.params ? { params: { ...p.params } } : {};
    return [raw, cfg] as const;
  }

  const [url, cfg] = raw;
  const prevParams = (cfg?.params as Record<string, unknown> | undefined) ?? undefined;
  const nextCfg: AxiosRequestConfig = {
    ...(cfg ?? {}),
    params: { ...(prevParams ?? {}), ...(p.params ?? {}) },
  };
  return [url, nextCfg] as const;
}

/** Универсальный хук: все данные для запроса приходят через props */
export function useQueryWithProps<TApi, TOut, TProps extends QueryProps>(
  props: TProps,
  cfg: QueryWithPropsConfig<TApi, TOut, TProps>,
) {
  const rawKey: SwrKey = typeof cfg.key === 'function' ? cfg.key(props) : cfg.key;
  const keyForSWR: Key = normalizeKeyWithProps(props, rawKey) as unknown as Key;

  const {
    data: api,
    error,
    isLoading,
    isValidating,
    mutate,
  } = useSWR<TApi>(keyForSWR, axiosFetcher, cfg.swr);

  const data: TOut | undefined = api ? cfg.map(api, props) : undefined;
  return { data, error, isLoading, isValidating, mutate };
}
