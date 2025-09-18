// app/(dashboard)/chars/mock.ts
import { ClusterBarRow, ClusterBarsResponse } from '@/shared/interface/clusterBars';
import { CriticalIssuesResponse } from '@/shared/interface/criticalIssues';
import type { ID, TimeRange, ISODateString } from '@/shared/interface/globalTypes'; // см. твой блок с TreemapNode/TreemapResponse
import type { HeatmapData, HeatmapCell } from '@/shared/interface/hitmap';
import { LineTimeseriesResponse, TsPoint, TsSeriesDef } from '@/shared/interface/line';
import { ParetoResponse, ParetoRow } from '@/shared/interface/pareto';
import { PieResponse } from '@/shared/interface/pieChart';
import { ScatterSeries } from '@/shared/interface/scatter';

const days = (n: number): string => {
  const today = new Date();
  today.setDate(today.getDate() + n);
  return today.toISOString().slice(0, 10); // YYYY-MM-DD
};

const buildPoints = (vals: number[], key: string): TsPoint[] =>
  vals.map((v, i) => ({ t: days(-(vals.length - 1 - i)), [key]: v }));

// === утилиты (без новых типов)
const isoDaysFromNow = (d: number): ISODateString =>
  new Date(Date.now() + d * 24 * 60 * 60 * 1000).toISOString() as ISODateString;

const period14d: TimeRange = { from: isoDaysFromNow(-13), to: isoDaysFromNow(0) };




// =================== селектор характеристики (без доп. типов) ===================
export const charOptions: ReadonlyArray<{ value: string; label: string }> = [
  { value: 'delivery', label: 'Доставка' },
  { value: 'price', label: 'Цена' },
  { value: 'quality', label: 'Качество' },
  { value: 'support', label: 'Поддержка' },
] as const;

// ================= LineTimeseriesResponse (2 таймлайна) =================
const buildTs = (
  vals: number[],
  title: string,
  key: string,
  unit?: string,
): LineTimeseriesResponse => {
  const data: TsPoint[] = vals.map((v, i) => ({
    t: isoDaysFromNow(-(vals.length - 1 - i)),
    [key]: v,
  }));
  const series: TsSeriesDef[] = [{ key, label: title, yAxis: 'left' }];
  return {
    id: title as ID,
    title,
    data,
    series,
    yLeftDomain: undefined,
    yRightDomain: undefined,
  };
};

export const charCountTimeline: Record<string, LineTimeseriesResponse> = {
  delivery: buildTs(
    [12, 14, 13, 16, 18, 20, 19, 21, 22, 24, 23, 25, 26, 27],
    'Кол-во упоминаний, Доставка',
    'mentions',
    'шт',
  ),
  price: buildTs(
    [20, 19, 21, 22, 20, 18, 17, 19, 18, 17, 16, 18, 19, 20],
    'Кол-во упоминаний, Цена',
    'mentions',
    'шт',
  ),
  quality: buildTs(
    [9, 10, 9, 10, 11, 12, 12, 13, 14, 13, 14, 15, 15, 16],
    'Кол-во упоминаний, Качество',
    'mentions',
    'шт',
  ),
  support: buildTs(
    [6, 7, 6, 7, 8, 8, 9, 10, 9, 9, 10, 10, 11, 11],
    'Кол-во упоминаний, Поддержка',
    'mentions',
    'шт',
  ),
};

export const charSentimentTimeline: Record<string, LineTimeseriesResponse> = {
  delivery: buildTs(
    [52, 54, 55, 56, 58, 59, 61, 62, 63, 62, 63, 64, 65, 66],
    'Сентимент, Доставка',
    '%pos',
  ),
  price: buildTs(
    [48, 47, 49, 50, 51, 50, 52, 51, 52, 53, 54, 55, 55, 56],
    'Сентимент, Цена',
    '%pos',
  ),
  quality: buildTs(
    [60, 60, 61, 62, 62, 63, 64, 64, 65, 66, 66, 67, 67, 68],
    'Сентимент, Качество',
    '%pos',
  ),
  support: buildTs(
    [45, 46, 46, 47, 48, 48, 49, 50, 51, 50, 50, 51, 52, 52],
    'Сентимент, Поддержка',
    '%pos',
  ),
};

