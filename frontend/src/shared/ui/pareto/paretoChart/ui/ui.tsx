'use client';

import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
  Tooltip as ReTooltip,
} from 'recharts';
import styles from './ui.module.scss';
import { ParetoChartProps, ParetoRow } from '@/shared/interface/pareto';

// Тип одного элемента payload тултипа Recharts
type RTItem = {
  dataKey?: string;
  value?: number;
  name?: string;
  payload?: ParetoRow & { cumulativeDisplay?: number };
};

// Кастомный тултип без any
const TooltipContent: React.FC<{
  active?: boolean;
  payload?: RTItem[];
  label?: string | number;
}> = ({ active, payload, label }) => {
  if (!active || !payload || payload.length === 0) return null;

  const bar = payload.find((p) => p.dataKey === 'negative');
  const line = payload.find((p) => p.dataKey === 'cumulativeDisplay');

  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #f0f0f0',
        boxShadow: '0 6px 16px rgba(0,0,0,0.08)',
        borderRadius: 8,
        padding: '8px 10px',
        fontSize: 12,
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 4 }}>{label}</div>
      {typeof bar?.value === 'number' && (
        <div>
          Негатив: <b>{bar.value}</b>
        </div>
      )}
      {typeof line?.value === 'number' && (
        <div>
          Кумулятив: <b>{line.value.toFixed(1)}%</b>
        </div>
      )}
    </div>
  );
};

export const ParetoChart: React.FC<ParetoChartProps> = ({ response, height = 360, className }) => {
  const { data, cumulativeAsPercent, threshold } = response;

  const { series, rightDomain, thresholdY, rightTickFormatter } = useMemo(() => {
    const inPercents = cumulativeAsPercent === true;
    const series: (ParetoRow & { cumulativeDisplay: number })[] = data.map((d) => ({
      ...d,
      cumulativeDisplay: inPercents ? d.cumulative : d.cumulative * 100,
    }));
    return {
      series,
      rightDomain: [0, 100] as [number, number],
      thresholdY: inPercents ? (threshold ?? 80) : (threshold ?? 0.8) * 100,
      rightTickFormatter: (v: number) => `${Math.round(v)}%`,
    };
  }, [data, cumulativeAsPercent, threshold]);

  const leftMax = useMemo(() => Math.max(...series.map((d) => d.negative), 0), [series]);

  return (
    <div className={[styles.wrap, className].filter(Boolean).join(' ')}>
      <div style={{ width: '100%', height }}>
        <ResponsiveContainer>
          <ComposedChart data={series}>
            <CartesianGrid vertical={false} stroke="#f0f0f0" />

            <XAxis dataKey="name" interval={0} tick={{ fontSize: 12 }} height={40} tickMargin={8} />

            {/* Левая ось: абсолютные значения негатива */}
            <YAxis
              yAxisId="left"
              domain={[0, Math.ceil(leftMax * 1.1)]}
              allowDecimals={false}
              tick={{ fontSize: 12 }}
              width={48}
            />

            {/* Правая ось: кумулятив в процентах */}
            <YAxis
              yAxisId="right"
              orientation="right"
              domain={rightDomain}
              tickFormatter={rightTickFormatter}
              tick={{ fontSize: 12 }}
              width={48}
            />

            <ReTooltip content={<TooltipContent />} />

            {/* Пороговая линия (обычно 80%) */}
            <ReferenceLine
              yAxisId="right"
              y={thresholdY}
              stroke="#bfbfbf"
              strokeDasharray="6 6"
              ifOverflow="extendDomain"
              label={{
                value: `${Math.round(thresholdY)}%`,
                position: 'right',
                fill: '#8c8c8c',
                fontSize: 12,
              }}
            />

            {/* Столбцы: negative */}
            <Bar
              yAxisId="left"
              dataKey="negative"
              radius={[6, 6, 0, 0]}
              fill="#0A6ED1"
              animationDuration={0}
            />

            {/* Линия: cumulative (в процентах) */}
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="cumulativeDisplay"
              stroke="hsl(0 0% 20%)"
              strokeWidth={2}
              dot={false}
              animationDuration={0}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
