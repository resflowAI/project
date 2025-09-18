// features/json-upload/model/types.ts
export type SourceValue = 'uploading' | 'parsing';
export type SourceSelection = SourceValue[]; // напр.: ['parsing'] | ['uploading'] | ['parsing','uploading']

export type Granularity = 'day' | 'week' | 'month' | 'year';

export type UploadItem = { id: number; text: string };
export type UploadPayload = { data: UploadItem[] } | UploadItem[];

/** Ответ бэка: просто строка */
export type UploadStatus = 'successfull' | 'error';

export type UploadResponse = {
  status?: UploadStatus;
  detail?: string;
};