// ============ ClusterBarsResponse (гистограмма топ-кластеров) ============
export const clustersHistogramMock: ClusterBarsResponse = {
  id: 'clusters-top' as ID,
  title: 'Топ кластеров по объёму (с составом сентимента)',
  period: period14d,
  stacked: true,
  normalize100: false, // показываем абсолютные значения
  barKeys: ['positive', 'neutral', 'negative'],
  data: [
    {
      name: 'Доставка',
      mentions: 420,
      positive: 220,
      neutral: 120,
      negative: 80,
    } satisfies ClusterBarRow,
    {
      name: 'Цена',
      mentions: 390,
      positive: 150,
      neutral: 110,
      negative: 130,
    } satisfies ClusterBarRow,
    {
      name: 'Качество',
      mentions: 310,
      positive: 190,
      neutral: 80,
      negative: 40,
    } satisfies ClusterBarRow,
    {
      name: 'Поддержка',
      mentions: 260,
      positive: 120,
      neutral: 90,
      negative: 50,
    } satisfies ClusterBarRow,
  ],
};

// =================== CriticalIssuesResponse (опционально) ===================
export const issuesMock: CriticalIssuesResponse = {
  updatedAt: isoDaysFromNow(0),
  rows: [
    {
      id: 'c1',
      aspect: 'Сроки доставки',
      negativeShare: 0.62,
      volume: 180,
      description: 'Задержки до 3 дней',
    },
    { id: 'c2', aspect: 'Цена', negativeShare: 0.48, volume: 210, description: 'Считают «дорого»' },
    { id: 'c3', aspect: 'Поддержка', negativeShare: 0.41, volume: 120 },
  ],
};

// ========================= ParetoResponse (Парето) =========================
export const paretoResp: ParetoResponse = {
  id: 'pareto-neg' as ID,
  title: 'Парето негативных причин',
  period: period14d,
  cumulativeAsPercent: true,
  threshold: 80,
  data: [
    { name: 'Сроки доставки', negative: 180, cumulative: 35 },
    { name: 'Цена', negative: 160, cumulative: 65 },
    { name: 'Поддержка', negative: 120, cumulative: 83 },
    { name: 'Брак', negative: 80, cumulative: 98 },
    { name: 'Прочее', negative: 10, cumulative: 100 },
  ] as ParetoRow[],
};

// ================= HeatmapData (корреляции тегов между собой) ==============
const TAGS: ReadonlyArray<string> = [
  'Доставка',
  'Цена',
  'Качество',
  'Поддержка',
  'Ассортимент',
] as const;

function buildCorrCells(tags: ReadonlyArray<string>): HeatmapCell[] {
  const m: number[][] = [
    [1.0, -0.2, 0.4, 0.1, 0.0],
    [-0.2, 1.0, -0.1, 0.2, 0.3],
    [0.4, -0.1, 1.0, 0.3, 0.2],
    [0.1, 0.2, 0.3, 1.0, 0.1],
    [0.0, 0.3, 0.2, 0.1, 1.0],
  ];
  const cells: HeatmapCell[] = [];
  for (let yi = 0; yi < tags.length; yi++) {
    const yVal = tags[yi]!;
    for (let xi = 0; xi < tags.length; xi++) {
      const xVal = tags[xi]!;
      const v = m[yi]?.[xi] ?? 0;
      cells.push({ x: xVal, y: yVal, v });
    }
  }
  return cells;
}

export const corrHeatmapMock: HeatmapData = {
  xOrder: [...TAGS],
  yOrder: [...TAGS],
  cells: buildCorrCells(TAGS),
  meta: { xLabel: 'Теги', yLabel: 'Теги', vLabel: 'Корреляция', vMin: -1, vMax: 1, decimals: 2 },
};

