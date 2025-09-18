// shared/filterStore/model/store.ts
'use client';

import dayjs, { Dayjs } from 'dayjs';
import 'dayjs/locale/ru';
import quarterOfYear from 'dayjs/plugin/quarterOfYear';
import weekOfYear from 'dayjs/plugin/weekOfYear';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

import type {
  ExtraFilters,
  FiltersState,
  PeriodKey,
  RequestParams,
} from '@/shared/interface/filter';

dayjs.extend(quarterOfYear);
dayjs.extend(weekOfYear);

/* ====================== helpers ====================== */

const rangeFor = (k: PeriodKey): [Dayjs, Dayjs] | null => {
  switch (k) {
    case 'today':
      return [dayjs().startOf('day'), dayjs().endOf('day')];
    case 'yesterday': {
      const d = dayjs().subtract(1, 'day');
      return [d.startOf('day'), d.endOf('day')];
    }
    case 'week':
      return [dayjs().startOf('week'), dayjs().endOf('week')];
    case 'month':
      return [dayjs().startOf('month'), dayjs().endOf('month')];
    case 'quarter':
      return [dayjs().startOf('quarter'), dayjs().endOf('quarter')];
    case 'all':
    default:
      // ⬇️ для "Все отзывы" диапазон не выбран
      return null;
  }
};

const serializeRange = (r: [Dayjs, Dayjs] | null): [string, string] | null =>
  r ? [r[0].toISOString(), r[1].toISOString()] : null;

const parseRange = (r: [string, string] | null): [Dayjs, Dayjs] | null =>
  r ? ([dayjs(r[0]), dayjs(r[1])] as [Dayjs, Dayjs]) : null;

/* ====================== types ====================== */

type FiltersStore = {
  value: FiltersState;

  /** Стор уже загружен из storage */
  isHydrated: boolean;

  /** Дефолты уже применяли (чтобы не повторять) */
  initializedWithDefaults: boolean;

  /** Пользователь менял фильтры (период/диапазон/extra) */
  userTouched: boolean;

  /** Установить предустановленный период (авто-расчёт range) */
  setPeriod: (p: PeriodKey) => void;

  /** Установить произвольный диапазон (период становится 'all') */
  setRange: (r: [Dayjs, Dayjs] | null) => void;

  /** Частично обновить дополнительные фильтры */
  setExtra: (e: Partial<ExtraFilters>) => void;

  /** Сбросить всё к дефолтам */
  reset: () => void;

  /** Подготовить параметры запроса на бэкенд */
  selectRequestParams: () => RequestParams;

  /**
   * Применить дефолтный диапазон дат, полученный с бэка.
   * Теперь НЕ подставляет диапазон, а только помечает, что дефолт обработан.
   */
  applyDefaultDates: (args: {
    defaultMin?: string;
    defaultMax?: string;
    min?: string;
    max?: string;
  }) => void;
};

/* ====================== persist shapes ====================== */

type StoredFiltersValue = {
  period: PeriodKey;
  range: [string, string] | null;
  extra: ExtraFilters;
};

type StoredState = {
  value: StoredFiltersValue;
  initializedWithDefaults: boolean;
  userTouched: boolean;
};

/* ====================== constants ====================== */

const STORAGE_KEY = 'global-filters-v1';
// Keep only filters supported by OpenAPI in ExtraFilters: services, rating, text, tags
const DEFAULT_EXTRA: ExtraFilters = { services: [], rating: 0, text: '', tags: [] };

/* ====================== store ====================== */

export const useFiltersStore = create<FiltersStore>()(
  persist(
    (set, get) => ({
      // Стартуем ровно с "Все отзывы": period = 'all', range = null
      // Start with default period 'custom' and explicit default date range
      value: {
        period: 'custom',
        range: [dayjs('2024-01-01').startOf('day'), dayjs('2025-05-31').endOf('day')],
        extra: { ...DEFAULT_EXTRA },
      },
      isHydrated: false,
      initializedWithDefaults: false,
      userTouched: false,

      setPeriod: (p) =>
        set((s) => {
          // для 'all' очищаем диапазон; для остальных считаем rangeFor(p)
          const nextRange = p === 'all' ? null : rangeFor(p);
          return {
            value: { ...s.value, period: p, range: nextRange },
            userTouched: true,
          };
        }),

      setRange: (r) =>
        set((s) => ({
          // при ручном выборе диапазона период становится 'all'
          value: { ...s.value, period: 'all', range: r },
          userTouched: true,
        })),

      setExtra: (e) =>
        set((s) => ({
          value: { ...s.value, extra: { ...s.value.extra, ...e } },
          userTouched: true,
        })),

      reset: () =>
        set(() => ({
          value: { period: 'all', range: null, extra: { ...DEFAULT_EXTRA } },
          userTouched: false,
          initializedWithDefaults: false,
        })),

      selectRequestParams: () => {
        const { period, range, extra } = get().value;
        return {
          period,
          from: range?.[0]?.toISOString(),
          to: range?.[1]?.toISOString(),
          extra,
        };
      },

      applyDefaultDates: () => {
        // 🔸 Раньше тут проставляли дефолтный диапазон.
        // Теперь — только отмечаем, что дефолт обработан,
        // чтобы оставить календарь пустым (все даты).
        const { isHydrated, initializedWithDefaults, userTouched } = get();
        if (!isHydrated) return;
        if (initializedWithDefaults || userTouched) return;
        set(() => ({ initializedWithDefaults: true }));
      },
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage<StoredState>(() => localStorage),

      partialize: (s): StoredState => ({
        value: {
          period: s.value.period,
          range: serializeRange(s.value.range ?? null),
          extra: s.value.extra,
        },
        initializedWithDefaults: s.initializedWithDefaults,
        userTouched: s.userTouched,
      }),

      onRehydrateStorage: () => (state) => {
        if (!state) return;

        try {
          const storedValue = state.value as unknown as StoredFiltersValue | undefined;
          if (storedValue) {
            const nextValue: FiltersState = {
              period: storedValue.period ?? 'all',
              range: parseRange(storedValue.range ?? null), // если null — календарь пуст
              extra: storedValue.extra ?? { ...DEFAULT_EXTRA },
            };
            state.value = nextValue;
          }

          if (typeof state.initializedWithDefaults !== 'boolean') {
            state.initializedWithDefaults = false;
          }
          if (typeof state.userTouched !== 'boolean') {
            state.userTouched = false;
          }
        } finally {
          // стор готов: можно доверять данным
          state.isHydrated = true;
        }
      },
    },
  ),
);

/* ===== удобный хелпер ===== */
export const useFiltersHydrated = (): boolean => useFiltersStore((s) => s.isHydrated);
