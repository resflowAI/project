'use client';

import React, { useMemo } from 'react';
import styles from './ui.module.scss';
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import { ScatterCardProps, ScatterDatum, ScatterSeries } from '@/shared/interface/scatter';

const DEFAULT_COLORS: string[] = [
  '#4f46e5',
  '#0ea5e9',
  '#22c55e',
  '#eab308',
  '#ef4444',
  '#a855f7',
  '#f97316',
];

function pickXY(d: ScatterDatum, s: ScatterSeries): { x: number; y: number; r?: number } {
  const xRaw = d[s.xKey];
  const yRaw = d[s.yKey];
  const rRaw = s.sizeKey ? d[s.sizeKey] : undefined;
  const x = typeof xRaw === 'number' ? xRaw : Number(xRaw);
  const y = typeof yRaw === 'number' ? yRaw : Number(yRaw);
  const r = typeof rRaw === 'number' ? rRaw : rRaw != null ? Number(rRaw) : undefined;
  return { x, y, r };
}

/** Минимальный тип айтема Recharts Tooltip (достаточно для наших нужд) */
type RTItem = { payload?: ScatterDatum; name?: string };

/** Кастомный тултип: русские подписи + скрытие отсутствующих полей */
function TooltipContent(props: {
  active?: boolean;
  payload?: RTItem[];
  tooltipLabels?: Record<string, string>;
  tooltipOrder?: string[];
}) {
  const { active, payload, tooltipLabels, tooltipOrder } = props;
  if (!active || !payload || payload.length === 0) return null;

  const p = payload?.[0];
  if (!p || !p.payload) return null;

  const d: ScatterDatum = p.payload;
  const seriesName: string = p.name ?? '';
  // Формируем список ключей для показа: либо заданный порядок, либо все ключи из labels, либо все ключи datum
  const candidateKeys: string[] =
    tooltipOrder ?? (tooltipLabels ? Object.keys(tooltipLabels) : Object.keys(d));

  const rows = candidateKeys
    .map((k) => ({ key: k, label: tooltipLabels?.[k] ?? k, value: d[k] }))
    .filter(({ value }) => value !== undefined && value !== null && value !== '');

  if (rows.length === 0) return null;

  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #eef1f4',
        borderRadius: 8,
        padding: '8px 10px',
        fontSize: 12,
        color: '#111827',
      }}
    >
      {seriesName && <div style={{ fontWeight: 600, marginBottom: 4 }}>{seriesName}</div>}
      {rows.map(({ key, label, value }) => (
        <div key={key}>
          <span style={{ color: '#6b7280' }}>{label}:</span> {String(value)}
        </div>
      ))}
    </div>
  );
}

export const ScatterCard: React.FC<ScatterCardProps> = ({
  title,
  height = 360,
  withBackground = true,
  withPadding = true,
  showLegend = true,
  showGrid = true,
  xLabel = 'X',
  yLabel = 'Y',
  xDomain,
  yDomain,
  refLineY,
  series,
  formatX,
  formatY,
  onPointClick,
  tooltipLabels,
  tooltipOrder,
}) => {
  const colors = useMemo(() => DEFAULT_COLORS, []);

  return (
    <div className={`${withBackground ? styles.card : styles.compact}`}>
      <div className={`${styles.inner} ${withPadding ? '' : styles.noPad}`}>
        {title && <h3 className={styles.title}>{title}</h3>}
        <div className={styles.chartWrap} style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 8, right: 16, bottom: 12, left: 8 }}>
              {showGrid && <CartesianGrid strokeDasharray="3 3" />}
              <XAxis
                type="number"
                dataKey="__x"
                name={xLabel}
                domain={xDomain ?? ['dataMin', 'dataMax']}
                tickFormatter={(v) => (formatX ? formatX(v) : String(v))}
                label={{ value: xLabel, position: 'insideBottomRight', offset: -6 }}
              />
              <YAxis
                type="number"
                dataKey="__y"
                name={yLabel}
                domain={yDomain ?? ['dataMin', 'dataMax']}
                tickFormatter={(v) => (formatY ? formatY(v) : String(v))}
                label={{ value: yLabel, angle: -90, position: 'insideLeft' }}
              />
              {typeof refLineY === 'number' && (
                <ReferenceLine y={refLineY} stroke="#60a5fa" strokeWidth={2} />
              )}

              <RTooltip
                content={
                  <TooltipContent tooltipLabels={tooltipLabels} tooltipOrder={tooltipOrder} />
                }
              />
              {showLegend && <Legend  verticalAlign="bottom" align="left" />}

              {series.map((s, idx) => {
                const prepared = s.data.map((d) => {
                  const { x, y, r } = pickXY(d, s);
                  return { ...d, __x: x, __y: y, __r: r };
                });

                return (
                  <Scatter
                    key={String(s.id)}
                    name={s.name}
                    data={prepared}
                    fill={s.colorHex ?? (colors[idx % colors.length] as string)}
                    shape={s.shape ?? 'circle'}
                    line={false}
                    onClick={(p) => {
                      const datum: ScatterDatum = (p?.payload ?? {}) as ScatterDatum;
                      onPointClick?.({ seriesId: s.id, datum });
                    }}
                  />
                );
              })}
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
