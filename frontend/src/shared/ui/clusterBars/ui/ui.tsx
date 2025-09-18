'use client';

import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LabelList,
} from 'recharts';
import { Card } from 'antd';
import 'dayjs/locale/ru';

import styles from './ui.module.scss';
import { ExportCsvButton } from '@/shared/ui/exportCsv';
import type { ClusterBarRow, ClusterBarsResponse } from '@/shared/interface/clusterBars';

type Props = {
  payload: ClusterBarsResponse;
  height?: number;
  seriesLabels?: Record<string, string>;
  seriesColors?: Record<string, string>;
  stacked?: boolean; // если true — рисуем один стэк на категорию
  normalize100?: boolean; // если true — нормализуем доли к 100%
  maxBars?: number; // ограничение по количеству столбиков
};

/* ===== Константы по умолчанию ===== */
const DEFAULT_COLORS: Record<string, string> = {
  positive: '#2DB67C',
  neutral: '#8C8C8C',
  negative: '#D4380D',
  mentions: '#0057B6',
};
const DEFAULT_LABELS: Record<string, string> = {
  positive: 'Позитивные',
  neutral: 'Нейтральные',
  negative: 'Негативные',
  mentions: 'Упоминания',
};

/* ===== Утилиты ===== */
const toNum = (v: unknown): number => (typeof v === 'number' ? v : Number(v ?? 0));

/** Есть ли хотя бы в одной строке ненулевая сумма по выбранным сериям */
const hasPositiveTotals = (rows: ClusterBarRow[], keys: string[]) =>
  rows.some((r) => keys.reduce((acc, k) => acc + (Number(r[k] ?? 0) || 0), 0) > 0);

/** Формат верхних подписей (абсолюты) */
const formatTopLabel = (label: React.ReactNode) => {
  if (typeof label === 'number') return label.toLocaleString('ru-RU');
  if (typeof label === 'string') {
    const n = Number(label);
    return Number.isFinite(n) ? n.toLocaleString('ru-RU') : label;
  }
  return '';
};

/** Нормализация к 100% с подгонкой суммы */
function normalizeRowsTo100(
  rows: ClusterBarRow[],
  keys: string[],
  precision = 10, // precision=10 => шаг 0.1%
): ClusterBarRow[] {
  return rows.map<ClusterBarRow>((row) => {
    const total = keys.reduce((acc, k) => acc + (Number(row[k] ?? 0) || 0), 0);
    if (!total) return { ...row };

    const next: ClusterBarRow = { ...row };

    // сырые проценты
    const raw = keys.map((k) => ((Number(row[k] ?? 0) || 0) / total) * 100);
    if (raw.length === 0) return next; // safety

    // округляем
    const rounded = raw.map((v) => Math.round(v * precision) / precision);
    const sumRounded = rounded.reduce((a, b) => a + b, 0);
    const diff = Math.round((100 - sumRounded) * precision) / precision;

    if (Math.abs(diff) > 0) {
      // ищем индекс максимального
      let idxMax = 0;
      let maxVal = -Infinity;
      for (let i = 0; i < rounded.length; i++) {
        const val = rounded[i] as number; // TS теперь уверен
        if (val > maxVal) {
          maxVal = val;
          idxMax = i;
        }
      }

      // тут TS понимает, что rounded[idxMax] точно есть
      const adjusted = (rounded[idxMax] ?? 0) + diff;
      rounded[idxMax] = Math.max(0, Math.min(100, Math.round(adjusted * precision) / precision));
    }

    keys.forEach((k, i) => {
      next[k] = rounded[i] ?? 0; // всегда число
    });

    return next;
  });
}

/* ===== Кастомный тултип ===== */
type RTItem = { dataKey: string; value: number; payload: ClusterBarRow };
const CustomTooltip: React.FC<{
  active?: boolean;
  payload?: RTItem[];
  label?: string | number;
  labels: Record<string, string>;
  colors: Record<string, string>;
  isPercent: boolean;
}> = ({ active, payload, label, labels, colors, isPercent }) => {
  if (!active || !payload?.length) return null;

  const byKey = (key: string) => toNum(payload.find((x) => x.dataKey === key)?.value);
  const row = payload[0]?.payload;

  const mentions = toNum(row?.mentions);
  const pos = byKey('positive');
  const neu = byKey('neutral');
  const neg = byKey('negative');

  const deltaRel = toNum((row && (row as Record<string, unknown>)['deltaRel']) ?? 0);
  const arrow = deltaRel > 0 ? '▲' : deltaRel < 0 ? '▼' : '•';
  const deltaColor = deltaRel > 0 ? '#2DB67C' : deltaRel < 0 ? '#D4380D' : '#8C8C8C';

  const fmt = (v: number) => (isPercent ? `${v.toFixed(1)}%` : v.toLocaleString('ru-RU'));

  return (
    <div className={styles.tooltip}>
      <div className={styles.tTitle}>{String(label)}</div>

      <div className={styles.tRow}>
        <span className={styles.dot} style={{ background: colors.positive }} />
        <span>{labels.positive}</span>
        <span className={styles.value}>{fmt(pos)}</span>
      </div>
      <div className={styles.tRow}>
        <span className={styles.dot} style={{ background: colors.neutral }} />
        <span>{labels.neutral}</span>
        <span className={styles.value}>{fmt(neu)}</span>
      </div>
      <div className={styles.tRow}>
        <span className={styles.dot} style={{ background: colors.negative }} />
        <span>{labels.negative}</span>
        <span className={styles.value}>{fmt(neg)}</span>
      </div>

      <div className={styles.tSep} />

      <div className={styles.tRow}>
        <span className={styles.dot} style={{ background: colors.mentions }} />
        <span>{labels.mentions}</span>
        <span className={styles.value}>{mentions.toLocaleString('ru-RU')}</span>
      </div>

      <div className={styles.tSep} />
      <div className={styles.delta} style={{ color: deltaColor }}>
        <span className={styles.deltaArrow}>{arrow}</span>
        <span>
          Динамика: {deltaRel > 0 ? '+' : ''}
          {(deltaRel * 100).toFixed(2)}%
        </span>
      </div>
    </div>
  );
};

