'use client';

import React from 'react';
import { Card } from 'antd';
import styles from './ui.module.scss';
import { ParetoChart } from '../paretoChart';
import { ParetoChartProps } from '@/shared/interface/pareto';

export const ParetoCard: React.FC<ParetoChartProps> = ({ response, height }) => {
  return (
    <Card className={styles.card} bordered>
      <div className={styles.cardHeader}>
        <div className={styles.title}>{response.title}</div>
      </div>

      <div className={styles.chart}>
        <ParetoChart response={response} height={height} />
      </div>
    </Card>
  );
};
