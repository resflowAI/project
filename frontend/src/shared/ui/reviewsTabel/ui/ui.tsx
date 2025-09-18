// src/shared/ui/reviewsTabel/index.tsx
'use client';

import React, { useMemo, useState, useCallback } from 'react';
import { Table, Tag, Tooltip, Typography, Button } from 'antd';
import { RightOutlined, DownOutlined } from '@ant-design/icons';
import type { ColumnsType, TableProps } from 'antd/es/table';
import dayjs from 'dayjs';
import 'dayjs/locale/ru';

import styles from './ui.module.scss';
import type { BackendErrorResponse, CommentRow, OrderDir } from '@/shared/interface/reviews';
import { ExportCsvButton } from '@/shared/ui/exportCsv';

export type CommentsTableProps = {
  rows: CommentRow[];
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number, pageSize: number) => void;
  loading?: boolean;
  pageSizeOptions?: number[];
  validationError?: BackendErrorResponse | null;

  dateOrder?: OrderDir;
  ratingOrder?: OrderDir;
  onSortChange?: (next: { date_order?: OrderDir; rating_order?: OrderDir }) => void;
};

const sentimentToColor = (v: number): string => (v > 0 ? 'green' : v < 0 ? 'red' : 'default');

const renderTags = (tags?: Record<string, number>) => {
  if (!tags || Object.keys(tags).length === 0) return '—';
  const entries = Object.entries(tags);
  const head = entries.slice(0, 3);
  const rest = entries.slice(3);

  return (
    <span className={styles.tagsCell}>
      {head.map(([name, val]) => (
        <Tag key={name} color={sentimentToColor(val)}>
          {name}
        </Tag>
      ))}
      {rest.length > 0 && (
        <Tooltip
          title={
            <div className={styles.tagsTooltip}>
              {rest.map(([name, val]) => (
                <div key={name}>
                  <Tag color={sentimentToColor(val)}>{name}</Tag>
                </div>
              ))}
            </div>
          }
        >
          <Tag>+{rest.length}</Tag>
        </Tooltip>
      )}
    </span>
  );
};

export const CommentsTable: React.FC<CommentsTableProps> = ({
  rows,
  total,
  page,
  pageSize,
  onPageChange,
  loading = false,
  pageSizeOptions = [20, 50, 100],
  dateOrder,
  ratingOrder,
  onSortChange,
}) => {
  // контролируем раскрытые строки
  const [expandedRowKeys, setExpandedRowKeys] = useState<React.Key[]>([]);

  const toggleRow = useCallback((key: React.Key) => {
    setExpandedRowKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  }, []);

  const columns = useMemo<ColumnsType<CommentRow>>(() => {
    const base: ColumnsType<CommentRow> = [
      {
        title: 'Дата',
        dataIndex: 'date',
        key: 'date',
        width: 110,
        render: (v: string) => dayjs(v).format('DD.MM.YYYY'),
        sortOrder: dateOrder ? (dateOrder === 'ASC' ? 'ascend' : 'descend') : undefined,
        sorter: true,
      },
      {
        title: 'Теги',
        dataIndex: 'tags',
        key: 'tags',
        width: 280,
        render: (t?: Record<string, number>) => renderTags(t),
      },
      {
        title: 'Рейтинг',
        dataIndex: 'rating',
        key: 'rating',
        width: 90,
        render: (r?: number) => (typeof r === 'number' ? r.toFixed(1) : '—'),
        sortOrder: ratingOrder ? (ratingOrder === 'ASC' ? 'ascend' : 'descend') : undefined,
        sorter: true,
      },
      { title: 'Сервис', dataIndex: 'service', key: 'service', width: 160, ellipsis: true },
      {
        title: 'Автор',
        dataIndex: 'author',
        key: 'author',
        width: 160,
        ellipsis: true,
        render: (a?: string) =>
          a ? <Typography.Text ellipsis={{ tooltip: a }}>{a}</Typography.Text> : '—',
      },
      {
        title: 'Источник',
        dataIndex: 'source',
        key: 'source',
        width: 120,
        render: (s?: string) => (s ? <Tag>{s}</Tag> : '—'),
      },
      {
        title: 'Отзыв',
        dataIndex: 'text',
        key: 'text',
        className: styles.textCol,
        render: (t: string) => (
          <Typography.Paragraph className={styles.truncated} ellipsis={{ rows: 2, tooltip: t }}>
            {t}
          </Typography.Paragraph>
        ),
      },
      // 👉 новый последний столбец со стрелкой раскрытия
      {
        title: '',
        key: 'expand',
        fixed: 'right',
        width: 44,
        align: 'right',
        render: (_, record) => {
          const key = String(record.id ?? `${record.date}|${record.service ?? ''}`);
          const isOpen = expandedRowKeys.includes(key);
          return (
            <Button
              type="text"
              size="small"
              className={styles.expandBtn}
              onClick={(e) => {
                e.stopPropagation();
                toggleRow(key);
              }}
              icon={isOpen ? <DownOutlined /> : <RightOutlined />}
            />
          );
        },
      },
    ];
    return base;
  }, [dateOrder, ratingOrder, expandedRowKeys, toggleRow]);

  const handleChange: TableProps<CommentRow>['onChange'] = (_pagination, _filters, sorter) => {
    if (!onSortChange) return;
    const next: { date_order?: OrderDir; rating_order?: OrderDir } = {};
    const arr = Array.isArray(sorter) ? sorter : [sorter];
    arr.forEach((it) => {
      if (!it || typeof it !== 'object') return;
      const dir = it.order === 'ascend' ? 'ASC' : it.order === 'descend' ? 'DESC' : undefined;
      if (it.columnKey === 'date') next.date_order = dir;
      if (it.columnKey === 'rating') next.rating_order = dir;
    });
    onSortChange(next);
  };

  return (
    <div className={styles.wrap}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 8,
        }}
      >
        <div />
        <div>
          <ExportCsvButton endpoint={'/csv/data_table'} title="Скачать CSV" />
        </div>
      </div>
      <Table<CommentRow>
        rowKey={(r, idx) => String(r.id ?? `${r.date}|${r.service ?? ''}|${idx}`)}
        columns={columns}
        dataSource={rows}
        loading={loading}
        size="middle"
        bordered={false}
        onChange={handleChange}
        pagination={{
          current: page,
          pageSize,
          total,
          onChange: onPageChange,
          onShowSizeChange: onPageChange,
          showSizeChanger: true,
          showQuickJumper: true,
          pageSizeOptions: (pageSizeOptions ?? [20, 50, 100]).map(String),
          showTotal: (t, [start, end]) => `Показано ${start}–${end} из ${t}`,
        }}
        // выключаем стандартный плюсик слева, управляем сами
        expandable={{
          expandedRowRender: (record) => (
            <div className={styles.fullText}>
              <Typography.Text>{record.text}</Typography.Text>
            </div>
          ),
          rowExpandable: () => true,
          expandedRowKeys,
          onExpandedRowsChange: (keys) => setExpandedRowKeys(keys as React.Key[]),
          expandIcon: () => null, // << убрать плюс
          expandRowByClick: false, // кликаем только по кнопке-стрелке
        }}
        // кликом по строке тоже можно раскрывать — если нужно, раскомментируй:
        // onRow={(record) => {
        //   const key = String(record.id ?? `${record.date}|${record.service ?? ''}`);
        //   return { onClick: () => toggleRow(key) };
        // }}
      />
    </div>
  );
};
