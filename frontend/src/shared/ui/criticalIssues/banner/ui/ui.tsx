// src/entities/critical-block/ui/Banner.tsx
'use client';

import React, { useMemo } from 'react';
import { Button, Tooltip } from 'antd';
import styles from './ui.module.scss';
import { VARIANT_PRESETS } from '../../model';
import { CriticalBlockProps } from '../../types';

type BannerProps = CriticalBlockProps & { onOpen: () => void };

export function Banner({
  data,
  title = 'Инсайт',
  ctaLabel = 'Подробнее',
  variant = 'insight',
  tokens,
  sortBy = 'negativeShare',
  sortDir = 'desc',
  limit,
  onOpen,
}: BannerProps) {
  const preset = VARIANT_PRESETS[variant];
  const t = { ...preset, ...(tokens ?? {}) };

  type Row = (typeof data.rows)[number];
  type SortKey = 'negativeShare' | 'volume' | 'aspect';

  const sorted = useMemo(() => {
    const rows = [...data.rows];

    const getVal = (r: Row, key: SortKey): number | string => {
      if (key === 'negativeShare' || key === 'volume') {
        return typeof r[key] === 'number' ? (r[key] as number) : 0;
      }
      // key === 'aspect'
      return r.aspect ?? '';
    };

    rows.sort((a, b) => {
      const va = getVal(a, sortBy as SortKey);
      const vb = getVal(b, sortBy as SortKey);

      let cmp = 0;
      if (typeof va === 'number' && typeof vb === 'number') {
        cmp = va - vb;
      } else {
        const sa = String(va);
        const sb = String(vb);
        cmp = sa > sb ? 1 : sa < sb ? -1 : 0;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return typeof limit === 'number' ? rows.slice(0, limit) : rows;
  }, [data.rows, limit, sortBy, sortDir]);

  const bannerText = useMemo(() => {
    const firstWithDesc = sorted.find((r) => r.description?.trim());
    if (firstWithDesc?.description) return firstWithDesc.description!;
    const titles = sorted.slice(0, 3).map((r) => r.aspect);
    return titles.length ? titles.join(' · ') : 'Нет данных';
  }, [sorted]);

  return (
    <div className={styles.banner}>
      <div className={styles.left}>
        <span className={styles.icon} style={{ color: t.accentColor }}>
          {t.icon}
        </span>
        <span className={styles.title}>{title}</span>
      </div>

      <Tooltip title={bannerText}>
        <div className={styles.preview}>{bannerText}</div>
      </Tooltip>

      <div className={styles.right}>
        <Button onClick={onOpen} className={styles.cta}>
          {ctaLabel}
        </Button>
      </div>
    </div>
  );
}
