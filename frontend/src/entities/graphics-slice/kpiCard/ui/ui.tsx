// src/entities/kpi/ui/KpiCard/KpiCard.tsx
'use client';

import React from 'react';
import { Skeleton } from 'antd';
import { formatInt, formatDeltaRaw } from '@/shared/lib/format/number';
import styles from './ui.module.scss';
import type { KpiCardPayload } from '@/shared/interface/kpiCars';

export type KpiCardProps = {
  data?: KpiCardPayload; // делаем необязательным, если loading=true
  /** цвет для акцентов/графика, на будущее */
  color?: string;
  /** если true — вместо содержимого рисуем Skeleton */
  loading?: boolean;
};

export const KpiCard = ({ data, color, loading }: KpiCardProps) => {
  if (loading) {
    return (
      <div className={styles.card}>
        <div className={styles.header}>
          <Skeleton.Input active size="small" style={{ width: '100%' }} />
        </div>
        <div className={styles.valueRow}>
          <Skeleton.Input active size="small" style={{ width: '100%' }} />
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { title, value, unit, compare } = data;
  const delta = formatDeltaRaw(compare);

  return (
    <div className={styles.card} style={{ borderColor: color }}>
      <div className={styles.header}>
        <h6 title={title} className={styles.title}>
          {title}
        </h6>
      </div>

      <div className={styles.valueRow}>
        <h4 title={value} className={styles.value}>
          {isNaN(Number(value)) ? value : formatInt(Number(value))}
        </h4>
        {unit && <div className={styles.unit}>{unit}</div>}

        {compare && (
          <div className={`${styles.delta} ${styles[delta.sign]}`}>
            <span className={styles.arrow}>
              {delta.sign === 'up' ? '▲' : delta.sign === 'down' ? '▼' : '•'}
            </span>
            <p>{delta.text}</p>
          </div>
        )}
      </div>
    </div>
  );
};
