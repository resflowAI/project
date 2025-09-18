'use client';

import React from 'react';
import ReactDOM from 'react-dom';
import dayjs from 'dayjs';
import 'dayjs/locale/ru';
import styles from './ui.module.scss';

/** Координаты тултипа относительно контейнера графика */
export type TooltipCoord = { x: number; y: number };

/** Информация, которую отдаёт Recharts в кастомный тултип */
export type SparkTooltipData = {
  active?: boolean;
  label?: string | number;
  payload?: Array<{ value: number; color?: string }>;
};

export type SparkTooltipProps = {
  /** Абсолютные координаты контейнера графика (getBoundingClientRect) + скролл */
  containerRect: DOMRect;
  scrollX: number;
  scrollY: number;

  coord?: TooltipCoord; // координаты от Recharts (относительно контейнера)
  color: string; // цвет серии по умолчанию
  seriesLabel: string; // подпись ряда
  dateFormat?: string; // формат даты dayjs
  incompleteBadge?: boolean | string; // бейдж
  formatValue?: (v: number) => string;

  data: SparkTooltipData;
};

export const SparkTooltip = ({
  containerRect,
  scrollX,
  scrollY,
  coord,
  color,
  seriesLabel,
  dateFormat = 'dddd, D MMMM YYYY',
  incompleteBadge,
  formatValue = (v) => `${v}`,
  data,
}: SparkTooltipProps) => {
  if (typeof window === 'undefined') return null;
  const { active, payload, label } = data;
  if (!active || !payload?.length || !coord) return null;

  const first = payload[0];
  if (!first) return null;

  const v = Number(first.value);
  const dotColor = first.color ?? color;

  // абсолютная позиция на странице (портал в body)
  const top = containerRect.top + coord.y + scrollY - 56; // чуть выше курсора
  const left = containerRect.left + coord.x + scrollX - 20; // сдвиг влево

  return ReactDOM.createPortal(
    <div className={styles.root} style={{ top, left }}>
      <div className={styles.card}>
        {incompleteBadge ? (
          <div className={styles.badge}>
            <span className={styles.badgeIco}>!</span>
            <span>
              {typeof incompleteBadge === 'string' ? incompleteBadge : 'Данные за неполный период'}
            </span>
          </div>
        ) : null}

        <div className={styles.date}>{dayjs(String(label)).locale('ru').format(dateFormat)}</div>

        <div className={styles.row}>
          <span className={styles.dot} style={{ background: dotColor }} />
          <span className={styles.label}>{seriesLabel}</span>
          <span className={styles.value}>{formatValue(v)}</span>
        </div>

        <div className={styles.tail} />
      </div>
    </div>,
    document.body,
  );
};
