// shared/api/http.ts
import axios, { AxiosHeaders } from 'axios';
// Если используешь dayjs в params — можно импортить тип опционально
// import type { Dayjs } from 'dayjs';

const isBrowser = typeof window !== 'undefined';

function getAccessToken(): string | null {
  if (!isBrowser) return null;
  try {
    return localStorage.getItem('access_token');
  } catch {
    return null;
  }
}

function getBaseUrl(): string {
  const nodeEnv = process.env.NODE_ENV;
  if (nodeEnv === 'development') {
    return process.env.NEXT_PUBLIC_API_DEV_URL ?? '/api';
  }
  if (nodeEnv === 'production') {
    return process.env.NEXT_PUBLIC_API_PROD_URL ?? '/api';
  }
  return process.env.NEXT_PUBLIC_API_URL ?? '/api';
}

/** Нормализация значений для query */
function normalizeParamValue(v: unknown): string {
  // Dayjs/Date → YYYY-MM-DD (или оставь String(v), если не нужно)
  // if (v && typeof v === 'object' && 'isValid' in (v as any)) {
  //   const d = v as Dayjs;
  //   return d.isValid() ? d.format('YYYY-MM-DD') : String(d);
  // }
  if (v instanceof Date) return v.toISOString();
  return String(v);
}

/** Общий инстанс HTTP-клиента */
export const http = axios.create({
  baseURL: getBaseUrl(),
  timeout: 20_000,
  withCredentials: true,

  /** ВАЖНО: сериализуем массивы как repeat: ?tag=a&tag=b (без [] ) */
  paramsSerializer: {
    serialize: (params: Record<string, unknown>) => {
      const usp = new URLSearchParams();
      Object.entries(params ?? {}).forEach(([key, val]) => {
        if (val == null) return; // пропускаем null/undefined
        if (Array.isArray(val)) {
          // repeat-формат
          (val as unknown[]).forEach((item) => usp.append(key, normalizeParamValue(item)));
        } else {
          usp.append(key, normalizeParamValue(val));
        }
      });
      return usp.toString();
    },
  },
});

/** Перехватчик запросов: Authorization */
http.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    if (!(config.headers instanceof AxiosHeaders)) {
      config.headers = new AxiosHeaders(config.headers);
    }
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  return config;
});

/** Перехватчик ответов */
http.interceptors.response.use(
  (res) => res,
  (error) => Promise.reject(error),
);