/* ===== Компонент ===== */
export const ClusterBars: React.FC<Props> = ({
  payload,
  height = 320,
  seriesLabels,
  seriesColors,
  stacked,
  normalize100,
  maxBars,
}) => {
  const {
    title,
    data,
    barKeys: barKeysFromPayload,
    stacked: payloadStacked = true,
    normalize100: payloadNormalize = false,
  } = payload;

  // barKeys: берём из payload или определяем по данным
  const resolvedBarKeys = useMemo<string[]>(() => {
    const explicit = (
      Array.isArray(barKeysFromPayload) ? barKeysFromPayload.filter(Boolean) : []
    ) as string[];
    if (explicit.length) return explicit;
    const sentiment = ['positive', 'neutral', 'negative'].filter((k) =>
      data.some((row) => typeof row[k] === 'number' && Number(row[k]) !== 0),
    );
    return sentiment.length ? sentiment : ['mentions'];
  }, [barKeysFromPayload, data]);

  const labels = { ...DEFAULT_LABELS, ...(seriesLabels ?? {}) };
  const colors = { ...DEFAULT_COLORS, ...(seriesColors ?? {}) };

  const isStacked = stacked ?? payloadStacked; // нам нужен один стэк на категорию
  const canNormalize = hasPositiveTotals(data, resolvedBarKeys);
  const isNormalize100 = (normalize100 ?? payloadNormalize) && canNormalize;

  // сортируем по mentions и берём топ-N
  const sorted = useMemo<ClusterBarRow[]>(
    () =>
      [...data]
        .sort((a, b) => toNum(b.mentions) - toNum(a.mentions))
        .slice(0, maxBars ?? data.length),
    [data, maxBars],
  );

  // нормализация/данные для графика
  const chartData = useMemo<ClusterBarRow[]>(() => {
    if (!isNormalize100) return sorted;
    return normalizeRowsTo100(sorted, resolvedBarKeys, 10); // 0.1% шаг
  }, [sorted, resolvedBarKeys, isNormalize100]);

  if (!resolvedBarKeys.length) {
    return (
      <Card className={styles.card} title={title}>
        <div style={{ padding: 16, color: '#7d7f88' }}>Нет данных для отображения</div>
      </Card>
    );
  }

  // Основная ось (проценты или авто)
  const yDomain = isNormalize100 ? [0, 100] : (['auto', 'auto'] as [string, string]);
  const ABS_AXIS_ID = 'abs'; // скрытая ось для абсолютов (LabelList с mentions)

  return (
    <Card
      className={styles.card}
      title={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>{title}</div>
          <div>
            <ExportCsvButton endpoint={'/csv/histogram'} title="Скачать CSV" />
          </div>
        </div>
      }
    >
      <div style={{ width: '100%', height }}>
        <ResponsiveContainer>
          <BarChart
            data={chartData}
            margin={{ top: 0, right: 24, bottom: 0, left: 10 }}
            barGap={4}
            barCategoryGap="20%"
            stackOffset="none" // мы сами нормализуем, expand не нужен
          >
            <CartesianGrid strokeDasharray="4 6" vertical={false} stroke="#e9e9ef" />

            <XAxis
              dataKey="name"
              tick={{ fontSize: 12, fill: '#7d7f88' }}
              tickMargin={8}
              interval={0}
            />

            <YAxis
              domain={yDomain}
              tickFormatter={(v: number) => (isNormalize100 ? `${v}%` : String(v))}
              tick={{ fontSize: 12, fill: '#7d7f88' }}
              width={isNormalize100 ? 40 : 48}
            />
            {/* скрытая ось для абсолютных mentions, чтобы не раздувать проценты */}
            {isNormalize100 && <YAxis yAxisId={ABS_AXIS_ID} hide domain={['auto', 'auto']} />}

            <Tooltip
              content={<CustomTooltip labels={labels} colors={colors} isPercent={isNormalize100} />}
            />

            <Legend
              verticalAlign="top"
              align="right"
              iconType="circle"
              wrapperStyle={{ paddingBottom: 8 }}
              formatter={(value: string) => labels[value] ?? value}
            />

            {/* Один стэк-бар на категорию, разрезанный на сегменты */}
            {resolvedBarKeys.map((key) => (
              <Bar
                key={key}
                dataKey={key}
                stackId={isStacked ? 's' : undefined} // стэковый столбик
                fill={colors[key] ?? '#ccc'}
                radius={0}
                isAnimationActive={false}
                name={labels[key] ?? key}
              />
            ))}

            {/* Верхние подписи с абсолютами (на скрытой оси) */}
            <Bar
              dataKey="mentions"
              fill="transparent"
              isAnimationActive={false}
              yAxisId={isNormalize100 ? ABS_AXIS_ID : undefined}
            >
              <LabelList
                dataKey="mentions"
                position="top"
                formatter={formatTopLabel}
                className={styles.topLabel}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};
