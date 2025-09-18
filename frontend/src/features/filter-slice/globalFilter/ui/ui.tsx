'use client';

import React, { useMemo, useState } from 'react';
import dayjs, { Dayjs } from 'dayjs';
import 'dayjs/locale/ru';
import useSWR, { useSWRConfig } from 'swr';
import {
  Button,
  DatePicker,
  Tooltip,
  message,
  Modal,
  Upload,
  Radio,
  Space,
  Divider,
  Table,
  Checkbox,
  Tag,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  CloudUploadOutlined,
  DatabaseOutlined,
  DownOutlined,
  InboxOutlined,
} from '@ant-design/icons';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import styles from './ui.module.scss';

import type { PeriodKey } from '@/shared/interface/filter';
import { useFiltersStore } from '@/shared/filterStore/model/store';
import { DrawerFilters } from '@/entities/filter-slice/drawerFilters';
import type { Props, RangeValue } from '../types';
import { useSourceStore } from '../../jsonUpload/model/sourceStore';
import type { UploadItem, UploadPayload } from '@/shared/interface/jsonUpload';
import { uploadJson } from '@/shared/ui/jsonUploadModal/api';

/* ============ types for /filter/available_filter_values ============ */
type LabeledValue = { label: string; value: string };
type Group = { label: string; options: LabeledValue[] };

type AvailableFilterValues = {
  banks: Group[];
  services: Group[];
  ratings: { min: number; max: number };
  dates: {
    min: string;
    max: string;
    default_min?: string;
    default_max?: string;
  };
};

type ApiEnvelope<T> = { id: string; value: T };

const fmtRu = (d: Dayjs, mask: string) => d.locale('ru').format(mask);

/* =================== JSON upload helpers =================== */

const { Dragger } = Upload;

const isJsonFile = (file: File) =>
  file.type === 'application/json' || file.name.toLowerCase().endsWith('.json');

function mergeById(a: UploadItem[], b: UploadItem[]): UploadItem[] {
  const m = new Map<number, UploadItem>();
  for (const it of a) m.set(it.id, it);
  for (const it of b) m.set(it.id, it);
  return Array.from(m.values());
}

function normalizePayload(json: unknown): UploadItem[] {
  const raw = Array.isArray(json) ? json : (json as { data?: unknown })?.data;
  if (!Array.isArray(raw)) throw new Error('Ожидается массив или {"data":[...]}');

  const out: UploadItem[] = [];
  for (const it of raw) {
    if (typeof it !== 'object' || it === null)
      throw new Error('Каждый элемент должен быть объектом');
    const id = (it as Record<string, unknown>)['id'];
    const text = (it as Record<string, unknown>)['text'];
    if (!Number.isInteger(id as number))
      throw new Error('Каждый элемент должен иметь целочисленный "id"');
    if (typeof text !== 'string') throw new Error('Каждый элемент должен иметь строковый "text"');
    out.push({ id: id as number, text: text as string });
  }
  return out;
}

async function readFileAsItems(file: File): Promise<UploadItem[]> {
  const txt = await file.text();
  const json = JSON.parse(txt) as UploadPayload;
  return normalizePayload(json);
}

