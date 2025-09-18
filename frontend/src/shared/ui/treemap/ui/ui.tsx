'use client';

import React, { useMemo } from 'react';
import { ResponsiveContainer, Treemap } from 'recharts';
import { Tooltip as AntTooltip } from 'antd';

import styles from './ui.module.scss';
import { toNodes } from '../lib/utils';
import { TreemapChartProps, TreemapInput } from '../types';
import { TreemapNode } from '@/shared/interface/treemap';

/** Узел для Recharts */
type TreemapDatum = {
  name: string;
  size?: number;
  sentimentScore?: number;
  color?: string;
  children?: readonly TreemapDatum[];
  [key: string]: string | number | readonly TreemapDatum[] | undefined;
};

type CustomContentProps = {
  x: number;
  y: number;
  width: number;
  height: number;
  name: string;
  size?: number;
  value?: number;
  rootTotal?: number;
  minSize?: number;
  maxSize?: number;
  sentimentScore?: number;
  color?: string;
};

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

const CustomizedContent: React.FC<CustomContentProps> = (props) => {
  const {
    x,
    y,
    width,
    height,
    name,
    size,
    value,
    rootTotal = 0,
    minSize = 0,
    maxSize = 1,
    sentimentScore,
    color,
  } = props;

  const val = typeof size === 'number' ? size : typeof value === 'number' ? value : 0;

  // fallback-цвет (если color не пришёл)
  const ratio = maxSize === minSize ? 1 : (val - minSize) / (maxSize - minSize);
  const shade = Math.round(90 + ratio * 130);
  const fallbackFill = `rgb(${shade}, ${shade}, ${shade})`;
  const fill = color || fallbackFill;

  // динамика шрифтов
  const minWH = Math.min(width, height);
  const badgeFontSize = clamp(Math.floor(minWH * 0.14), 12, 16);
  const percentFontSize = clamp(Math.floor(minWH * 0.28), 12, 32);

  const labelPaddingX = 6;
  const labelPaddingY = 4;
  const percent = rootTotal > 0 ? Math.round((val / rootTotal) * 100) : 0;

  const textRef = React.useRef<SVGTextElement | null>(null);
  const [textWidth, setTextWidth] = React.useState(0);
  React.useEffect(() => {
    if (textRef.current) setTextWidth(textRef.current.getBBox().width);
  }, [name, badgeFontSize]);

  const showTexts = width > 60 && height > 50;

  return (
    <g style={{ cursor: 'default' }}>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={8}
        ry={8}
        style={{ fill, stroke: '#fff', strokeWidth: 4 }}
      />

      {showTexts ? (
        <>
          {/* бейдж под текст */}
          <rect
            x={x + 8}
            y={y + 6}
            rx={6}
            ry={6}
            fill="#fff"
            stroke="#fff"
            strokeWidth={1}
            width={textWidth + labelPaddingX * 2}
            height={badgeFontSize + labelPaddingY * 2}
          />
          <text
            ref={textRef}
            x={x + 8 + labelPaddingX}
            y={y + 6 + badgeFontSize + labelPaddingY / 2}
            fontSize={badgeFontSize}
            fontWeight={500}
            fill="#000"
            stroke="none"
          >
            #{name}
          </text>

          {/* проценты — отступ 8px от бейджа */}
          <text
            x={x + 10}
            y={y + 6 + badgeFontSize + labelPaddingY * 2 + 8 + percentFontSize}
            fontSize={percentFontSize}
            fontWeight={700}
            fill="#000"
            stroke="none"
          >
            {percent}%
          </text>
        </>
      ) : null}

      <foreignObject x={x} y={y} width={width} height={height} pointerEvents="auto">
        <div
          style={{
            width: '100%',
            height: '100%',
            pointerEvents: 'auto',
            background: 'transparent',
          }}
        >
          <AntTooltip
            title={
              <div style={{ display: 'grid', gap: 4 }}>
                <div style={{ fontWeight: 600 }}>{name}</div>
                <div>Вес: {val}</div>
                <div>Доля: {percent}%</div>
                <div>Сентимент: {sentimentScore}</div>
              </div>
            }
            placement="topLeft"
            mouseEnterDelay={0}
            mouseLeaveDelay={0.05}
          >
            <div style={{ width: '100%', height: '100%' }} />
          </AntTooltip>
        </div>
      </foreignObject>
    </g>
  );
};

type BaseContentProps = Omit<CustomContentProps, 'minSize' | 'maxSize' | 'rootTotal'> & {
  payload?: TreemapDatum;
};

export const TreemapChart: React.FC<TreemapChartProps> = ({ data, height = 500, title }) => {
  const nodes = useMemo<TreemapNode[]>(() => toNodes(data as TreemapInput), [data]);

  const { minSize, maxSize, rootTotal } = useMemo(() => {
    const sizes = nodes.map((n) => Number(n.size ?? 0));
    const mn = sizes.length ? Math.min(...sizes) : 0;
    const mx = sizes.length ? Math.max(...sizes) : 1;
    const total = sizes.reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0);
    return { minSize: mn, maxSize: mx, rootTotal: total };
  }, [nodes]);

  const leafs: readonly TreemapDatum[] = useMemo(
    () =>
      nodes.map<TreemapDatum>((n) => ({
        name: n.name,
        size: n.size,
        sentimentScore: n.sentimentScore,
        color: n.color,
      })),
    [nodes],
  );

  const rechartsData: readonly TreemapDatum[] = useMemo(
    () => [{ name: 'root', children: leafs }],
    [leafs],
  );

  const content = (p: BaseContentProps): JSX.Element => (
    <CustomizedContent
      {...p}
      minSize={minSize}
      maxSize={maxSize}
      rootTotal={rootTotal}
      sentimentScore={p.sentimentScore ?? (p.payload?.sentimentScore as number | undefined)}
      color={p.color ?? (p.payload?.color as string | undefined)}
    />
  );

  const containerStyle: React.CSSProperties & Record<'--treemap-h', string> = {
    ['--treemap-h']: `${height}px`,
  };

  return (
    <div className={styles.wrap} style={containerStyle}>
      {title ? <h6 className={styles.h6}>{title}</h6> : null}
      <div className={styles.container}>
        <ResponsiveContainer>
          <Treemap
            data={rechartsData}
            dataKey="size"
            stroke="#fff"
            fill="#8884d8"
            content={content}
            isAnimationActive={false}
          />
        </ResponsiveContainer>
      </div>
    </div>
  );
};
