// features/json-upload/model/sourceStore.ts
'use client';

import { SourceSelection } from '@/shared/interface/jsonUpload';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

type SourceStore = {
  /** Текущие выбранные источники. По умолчанию — только парсинг. */
  sources: SourceSelection;
  /** Метаданные последней удачной загрузки (локально, для UI) */
  lastUploadCount?: number;
  lastUploadAt?: string; // ISO
  setSources: (s: SourceSelection) => void;
  setLastUploadMeta: (count: number | undefined) => void;
  resetUploadMeta: () => void;
};

export const useSourceStore = create<SourceStore>()(
  persist(
    (set) => ({
      // default: all sources
      sources: ['parsing', 'uploading'],
      setSources: (s) => set(() => ({ sources: s.length ? s : (['parsing', 'uploading'] as SourceSelection) })),
      setLastUploadMeta: (count) =>
        set(() => ({
          lastUploadCount: count,
          lastUploadAt: new Date().toISOString(),
        })),
      resetUploadMeta: () => set(() => ({ lastUploadAt: undefined, lastUploadCount: undefined })),
    }),
    {
      name: 'data-source-v1',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
