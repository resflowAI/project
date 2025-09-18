'use client';

import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, Tooltip, type AreaProps } from 'recharts';
import { SparkTooltip, SparkTooltipData } from '../tooltip/ui/ui';
import { FixedTooltipProps } from '../types';

type Point = { t: string; v: number };
type DotLike = { cx?: number; cy?: number; index?: number };

export type SparklineTinyProps = {
  data?: Point[];
  height?: number;
  color?: string;
  seriesLabel?: string;
  incompleteBadge?: boolean | string;
  formatValue?: (v: number) => string;
  dateFormat?: string;
};

export const SparklineTiny = ({
  data = [],
  height = 64,
  color = '#0057B6',
  seriesLabel = 'Значение',
  incompleteBadge = false,
  formatValue = (v) => `${v}`,
  dateFormat = 'dddd, D MMMM YYYY',
}: SparklineTinyProps) => {
  const gradientId = useMemo(() => `grad_${Math.random().toString(36).slice(2)}`, []);
  const lastIndex = data.length - 1;

  // измеряем контейнер, чтобы позиционировать портал
  const wrapRef = useRef<HTMLDivElement>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);
  useLayoutEffect(() => {
    if (!wrapRef.current) return;
    const r = wrapRef.current.getBoundingClientRect();
    setRect(r);
  }, []);

  // данные для кастомного тултипа (из Recharts)
  const [tooltipState, setTooltipState] = useState<{
    data: SparkTooltipData;
    coord?: { x: number; y: number };
  }>({ data: {} });

  const renderDot: NonNullable<AreaProps['dot']> = (props: DotLike) =>
    props.index === lastIndex ? (
      <circle cx={props.cx} cy={props.cy} r={5} fill={color} stroke="#fff" strokeWidth={2} />
    ) : (
      <g />
    );

  // ловим события Tooltip, чтобы передать координаты
  const onTooltipChange = (tp: FixedTooltipProps) => {
    setTooltipState({
      data: {
        active: tp.active,
        label: tp.label,
        payload: tp.payload,
      },
      coord: tp.coordinate ? { x: tp.coordinate.x ?? 0, y: tp.coordinate.y ?? 0 } : undefined,
    });
  };

  return (
    <div ref={wrapRef} style={{ width: '100%', height, overflow: 'hidden' }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 0, right: 8, bottom: 0, left: 8 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.25} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>

          <XAxis dataKey="t" hide />

          {/* Системный Tooltip — выключаем визуал, используем только его события */}
          <Tooltip
            contentStyle={{ display: 'none' }}
            cursor={{ stroke: color, strokeOpacity: 0.15 }}
            isAnimationActive={false}
            allowEscapeViewBox={{ x: true, y: true }}
            wrapperStyle={{ visibility: 'hidden' }}
            // @ts-expect-error — onChange есть в рантайме, типов нет
            onChange={onTooltipChange}
          />

          <Area
            type="monotone"
            dataKey="v"
            stroke={color}
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            dot={renderDot}
            activeDot={{ r: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>

      {/* Наш собственный портал-тултип — НЕ режется overflow-ом карточки */}
      {rect && (
        <SparkTooltip
          containerRect={rect}
          scrollX={window.scrollX}
          scrollY={window.scrollY}
          coord={tooltipState.coord}
          color={color}
          seriesLabel={seriesLabel}
          dateFormat={dateFormat}
          incompleteBadge={incompleteBadge}
          formatValue={formatValue}
          data={tooltipState.data}
        />
      )}
    </div>
  );
};
