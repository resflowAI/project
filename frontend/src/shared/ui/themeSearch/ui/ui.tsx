'use client';

import React, { useMemo } from 'react';
import { Input, Button, Card, Skeleton } from 'antd';
import { KpiCard } from '@/entities/graphics-slice/kpiCard';
import { WordCloud } from '@/shared/ui/worldCloud';
import { PieCard } from '@/shared/ui/pieChart';
import { ClusterBars } from '@/shared/ui/clusterBars';
import type { KpiCardPayload } from '@/shared/interface/kpiCars';
import type { PieResponse } from '@/shared/interface/pieChart';
import type { ClusterBarRow, ClusterBarsResponse } from '@/shared/interface/clusterBars';
import type {
  ThemeSearchMetricValue,
  ThemeSearchNearestTags,
  ThemeSearchPieChart,
  ThemeSearchResponse,
} from '@/app/(routing)/chars/hooks/themeSearch/useThemeSearch';

import dayjs from 'dayjs';
import { mapWordCloudDefault } from '@/shared/ui/worldCloud/lib/map';
import styles from './ThemeSearchBlock.module.scss';

type MappedPieCard = {
  title?: string;
  response: PieResponse;
};

function toMetricDisplayValue(value: ThemeSearchMetricValue['value']): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value.toString() : '—';
  }
  const text = String(value).trim();
  return text.length ? text : '—';
}

function buildKpiCard(
  metric: ThemeSearchMetricValue | undefined,
  title: string,
  periodISO: { from: string; to: string },
): KpiCardPayload | undefined {
  if (!metric) return undefined;

  return {
    id: metric.id,
    title,
    value: toMetricDisplayValue(metric.value),
    unit: metric.unit,
    period: periodISO,
  } satisfies KpiCardPayload;
}

function parseToNumber(value: number | string | null | undefined): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === 'string') {
    const numeric = Number(value.replace(',', '.'));
    return Number.isFinite(numeric) ? numeric : null;
  }
  return null;
}

function mapPieChart(
  chart: ThemeSearchPieChart | undefined,
  fallbackTitle: string,
): MappedPieCard | undefined {
  if (!chart || !Array.isArray(chart.data) || chart.data.length === 0) return undefined;

  const slices = chart.data
    .map((item, index) => {
      const label = item.name?.trim() ? item.name.trim() : `Категория ${index + 1}`;
      const parsed = parseToNumber(item.value) ?? 0;
      const colorHex =
        item.color && item.color.startsWith('#') ? (item.color as `#${string}`) : undefined;

      return {
        key: `${chart.id}-${index}-${label}`,
        label,
        value: parsed,
        colorHex,
      } satisfies PieResponse['slices'][number];
    })
    .filter((slice) => Number.isFinite(slice.value));

  if (!slices.length) return undefined;

  const title = chart.title ?? fallbackTitle;

  return {
    title,
    response: {
      id: chart.id,
      title,
      slices,
      totalLabel: chart.centralValue?.label,
      center: chart.centralValue,
    },
  };
}

function mapNearestTagRows(nearestTags: ThemeSearchNearestTags | undefined): ClusterBarRow[] {
  return (nearestTags?.data ?? []).map((row, index) => ({
    name: row.name?.trim() ? row.name.trim() : `Тег ${index + 1}`,
    mentions: parseToNumber(row.mentions) ?? 0,
    positive: parseToNumber(row.positive) ?? 0,
    neutral: parseToNumber(row.neutral) ?? 0,
    negative: parseToNumber(row.negative) ?? 0,
  }));
}

function mapNearestTagsToHistogram(
  nearestTags: ThemeSearchNearestTags | undefined,
  rows: ClusterBarRow[],
  periodISO: { from: string; to: string },
): ClusterBarsResponse | undefined {
  if (!nearestTags || rows.length === 0) return undefined;

  const sentimentKeys = ['positive', 'neutral', 'negative'] as const;
  const availableSentiments = sentimentKeys.filter((key) =>
    rows.some((row) => (row[key] ?? 0) !== 0),
  );
  const defaultKeys = availableSentiments.length ? availableSentiments : ['mentions'];
  const barKeys = (
    nearestTags.barKeys && nearestTags.barKeys.length ? nearestTags.barKeys : defaultKeys
  ) as string[];

  const stacked = nearestTags.stacked ?? availableSentiments.length > 0;
  const normalize100 = nearestTags.normalize100 ?? false;

  const period: ClusterBarsResponse['period'] =
    nearestTags.period && nearestTags.period.from && nearestTags.period.to
      ? nearestTags.period
      : { from: periodISO.from, to: periodISO.to };

  return {
    id: nearestTags.id ?? `nearest-tags-${period.from}-${period.to}`,
    title: nearestTags.title ?? 'Ближайшие теги',
    period,
    data: rows,
    barKeys,
    stacked,
    normalize100,
  } satisfies ClusterBarsResponse;
}

