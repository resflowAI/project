// features/json-upload/api/upload.ts
'use client';

import { http } from "@/shared/api/axios";
import { UploadItem, UploadResponse } from "@/shared/interface/jsonUpload";


/** Отправляем массив отзывов и дату загрузки в query */
export async function uploadJson(
  items: UploadItem[],
  params: { uploadingDate: string },
): Promise<UploadResponse> {
  const { data } = await http.post<UploadResponse>(
    '/data_uploading/upload_json',
    items,
    { params: { uploading_date: params.uploadingDate } },
  );
  return data ?? { status: 'error', detail: 'Неизвестный ответ сервера' };
}
