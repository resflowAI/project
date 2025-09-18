// shared/api/useMappedSWR.ts
'use client';

import useSWR, { type SWRConfiguration } from 'swr';
import { axiosFetcher, type SwrKey } from '@/shared/api/swr';

export function useMappedSWR<TApi, TMapped>(
  key: SwrKey,
  map: (api: TApi) => TMapped,
  swr?: SWRConfiguration<TApi, unknown>,
) {
  const { data, error, isLoading, isValidating, mutate } = useSWR<TApi>(key, axiosFetcher, swr);
  return {
    data: data ? map(data) : undefined,
    error: error as unknown,
    isLoading,
    isValidating,
    mutate: mutate as unknown,
  };
}
/**
 * Универсальный хук для запросов с учетом фильтров и маппинга данных.
 * @template TApi - тип данных, приходящих с API
 * @template TMapped - тип данных после маппинга
 * @param {SwrKey} key - ключ для SWR (может включать фильтры)
 * @param {(api: TApi) => TMapped} map - функция преобразования данных
 * @param {SWRConfiguration<TApi, any>} [swr] - опции SWR
 * @returns {{ data?: TMapped, error: any, isLoading: boolean, isValidating: boolean, mutate: any }}
 */
