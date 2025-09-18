'use client';

import React, { useMemo, useCallback, useRef, useEffect } from 'react';
import { Tooltip } from 'antd';
import { QuestionCircleOutlined } from '@ant-design/icons';
import styles from './ui.module.scss';

import { useResizeObserver } from '../lib/useResize';
import type { HeatmapData, HeatmapProps } from '@/shared/interface/hitmap';

/* ========== helpers ========== */

function inferOrder(keys: Array<string | number>) {
  const allNumbers = keys.every((k): k is number => typeof k === 'number');
  return allNumbers ? [...(keys as number[])].sort((a, b) => a - b) : [...keys];
}
function extent(vals: number[]): readonly [number, number] {
  if (!vals.length) return [0, 1] as const;
  const first = vals.find((v) => typeof v === 'number');
  if (first === undefined) return [0, 1] as const;
  let lo = first,
    hi = first;
  for (let i = 0; i < vals.length; i++) {
    const v = vals[i] as number;
    lo = Math.min(lo, v);
    hi = Math.max(hi, v);
  }
  return [lo, hi] as const;
}
function buildGrid(data: HeatmapData) {
  const xSet = new Set<string | number>();
  const ySet = new Set<string | number>();
  const map = new Map<string, number>();
  for (const c of data.cells) {
    xSet.add(c.x);
    ySet.add(c.y);
    map.set(`${c.x}__${c.y}`, c.v);
  }
  const xKeys = data.xOrder ?? inferOrder(Array.from(xSet));
  const yKeys = data.yOrder ?? inferOrder(Array.from(ySet));

  const values: number[] = [];
  const grid: number[][] = [];
  for (let yi = 0; yi < yKeys.length; yi++) {
    const row: number[] = [];
    for (let xi = 0; xi < xKeys.length; xi++) {
      const key = `${xKeys[xi]}__${yKeys[yi]}`;
      const v = map.has(key) ? (map.get(key) as number) : 0;
      row.push(v);
      values.push(v);
    }
    grid.push(row);
  }
  return { xKeys, yKeys, grid, values };
}
const clamp01 = (t: number) => Math.max(0, Math.min(1, t));
function redGrayScale(v: number, vMin: number, vMax: number) {
  if (!(Number.isFinite(vMin) && Number.isFinite(vMax)) || vMax === vMin) return 'hsl(0 0% 90%)';
  const t = clamp01((v - vMin) / (vMax - vMin));
  const h = 10 * t;
  const s = 0 + (80 - 0) * t;
  const l = 88 + (46 - 88) * t;
  return `hsl(${h.toFixed(1)} ${s.toFixed(1)}% ${l.toFixed(1)}%)`;
}
const LEGEND_GRADIENT = 'linear-gradient(90deg, hsl(0 0% 88%), hsl(10 80% 46%))';

/* ========== component ========== */