type Props = {
  className?: string;
  theme: string;
  setTheme: (s: string) => void;
  onSearch: () => void;
  onReset: () => void;
  data?: ThemeSearchResponse;
  isLoading?: boolean;
  /** optional period range: [fromISO, toISO] - if omitted, fallback used */
  periodRange?: [string, string];
};

export const ThemeSearchBlockShared: React.FC<Props> = ({
  className,
  theme,
  setTheme,
  onSearch,
  onReset,
  data,
  isLoading,
  periodRange,
}) => {
  const metrics = data?.metrics;
  const wc = data?.wordcloud;
  const pie = data?.piecharts;
  const nearestTags = data?.nearest_tags;

  const periodISO = useMemo(() => {
    if (periodRange && periodRange[0] && periodRange[1])
      return { from: String(periodRange[0]), to: String(periodRange[1]) };
    return { from: dayjs().subtract(30, 'day').toISOString(), to: dayjs().toISOString() };
  }, [periodRange]);

  const chartHeight = 340;

  const kpiTotal = useMemo<KpiCardPayload | undefined>(
    () => buildKpiCard(metrics?.total_count, 'Найдено отзывов', periodISO),
    [metrics?.total_count, periodISO],
  );

  const kpiAvgSent = useMemo<KpiCardPayload | undefined>(
    () => buildKpiCard(metrics?.avg_sentiment, 'Средний сентимент', periodISO),
    [metrics?.avg_sentiment, periodISO],
  );

  const kpiAvgRating = useMemo<KpiCardPayload | undefined>(
    () => buildKpiCard(metrics?.avg_rating, 'Средний рейтинг', periodISO),
    [metrics?.avg_rating, periodISO],
  );

  const kpiCards = useMemo(
    () =>
      [
        { key: 'total', data: kpiTotal },
        { key: 'sentiment', data: kpiAvgSent },
        { key: 'rating', data: kpiAvgRating },
      ].filter((item) => item.data),
    [kpiTotal, kpiAvgSent, kpiAvgRating],
  );

  const wordCloudItems = useMemo(
    () => (wc ? mapWordCloudDefault(wc).items : undefined),
    [wc],
  );

  const sentimentPie = useMemo(
    () => mapPieChart(pie?.sentiment, 'Сентимент отзывов'),
    [pie?.sentiment],
  );
  const servicesPie = useMemo(() => mapPieChart(pie?.services, 'Сервисы'), [pie?.services]);

  const nearestTagsHistogram = useMemo(() => {
    const rows = mapNearestTagRows(nearestTags);
    return mapNearestTagsToHistogram(nearestTags, rows, periodISO);
  }, [nearestTags, periodISO]);

  return (
    <Card className={`${styles.themeSearchCard} ${className ?? ''}`}>
      <div className={styles.controlsRow}>
        <Input
          className={styles.searchInput}
          placeholder="Введите тему для поиска"
          value={theme}
          onChange={(e) => setTheme(e.target.value)}
          onPressEnter={() => onSearch()}
        />
        <div className={styles.controlsButtons}>
          <Button type="primary" onClick={() => onSearch()}>
            Поиск
          </Button>
          <Button onClick={() => onReset()}>Сброс</Button>
        </div>
      </div>

      {isLoading ? (
        <Skeleton active />
      ) : (
        <div className={styles.content}>
          {kpiCards.length ? (
            <div className={styles.kpiRow}>
              {kpiCards.map(({ key, data }) => (
                <KpiCard key={key} loading={isLoading} data={data} />
              ))}
            </div>
          ) : null}

          <div className={styles.chartsGrid}>
            {wordCloudItems ? (
              <div className={styles.chartCell}>
                <WordCloud height={chartHeight} items={wordCloudItems} />
              </div>
            ) : null}

            {sentimentPie ? (
              <div className={styles.chartCell}>
                <PieCard title={sentimentPie.title} response={sentimentPie.response} height={chartHeight} />
              </div>
            ) : null}

            {servicesPie ? (
              <div className={styles.chartCell}>
                <PieCard title={servicesPie.title} response={servicesPie.response} height={chartHeight} />
              </div>
            ) : null}

            {nearestTagsHistogram ? (
              <div className={`${styles.chartCell} ${styles.chartCellWide}`}>
                <ClusterBars payload={nearestTagsHistogram} height={chartHeight} />
              </div>
            ) : null}
          </div>
        </div>
      )}
    </Card>
  );
};

export default ThemeSearchBlockShared;