export const reviewsTimeline: LineTimeseriesResponse = {
  id: 'ts-reviews',
  title: 'Таймлайн по кол-ву отзывов',
  data: buildPoints([78, 82, 75, 71, 88, 95, 91, 99, 106, 93, 112, 119, 121, 123], 'reviews'),
  series: [{ key: 'reviews', label: 'Кол-во отзывов', yAxis: 'left' }],
  yLeftDomain: [0, 150],
};

export const avgMarketSentiment = 64; // линия среднего по рынку

// Серия «рынок» (цвета — жёлтый/красный/зелёный через несколько подсерий)
export const marketSeries: ScatterSeries[] = [
  {
    id: 'market-pos',
    name: 'рынок (pos)',
    xKey: 'mentions',
    yKey: 'sentiment',
    colorHex: '#f59e0b', // amber
    shape: 'circle',
    data: [
      { characteristic: 'Цена', mentions: 40, sentiment: 72 },
      { characteristic: 'Доставка', mentions: 55, sentiment: 79 },
      { characteristic: 'Ассортимент', mentions: 38, sentiment: 67 },
    ],
  },
  {
    id: 'market-mid',
    name: 'рынок (mid)',
    xKey: 'mentions',
    yKey: 'sentiment',
    colorHex: '#eab308',
    shape: 'circle',
    data: [
      { characteristic: 'Качество', mentions: 30, sentiment: 63 },
      { characteristic: 'Поддержка', mentions: 24, sentiment: 61 },
      { characteristic: 'Упаковка', mentions: 20, sentiment: 59 },
    ],
  },
  {
    id: 'market-neg',
    name: 'рынок (neg)',
    xKey: 'mentions',
    yKey: 'sentiment',
    colorHex: '#ef4444',
    shape: 'circle',
    data: [
      { characteristic: 'Сроки', mentions: 22, sentiment: 56 },
      { characteristic: 'Возврат', mentions: 18, sentiment: 54 },
      { characteristic: 'Оплата', mentions: 12, sentiment: 52 },
    ],
  },
];

// Серия «мои бренды»
export const myBrandsSeries: ScatterSeries = {
  id: 'my-brands',
  name: 'мои бренды',
  xKey: 'mentions',
  yKey: 'sentiment',
  colorHex: '#3b82f6',
  shape: 'circle',
  data: [
    { characteristic: 'Доставка', mentions: 58, sentiment: 88 },
    { characteristic: 'Цена', mentions: 42, sentiment: 78 },
    { characteristic: 'Качество', mentions: 36, sentiment: 74 },
  ],
};

// Итоговый набор для карточки
export const scatterSeriesAll: ScatterSeries[] = [...marketSeries, myBrandsSeries];


export const pieSentimentMock: PieResponse = {
  id: 'pie-sentiment',
  title: 'Сентимент отзывов',
  totalLabel: 'Всего',
  slices: [
    { key: 'positive', label: 'Положительные', value: 620, colorHex: '#22c55e' },
    { key: 'neutral', label: 'Нейтральные', value: 380, colorHex: '#eab308' },
    { key: 'negative', label: 'Отрицательные', value: 240, colorHex: '#ef4444' },
  ],
};

export const pieTrafficMock: PieResponse = {
  id: 'pie-traffic',
  title: 'Каналы трафика отзывов',
  totalLabel: 'Отзывы',
  slices: [
    { key: 'organic', label: 'Органический', value: 520, colorHex: '#4f46e5' },
    { key: 'ads', label: 'Реклама', value: 330, colorHex: '#0ea5e9' },
    { key: 'email', label: 'Email', value: 160, colorHex: '#a855f7' },
    { key: 'referral', label: 'Рефералы', value: 110, colorHex: '#f97316' },
  ],
};
