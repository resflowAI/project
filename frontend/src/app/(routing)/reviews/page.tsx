// src/app/page.tsx (или ваш маршрут)
'use client';

import React, { useMemo, useState } from 'react';
import { Input, Space, Button } from 'antd';
import { CommentsTable } from '@/shared/ui/reviewsTabel';
import type { CommentTableQuery, CommentRow } from '@/shared/interface/reviews';
import { useCommentsTable } from './api/useCommentsTable';
import { useCommentsCount } from './api/useCommentsCount';

// небольшой debounce
function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = React.useState<T>(value);
  React.useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

type BackendArrayItem = {
  text: string;
  rating?: number;
  tags?: Record<string, number>;
  service?: string;
  date: string;
  name?: string;
};
const isBackendArray = (a: unknown): a is BackendArrayItem[] =>
  Array.isArray(a) && a.every((x) => x && typeof x === 'object' && 'text' in x && 'date' in x);

export default function Home() {
  const [query, setQuery] = useState<CommentTableQuery>({
    limit: 50,
    offset: 0,
    text: '',
    date_order: 'DESC',
    rating_order: 'DESC',
  });
  const debouncedText = useDebounce(query.text ?? '', 500);

  // квери, уходящее в API
  const effectiveQuery: CommentTableQuery = useMemo(
    () => ({ ...query, text: debouncedText.trim() || undefined }),
    [query, debouncedText],
  );

  // данные таблицы (с пагинацией limit/offset)
  const { data, isLoading, validation, mutate } = useCommentsTable(effectiveQuery);

  // количество строк (без пагинации, но с фильтрами)
  const { total } = useCommentsCount(effectiveQuery);

  // нормализация массива/объекта ответа
  const rows: CommentRow[] = useMemo(() => {
    if (isBackendArray(data)) {
      return data.map((r, i) => ({
        id: `${r.date}|${r.service ?? ''}|${i}`,
        date: r.date,
        rating: r.rating,
        service: r.service,
        author: r.name,
        source: r.service,
        text: r.text,
        tags: r.tags, // 👈 просто прокидываем
      }));
    }
    return (data?.rows ?? []).map((r, i) => ({
      ...r,
      id: r.id ?? `${r.date}|${r.service ?? ''}|${i}`,
      // если сервер уже прислал tags — тоже попадут
    }));
  }, [data]);

  const limit = effectiveQuery.limit ?? 50;
  const page = Math.floor((effectiveQuery.offset ?? 0) / limit) + 1;

  return (
    <div style={{ padding: 16, display: 'grid', gap: 12 }}>
      <Space wrap>
        <Input.Search
          allowClear
          placeholder="Поиск в тексте отзыва…"
          enterButton="Искать"
          value={query.text ?? ''}
          onChange={(e) => setQuery((prev) => ({ ...prev, text: e.target.value }))}
          onSearch={(v) => setQuery((prev) => ({ ...prev, text: v, offset: 0 }))}
          style={{ width: 360 }}
        />
        <Button onClick={() => mutate()} disabled={isLoading}>
          Обновить
        </Button>
      </Space>

      <CommentsTable
        rows={rows}
        total={total}
        page={page}
        pageSize={limit}
        loading={isLoading}
        validationError={validation}
        pageSizeOptions={[20, 50, 100]}
        dateOrder={query.date_order}
        ratingOrder={query.rating_order}
        onPageChange={(p, size) =>
          setQuery((prev) => ({ ...prev, limit: size, offset: (p - 1) * size }))
        }
        onSortChange={(next) =>
          setQuery((prev) => ({
            ...prev,
            // переключаем серверные сортировки
            date_order: next.date_order,
            rating_order: next.rating_order,
            offset: 0, // сбрасываем на первую страницу
          }))
        }
      />
    </div>
  );
}
