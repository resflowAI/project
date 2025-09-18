'use client';

import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import dayjs from 'dayjs';
import 'dayjs/locale/ru';

import type { LineTimeseriesResponse, TsSeriesDef } from '@/shared/interface/line';
import styles from './ui.module.scss';
import { ExportCsvButton } from '@/shared/ui/exportCsv';
import { LINE_COLORS } from '../data';

export type LineTimeseriesProps = {
  payload: LineTimeseriesResponse;
  height?: number;
};

const formatK = (n: number) => {
  const v = Math.abs(n);
  if (v >= 1_000_000) return `${(n / 1_000_000).toFixed(0)} M`;
  if (v >= 1_000) return `${(n / 1_000).toFixed(0)} K`;
  return `${n}`;
};

const GAZPROM_BLUE = '#0072CE';

export const LineTimeseries = ({ payload, height = 320 }: LineTimeseriesProps) => {
  const { title, data, series } = payload;

  // фиксированные цвета (по индексу серии); если цветов меньше — используем базовый газпром-синий
  const colors = useMemo(() => series.map((_, i) => LINE_COLORS?.[i] ?? GAZPROM_BLUE), [series]);

  const renderSeries = (s: TsSeriesDef, idx: number) => {
    const color = colors[idx];

    return (
      <Area
        key={s.key}
        type="monotone"
        dataKey={s.key}
        name={s.label}
        stroke={color}
        strokeWidth={2}
        fill={`url(#ts_grad_${idx})`}
        fillOpacity={1}
        dot={false}
        activeDot={false}
        isAnimationActive={false}
        yAxisId={s.yAxis ?? 'left'}
        connectNulls
      />
    );
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <div className={styles.title}>{title}</div>
        <div className={styles.actions}>
          <ExportCsvButton endpoint={'/csv/timeline'} title="Скачать CSV" />
        </div>
      </div>

      <div className={styles.chartBox} style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 12, bottom: 8, left: 0 }}>
            {/* плавная сетка */}
            <CartesianGrid strokeDasharray="4 6" vertical={false} stroke="#e9e9ef" />

            {/* один набор градиентов на весь чарт — по одному на каждую серию */}
            <defs>
              {series.map((s, idx) => (
                <linearGradient id={`ts_grad_${idx}`} key={s.key} x1="0" y1="0" x2="0" y2="1">
                  {/* сразу под линией — полупрозрачно */}
                  <stop offset="0%" stopColor={colors[idx]} stopOpacity={0.35} />
                  {/* мягкое затухание по мере приближения к низу */}
                  <stop offset="70%" stopColor={colors[idx]} stopOpacity={0.1} />
                  {/* у низа — полностью прозрачно */}
                  <stop offset="100%" stopColor={colors[idx]} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>

            <XAxis
              dataKey="t"
              tickFormatter={(v) => dayjs(v).locale('ru').format('DD.MM.YYYY')}
              tick={{ fontSize: 11, fill: '#7d7f88' }}
              tickMargin={8}
              minTickGap={36}
              interval="preserveStartEnd"
              axisLine={{ stroke: '#d9d9df' }}
            />

            <YAxis
              yAxisId="left"
              domain={['auto', 'auto']}
              tickFormatter={(v) => formatK(Number(v))}
              tick={{ fontSize: 12, fill: '#7d7f88' }}
              width={48}
              axisLine={{ stroke: '#d9d9df' }}
            />

            {series.some((s) => s.yAxis === 'right') && (
              <YAxis
                yAxisId="right"
                orientation="right"
                domain={['auto', 'auto']}
                tickFormatter={(v) => formatK(Number(v))}
                tick={{ fontSize: 12, fill: '#7d7f88' }}
                width={48}
                axisLine={{ stroke: '#d9d9df' }}
              />
            )}

            <Tooltip
              labelFormatter={(v) => dayjs(v).locale('ru').format('DD.MM.YYYY')}
              contentStyle={{ fontSize: 13 }}
            />

            <Legend
              verticalAlign="bottom"
              align="left"
              wrapperStyle={{ paddingTop: '12px', paddingLeft: '24px' }}
            />

            {series.map(renderSeries)}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
