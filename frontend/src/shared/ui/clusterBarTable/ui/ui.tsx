'use client';

import React, { useMemo } from 'react';
import { Card, Tooltip, Typography } from 'antd';
import styles from './ui.module.scss';
import type { ClusterBarRow } from '@/shared/interface/clusterBars';
import { labelVisible } from '../lib';

const { Text } = Typography;

export type SentimentRow = Pick<ClusterBarRow, 'name' | 'positive' | 'neutral' | 'negative'>;

export type SentimentColors = {
  positive: string;
  neutral: string;
  negative: string;
};

type Props = {
  title?: string;
  subtitle?: string;
  rows: SentimentRow[];
  normalize100?: boolean;
  colors?: SentimentColors;
  showPositiveDelta?: boolean;
  maxVisibleRows?: number; // 👈 максимум видимых строк без скролла
  className?: string;
};

function fmtPct(x: number): string {
  const v = Math.round(x);
  return `${v}%`;
}

function calcPercents(r: SentimentRow, normalize100: boolean) {
  const pos = r.positive ?? 0;
  const neu = r.neutral ?? 0;
  const neg = r.negative ?? 0;
  const mentions = pos + neu + neg;
  const total = pos + neu + neg || 1;

  const p = (pos * 100) / total;
  const n = (neu * 100) / total;
  const g = (neg * 100) / total;

  const sum = p + n + g;
  return sum
    ? {
        positive: (p * 100) / sum,
        neutral: (n * 100) / sum,
        negative: (g * 100) / sum,
        mentions,
      }
    : { positive: 0, neutral: 0, negative: 0 };
}

export const SentimentGap: React.FC<Props> = ({
  title = 'Sentiment Gap',
  subtitle = 'Распределение тональности',
  rows,
  normalize100 = true,
  colors = {
    positive: '#41B66E',
    neutral: '#B8BFCA',
    negative: '#E25555',
  },
  showPositiveDelta = true,
  maxVisibleRows = 5,
  className,
}) => {
  const computed = useMemo(
    () =>
      rows.map((r) => ({
        name: r.name,
        pct: calcPercents(r, normalize100),
      })),
    [rows, normalize100],
  );

  const positiveDelta = useMemo(() => {
    if (!showPositiveDelta || computed.length < 2) return null;
    const a = computed[0]?.pct.positive ?? 0;
    const b = computed[1]?.pct.positive ?? 0;
    const diff = Math.round(a - b);
    return { diff, sign: diff >= 0 ? '+' : '−' };
  }, [computed, showPositiveDelta]);

  return (
    <Card className={`${styles.card} ${className ?? ''}`} bodyStyle={{ padding: 16 }}>
      <div className={styles.header}>
        <Text className={styles.title}>{title}</Text>
        <Text type="secondary" className={styles.subtitle}>
          {subtitle}
        </Text>
      </div>

      <div
        className={styles.list}
        style={{
          maxHeight: `${maxVisibleRows * 56}px`, // ~56px на строку (28px бар + отступы)
          overflowY: rows.length > maxVisibleRows ? 'auto' : 'visible',
        }}
      >
        {computed.map(({ name, pct }) => (
          <div key={name} className={styles.row}>
            <div className={styles.name}>{name}</div>

            <div className={styles.barWrap}>
              <div className={styles.bar}>
                <Tooltip title={`${fmtPct(pct.positive)} позитивных`}>
                  <div
                    className={styles.segment}
                    style={{ width: `${pct.positive}%`, backgroundColor: colors.positive }}
                  >
                    {labelVisible(pct.positive) && (
                      <span className={styles.segLabel}>{fmtPct(pct.positive)}</span>
                    )}
                  </div>
                </Tooltip>

                <Tooltip title={`${fmtPct(pct.neutral)} нейтральных`}>
                  <div
                    className={styles.segment}
                    style={{ width: `${pct.neutral}%`, backgroundColor: colors.neutral }}
                  >
                    {labelVisible(pct.neutral) && (
                      <span className={`${styles.segLabel} ${styles.dark}`}>
                        {fmtPct(pct.neutral)}
                      </span>
                    )}
                  </div>
                </Tooltip>

                <Tooltip title={`${fmtPct(pct.negative)} негативных`}>
                  <div
                    className={styles.segment}
                    style={{ width: `${pct.negative}%`, backgroundColor: colors.negative }}
                  >
                    {labelVisible(pct.negative) && (
                      <span className={styles.segLabel}>{fmtPct(pct.negative)}</span>
                    )}
                  </div>
                </Tooltip>
              </div>

              <div className={styles.total}>{pct.mentions}</div>
            </div>
          </div>
        ))}
      </div>

      {showPositiveDelta && positiveDelta && (
        <div className={styles.footer}>
          <Text type="secondary">Преимущество по позитиву:</Text>{' '}
          <Text className={positiveDelta.diff >= 0 ? styles.deltaUp : styles.deltaDown}>
            {positiveDelta.diff >= 0 ? '+' : '−'}
            {Math.abs(positiveDelta.diff)}%
          </Text>
        </div>
      )}
    </Card>
  );
};