export const Heatmap: React.FC<Omit<HeatmapProps, 'colorScale'>> = ({
  data,
  gap = 8,
  radius = 6,
  showLegend = true,
  formatValue,
  onCellClick,
  height = 360,
  title,
  withBackground = true,
  withPadding = true,
}) => {
  const { xKeys, yKeys, grid, values } = useMemo(() => buildGrid(data), [data]);
  const [rawMin, rawMax] = useMemo(() => extent(values), [values]);
  const vMin = data.meta?.vMin ?? rawMin;
  const vMax = data.meta?.vMax ?? rawMax;

  const CELL_W = 96;
  const stepX = CELL_W + gap;
  const rectW = CELL_W;
  const chartWidth = Math.max(0, xKeys.length * stepX + gap);

  const stepY = yKeys.length ? height / yKeys.length : 0;
  const rectH = Math.max(0, stepY - gap);

  const fmt = useCallback(
    (v: number) => (formatValue ? formatValue(v) : v.toFixed(data.meta?.decimals ?? 0)),
    [formatValue, data.meta?.decimals],
  );

  const palette = redGrayScale;

  // refs: нижний скролл (единственный видимый) + верхний заголовок X без полосы
  const chartScrollRef = useRef<HTMLDivElement | null>(null);
  const xHeaderInnerRef = useRef<HTMLDivElement | null>(null);

  // при скролле снизу сдвигаем верхние подписи X через translateX
  const onBottomScroll = () => {
    const sl = chartScrollRef.current?.scrollLeft ?? 0;
    if (xHeaderInnerRef.current) {
      xHeaderInnerRef.current.style.transform = `translateX(-${sl}px)`;
    }
  };

  // первичная синхронизация
  useEffect(() => {
    onBottomScroll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // просто чтобы Next/React пересчитал размер контейнера при ресайзе
  useResizeObserver<HTMLDivElement>();

  return (
    <div
      className={styles.heatmap}
      style={{
        backgroundColor: withBackground ? '#fff' : 'transparent',
        padding: withPadding ? 16 : 0,
      }}
    >
      <div className={styles.titleRow}>
        <h3 className={styles.title}>{title ?? 'Таблица корреляций характеристик'}</h3>
        <Tooltip title="Характеристики с высокой взаимной корреляцией чаще встречаются друг с другом в одних отзывах">
          <QuestionCircleOutlined className={styles.titleHelp} />
        </Tooltip>
      </div>

      <div className={styles.axes}>
        <div className={styles.corner} />

        {/* ВЕРХНЯЯ ОСЬ X — без скроллбаров, сдвигаем контент transform-ом */}
        <div className={styles.xHeader}>
          <div
            ref={xHeaderInnerRef}
            className={styles.xTicks}
            style={{
              width: chartWidth,
              gridTemplateColumns: `repeat(${xKeys.length}, ${rectW}px)`,
              columnGap: gap,
              padding: `0 ${gap / 2}px`,
            }}
          >
            {xKeys.map((x) => (
              <Tooltip key={`x-${String(x)}`} title={String(x)}>
                <div className={styles.xTick} style={{ maxWidth: rectW }}>
                  {String(x)}
                </div>
              </Tooltip>
            ))}
          </div>
        </div>

        {/* ЛЕВАЯ ОСЬ Y */}
        <div
          className={styles.yTicks}
          style={{
            gridTemplateRows: `repeat(${yKeys.length}, ${rectH}px)`,
            rowGap: gap,
            padding: `${gap / 2}px 0`,
          }}
        >
          {yKeys.map((y) => (
            <div key={`y-${String(y)}`} className={styles.yTick} title={String(y)}>
              {String(y)}
            </div>
          ))}
        </div>

        {/* НИЖНИЙ ЕДИНСТВЕННЫЙ СКРОЛЛ (svg) */}
        <div
          ref={chartScrollRef}
          onScroll={onBottomScroll}
          className={styles.chartScroll}
          style={{ height }}
        >
          <div style={{ width: chartWidth }}>
            <svg
              className={styles.svgBlock}
              width={chartWidth}
              height={height}
              role="img"
              aria-label="heatmap"
            >
              {yKeys.map((y, yi) => (
                <g key={`row-${yi}`} transform={`translate(0, ${yi * (rectH + gap)})`}>
                  {xKeys.map((x, xi) => {
                    const v = grid[yi]?.[xi] ?? 0;
                    const fill = palette(v, vMin, vMax);
                    const cx = xi * stepX;
                    return (
                      <Tooltip
                        key={`cell-${yi}-${xi}`}
                        title={
                          <div>
                            <b>{data.meta?.xLabel ?? 'X'}:</b> {String(x)} <br />
                            <b>{data.meta?.yLabel ?? 'Y'}:</b> {String(y)} <br />
                            <b>{data.meta?.vLabel ?? 'Value'}:</b> {fmt(v)}
                          </div>
                        }
                      >
                        <rect
                          x={cx + gap / 2}
                          y={gap / 2}
                          width={rectW}
                          height={rectH}
                          rx={radius}
                          ry={radius}
                          fill={fill}
                          data-x={String(x)}
                          data-y={String(y)}
                          style={{ cursor: onCellClick ? 'pointer' : 'default' }}
                          onClick={() => onCellClick?.({ x, y, v })}
                        />
                      </Tooltip>
                    );
                  })}
                </g>
              ))}
            </svg>
          </div>
        </div>
      </div>

      {showLegend && (
        <div className={styles.legend}>
          <div className={styles.legendBar} style={{ background: LEGEND_GRADIENT }} />
          <div className={styles.legendLabels}>
            <span>{fmt(vMin)} (низкая корреляция)</span>
            <span>{fmt(vMax)} (высокая корреляция)</span>
          </div>
        </div>
      )}
    </div>
  );
};
