import { http } from '@/shared/api/axios';

/** Источник данных на бэкенде */
export type DataMode = 'parsed' | 'uploaded';

/** DTO и ответы для API */
export interface SetModeDto {
  mode: DataMode;
}
export interface SetModeResponse {
  ok: true;
  mode: DataMode;
}

export interface UploadJsonResponse {
  ok: true;
  /** Кол-во обработанных/сохранённых записей (если бэк это возвращает) */
  items?: number;
}

/** Установка источника данных на бэкенде */
export async function setDataMode(mode: DataMode): Promise<SetModeResponse> {
  const { data } = await http.post<SetModeResponse>('/data-source/mode', {
    mode,
  } satisfies SetModeDto);
  return data;
}

/** Загрузка JSON-пейлоада “как есть”. При необходимости — валидируйте схему на бэке. */

type UploadingItem = { id: number; text: string };
export async function uploadJsonPayload(items: UploadingItem[], uploadingDate: string) {
  return http.post<string>(
    '/data_uploading/upload_json',
    items, // тело запроса = массив объектов
    { params: { uploading_date: uploadingDate } }, // query-параметр
  );
}