/* =================== component =================== */
export const GlobalFilter: React.FC<Props> = ({ syncUrl = true, className }) => {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const { value, setPeriod, setRange } = useFiltersStore();

  // Источники (используются в хук-запросах → ?source=)
  const sources = useSourceStore((s) => s.sources);
  const setSources = useSourceStore((s) => s.setSources);
  const lastUploadAt = useSourceStore((s) => s.lastUploadAt);
  const lastUploadCount = useSourceStore((s) => s.lastUploadCount);

  // Drawer & RangePicker state (вернул отсутствующие)
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [openRange, setOpenRange] = useState(false);

  /* -------- URL → store (однократно) -------- */
  React.useEffect(() => {
    if (!syncUrl) return;
    const p = params.get('p') as PeriodKey | null;
    const from = params.get('from');
    const to = params.get('to');
    if (p && p !== value.period) setPeriod(p);
    if (from && to) setRange([dayjs(from), dayjs(to)]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* -------- доступные значения фильтров -------- */
  const { data: availableResp, isLoading: filtersLoading } = useSWR<
    ApiEnvelope<AvailableFilterValues>
  >('/filter/available_filter_values', null);
  const available = availableResp?.value;

  // URL -> store (однократно)
  React.useEffect(() => {
    if (!syncUrl) return;

    const p = params.get('p') as PeriodKey | null;
    const from = params.get('from');
    const to = params.get('to');

    // 1) если явно указано p=all — очищаем диапазон и чистим URL
    if (p === 'all') {
      if (value.period !== 'all') setPeriod('all');
      if (value.range !== null) setRange(null);

      // чистим from/to в URL, чтобы не проставлялись снова
      if (from || to) {
        const q = new URLSearchParams(params.toString());
        q.delete('from');
        q.delete('to');
        router.replace(`${pathname}?${q.toString()}`, { scroll: false });
      }
      return;
    }

    // 2) если параметр p вообще не задан — ничего не читаем из from/to
    if (!p) {
      // миграция: вдруг в сторе остался range при period=all (после прошлых заходов)
      if (value.period === 'all' && value.range !== null) {
        setRange(null);
      }
      return;
    }

    // 3) во всех остальных случаях (p != 'all') можно подхватить from/to
    if (p && p !== value.period) setPeriod(p);
    if (from && to) {
      setRange([dayjs(from), dayjs(to)]);
    } else {
      // если дат нет — очищаем range, чтобы календарь не показывался
      setRange(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* -------- пресеты -------- */
  const presets = useMemo(
    () =>
      [
        { key: 'all', label: 'Все отзывы' },
        { key: 'week', label: 'Неделя' },
        { key: 'month', label: 'Месяц' },
        { key: 'quarter', label: 'Квартал' },
      ] as const,
    [],
  );

  /* -------- URL <- store -------- */
  const pushUrl = (k?: PeriodKey, r?: [Dayjs, Dayjs] | null) => {
    if (!syncUrl) return;
    const q = new URLSearchParams(params.toString());
    if (k) q.set('p', k);
    if (r && r[0] && r[1]) {
      q.set('from', r[0].toISOString());
      q.set('to', r[1].toISOString());
    } else {
      q.delete('from');
      q.delete('to');
    }
    router.replace(`${pathname}?${q.toString()}`, { scroll: false });
  };

  const onPresetClick = (k: PeriodKey) => {
    setPeriod(k);
    pushUrl(k, k === 'all' ? null : undefined);
  };

  /* -------- подпись диапазона -------- */
  const rangeLabel = useMemo(() => {
    if (!value.range) return 'Диапазон';
    const [from, to] = value.range;
    const sameMonth = from.isSame(to, 'month') && from.isSame(to, 'year');
    return sameMonth
      ? `${fmtRu(from, 'D')}–${fmtRu(to, 'D MMM')}`
      : `${fmtRu(from, 'D MMM')} – ${fmtRu(to, 'D MMM')}`;
  }, [value.range]);

  /* -------- модалка загрузки JSON -------- */
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadItems, setUploadItems] = useState<UploadItem[]>([]);
  const [uploadDate, setUploadDate] = useState<string | null>(null);
  const [mergeMode, setMergeMode] = useState<'replace' | 'append'>('replace');
  const [sending, setSending] = useState(false);
  const { mutate: mutateAll } = useSWRConfig();

  const openUpload = () => setUploadOpen(true);
  const closeUpload = () => {
    setUploadOpen(false);
    setUploadItems([]);
    setUploadDate(null);
    setMergeMode('replace');
    setSending(false);
  };

  const dragProps: React.ComponentProps<typeof Dragger> = {
    multiple: true,
    accept: '.json,application/json',
    beforeUpload: async (file) => {
      if (!isJsonFile(file)) {
        message.error(`Файл ${file.name} не похож на JSON`);
        return Upload.LIST_IGNORE;
      }
      try {
        const part = await readFileAsItems(file);
        setUploadItems((prev) => (mergeMode === 'append' ? mergeById(prev, part) : part));
        message.success(`Добавлено: ${part.length}`);
      } catch (e: unknown) {
        const msg =
          typeof e === 'object' &&
          e !== null &&
          'message' in e &&
          typeof (e as { message?: unknown }).message === 'string'
            ? ((e as { message?: string }).message as string)
            : String(e);
        message.error(msg || 'Ошибка чтения файла');
      }
      return Upload.LIST_IGNORE;
    },
  };

  const isUploadDateSelected = Boolean(uploadDate);

  const submitUpload = async () => {
    if (uploadItems.length === 0 || !uploadDate) return;

    setSending(true);
    try {
      const { status, detail } = await uploadJson(uploadItems, {
        uploadingDate: uploadDate,
      });

      if (status === 'successfull') {
        message.success('JSON загружен и поставлен в обработку');
        if (!sources.includes('uploading')) setSources([...sources, 'uploading']);
        useSourceStore.getState().setLastUploadMeta(uploadItems.length);
        closeUpload();
      } else {
        message.error(detail || 'Ошибка загрузки JSON');
      }
    } catch (e: unknown) {
      const msg =
        typeof e === 'object' &&
        e !== null &&
        'message' in e &&
        typeof (e as { message?: unknown }).message === 'string'
          ? ((e as { message?: string }).message as string)
          : String(e);
      message.error(msg || 'Ошибка загрузки JSON');
    } finally {
      setSending(false);
    }
  };
  const cols: ColumnsType<UploadItem> = [
    { title: 'ID', dataIndex: 'id', width: 96 },
    { title: 'Текст', dataIndex: 'text' },
  ];
  /* -------- render -------- */
  return (
    <div className={[styles.wrap, className, styles.scrollRow].filter(Boolean).join(' ')}>
      {/* левая часть */}
      <div className={[styles.left, styles.rowItem].join(' ')}>
        <div className={styles.items_wrap}>
          {presets.map((p) => (
            <button
              key={p.key}
              type="button"
              className={[styles.chip, value.period === p.key ? styles.chipActive : ''].join(' ')}
              onClick={() => onPresetClick(p.key as PeriodKey)}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Диапазон дат */}
        <button
          type="button"
          className={[styles.chipAlt, styles.rowItem].join(' ')}
          onClick={() => setOpenRange(true)}
          aria-haspopup="dialog"
          aria-expanded={openRange}
          aria-controls="gf-range-picker"
        >
          {rangeLabel} <DownOutlined className={styles.icon} />
        </button>

        <DatePicker.RangePicker
          id="gf-range-picker"
          value={(value.range ?? null) as RangeValue}
          open={openRange}
          onOpenChange={(o) => setOpenRange(o)}
          onChange={(v: RangeValue) => {
            const next = v && v[0] && v[1] ? ([v[0], v[1]] as [Dayjs, Dayjs]) : null;
            setRange(next);
            pushUrl('all', next);
          }}
          format="DD.MM.YYYY"
          allowClear
          style={{ width: 0, opacity: 0, position: 'absolute' }}
          getPopupContainer={() => document.body}
        />

        <button
          type="button"
          className={[styles.chipAlt, styles.rowItem].join(' ')}
          onClick={() => setDrawerOpen(true)}
        >
          Ещё фильтры
        </button>
      </div>

      {/* правая часть */}
      <div className={[styles.right, styles.rowItem].join(' ')}>
        <div className={styles.sourceControls}>
          <Tooltip title="Загрузить локальный JSON и отправить на бэкенд">
            <span className={styles.uploadBtn}>
              <Button type="default" icon={<CloudUploadOutlined />} onClick={openUpload}>
                Загрузить JSON
              </Button>
            </span>
          </Tooltip>

          <Tooltip title="Какие источники данных использовать во всех графиках">
            <div className={styles.modeSwitch}>
              <DatabaseOutlined style={{ marginRight: 4 }} />
              <span className={styles.modeLabel}>Источник</span>
              <Checkbox.Group
                style={{ marginLeft: 8 }}
                value={sources}
                onChange={(v) => {
                  const arr = v as ('parsing' | 'uploading')[];
                  if (arr.length === 0) return; // оставляем хотя бы один источник
                  setSources(arr);
                  mutateAll(() => true, undefined, { revalidate: true });
                }}
                options={[
                  { label: 'Парсинг', value: 'parsing' },
                  { label: 'JSON', value: 'uploading' },
                ]}
              />
            </div>
          </Tooltip>

          {lastUploadAt && (
            <Tag color="green" style={{ marginLeft: 8 }}>
              JSON: {lastUploadCount ?? '—'} • {new Date(lastUploadAt).toLocaleString()}
            </Tag>
          )}
        </div>
      </div>

      <DrawerFilters
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onApply={() => {}}
        banksGroups={available?.banks ?? []}
        serviceGroups={available?.services ?? []}
        ratingsRange={available?.ratings ?? { min: 0, max: 5 }}
        loading={filtersLoading}
      />

      {/* Модалка загрузки JSON */}

      <Modal
        open={uploadOpen}
        onCancel={closeUpload}
        onOk={submitUpload}
        okText="Отправить"
        okButtonProps={{ disabled: !uploadItems.length || !isUploadDateSelected, loading: sending }}
        title="Загрузка JSON"
        width={860}
        destroyOnHidden
        // ограничиваем высоту ТЕЛА модалки, чтобы она не «нарастала»
        styles={{ body: { maxHeight: 560 } }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1.1fr',
            gap: 16,
            alignItems: 'start',
          }}
        >
          {/* левая колонка с Dragger и настройками — как было */}
          <div>
            <Dragger {...dragProps}>
              <p className="ant-upload-drag-icon">
                <InboxOutlined />
              </p>
              <p className="ant-upload-text">Перетащите .json файлы сюда или нажмите</p>
              <p className="ant-upload-hint">
                Формат: массив <code>{'{ id:number, text:string }'}</code> или объект{' '}
                <code>{'{"data":[...]}'}</code>
              </p>
            </Dragger>
            <Divider style={{ margin: '16px 0' }} />
            <Space direction="vertical" size={12}>
              <span className={styles.modeLabel}>Как добавлять в очередь:</span>
              <Radio.Group
                optionType="button"
                buttonStyle="solid"
                value={mergeMode}
                onChange={(e) => setMergeMode(e.target.value)}
                options={[
                  { label: 'Заменить', value: 'replace' },
                  { label: 'Добавить', value: 'append' },
                ]}
              />

              <span className={styles.modeLabel}>Дата загрузки:</span>
              <DatePicker
                allowClear
                value={uploadDate ? dayjs(uploadDate, 'YYYY-MM-DD') : null}
                onChange={(value) => setUploadDate(value ? value.format('YYYY-MM-DD') : null)}
                format="DD.MM.YYYY"
                placeholder="Дата обработки"
                style={{ width: '100%' }}
              />
            </Space>
          </div>

          {/* правая колонка — предпросмотр и чекбоксы источников */}
          <div>
            <Space direction="vertical" size={12} style={{ width: '100%' }}>
              <span className={styles.modeLabel}>Предпросмотр ({uploadItems.length})</span>

              {/* ВАЖНО: фиксируем высоту и скроллим ТОЛЬКО таблицу */}
              <div style={{ height: 360, overflowY: 'auto' }}>
                <Table<UploadItem>
                  size="small"
                  rowKey="id"
                  dataSource={uploadItems}
                  columns={cols}
                  pagination={false} // отключаем, пусть скроллится
                  sticky
                />
              </div>

              <Divider style={{ margin: '12px 0' }} />

              <span className={styles.modeLabel}>После загрузки использовать источники:</span>
              <Checkbox.Group
                value={sources}
                onChange={(v) => {
                  const arr = v as ('parsing' | 'uploading')[];
                  if (arr.length === 0) return;
                  setSources(arr);
                }}
                options={[
                  { label: 'Парсинг', value: 'parsing' },
                  { label: 'JSON', value: 'uploading' },
                ]}
              />
            </Space>
          </div>
        </div>
      </Modal>
    </div>
  );
};
