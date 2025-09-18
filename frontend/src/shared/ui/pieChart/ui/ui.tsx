'use client';

import React, { useMemo } from 'react';
import styles from './ui.module.scss';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip as RTooltip, Legend } from 'recharts';
import { PieCardProps, PieSlice } from '@/shared/interface/pieChart';

/** Базовая палитра, если в срезе нет своего цвета */
const DEFAULT_COLORS: string[] = [
  '#22c55e',
  '#eab308',
  '#ef4444',
  '#0ea5e9',
  '#a855f7',
  '#f97316',
  '#4f46e5',
];

/** Дата для Recharts с индекс-сигнатурой */
type PieDatum = Record<string, string | number>;
/** Айтем тултипа (минимально достаточный тип) */
type TooltipItem = { payload?: { key: string; label: string; value: number } };
type LegendItem = { id: string; label: string; color: string };

function CustomLegend({ items }: { items: LegendItem[] }) {
  if (!items.length) return null;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, padding: '4px 8px' }}>
      {items.map((it) => (
        <div key={it.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span
            aria-hidden
            style={{
              width: 10,
              height: 10,
              borderRadius: 2,
              background: it.color,
              display: 'inline-block',
            }}
          />
          <span style={{ fontSize: 12, color: '#374151' }}>{it.label}</span>
        </div>
      ))}
    </div>
  );
}

/** Кастомный тултип на русском */
function TooltipContent({
  active,
  payload,
  showPercent,
  total,
  formatValue,
}: {
  active?: boolean;
  payload?: TooltipItem[];
  showPercent: boolean;
  total: number;
  formatValue?: (v: number) => string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const item = payload[0];
  if (!item || !item.payload) return null;

  const { label, value } = item.payload;
  const percent = total > 0 ? (value / total) * 100 : 0;

  const valueText = formatValue ? formatValue(value) : String(value);
  const percentText = `${percent.toFixed(1)}%`;

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
      <div style={{ fontWeight: 600, marginBottom: 4 }}>{label}</div>
      <div>
        <span style={{ color: '#6b7280' }}>Значение:</span> {valueText}
      </div>
      {showPercent && (
        <div>
          <span style={{ color: '#6b7280' }}>Доля:</span> {percentText}
        </div>
      )}
    </div>
  );
}

function CenterLabels({
  cx,
  cy,
  total,
  totalLabel,
  center, // ← новое
  formatValue,
}: {
  cx: number;
  cy: number;
  total: number;
  totalLabel?: string;
  center?: { label?: string; value?: string };
  formatValue?: (v: number) => string;
}) {
  const valueText = center?.value ?? (formatValue ? formatValue(total) : String(total));

  const labelText = center?.label ?? totalLabel;

  return (
    <>
      {labelText && (
        <text x={cx} y={cy - 8} className={styles.centerLabel}>
          {labelText}
        </text>
      )}
      <text x={cx} y={cy + 12} className={styles.centerValue}>
        {valueText}
      </text>
    </>
  );
}

export const PieCard: React.FC<PieCardProps> = ({
  title,
  response,
  height = 320,
  withBackground = true,
  withPadding = true,
  innerRadius = '60%',
  outerRadius = '90%',
  showLegend = true,
  showPercent = true,
  showTotalInCenter = true,
  formatValue,
  onSliceClick,
}) => {
  const colors = useMemo(() => DEFAULT_COLORS, []);
  const slices: PieSlice[] = response.slices;

  const total = useMemo(
    () => slices.reduce((acc, s) => acc + (typeof s.value === 'number' ? s.value : 0), 0),
    [slices],
  );

  // Приводим к виду, который ожидает Recharts
  const prepared: PieDatum[] = useMemo(() => {
    return response.slices.map((s) => ({
      key: s.key,
      label: s.label,
      name: s.label,
      value: s.value,
    }));
  }, [response.slices]);

  const legendItems: LegendItem[] = useMemo(
    () =>
      slices.map((s, i) => {
        const paletteColor = colors.length > 0 ? colors[i % colors.length] : undefined;
        const color = s.colorHex ?? paletteColor ?? '#9ca3af'; // ← всегда string
        return { id: s.key, label: s.label, color };
      }),
    [slices, colors],
  );

  return (
    <div className={`${withBackground ? styles.card : styles.compact}`}>
      <div className={`${styles.inner} ${withPadding ? '' : styles.noPad}`}>
        {title && <h3 className={styles.title}>{title}</h3>}
        <div className={styles.chartWrap} style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <RTooltip
                content={
                  <TooltipContent
                    showPercent={showPercent}
                    total={total}
                    formatValue={formatValue}
                  />
                }
              />
              {showLegend && <Legend content={<CustomLegend items={legendItems} />} />}

              {/* Основной пирог */}
              <Pie
                data={prepared}
                dataKey="value"
                nameKey="label"
                cx="50%"
                cy="50%"
                innerRadius={innerRadius}
                outerRadius={outerRadius}
                paddingAngle={2}
                isAnimationActive={false}
                onClick={(p) => {
                  if (!p || typeof p !== 'object' || !('payload' in p)) return;
                  const datum = (p as { payload?: PieDatum }).payload;
                  const slice = datum ? slices.find((s) => s.key === datum.key) : undefined;
                  if (slice) onSliceClick?.(slice);
                }}
              >
                {slices.map((s, i) => (
                  <Cell key={s.key} fill={s.colorHex ?? colors[i % colors.length]} />
                ))}
              </Pie>

              {/* Центровая подпись (невидимый Pie для получения cx/cy) */}
              {showTotalInCenter && (
                <Pie
                  data={[{ value: 1 }]}
                  dataKey="value"
                  cx="50%"
                  cy="50%"
                  outerRadius={0}
                  isAnimationActive={false}
                  label={(props) => {
                    const { cx, cy } = props as unknown as { cx: number; cy: number };
                    return (
                      <CenterLabels
                        cx={cx}
                        cy={cy}
                        total={total}
                        center={response.center}
                        totalLabel={response.totalLabel}
                        formatValue={formatValue}
                      />
                    );
                  }}
                  labelLine={false}
                />
              )}
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
