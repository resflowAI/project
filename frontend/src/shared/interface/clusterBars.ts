import { ID, TimeRange } from './globalTypes';

/** Строка для BarChart: одна категория = один объект данных */
export interface ClusterBarRow {
  name: string; // XAxis dataKey="name" (название кластера/аспекта/продукта)
  mentions?: number; // для обычных столбцов (объём)
  positive?: number; // для stacked баров по тональностям
  neutral?: number;
  negative?: number;
  [extra: string]: number | string | undefined; // для дополнительных серий
}

/** Ответ по топ-кластерам / разбивкам */
export interface ClusterBarsResponse {
  id: ID;
  title: string;
  period: TimeRange;
  data: ClusterBarRow[];
  /** Какие серии показывать столбцами (по порядку отрисовки/stack order). :contentReference[oaicite:4]{index=4} */
  barKeys: string[]; // напр. ["positive","neutral","negative"] или ["mentions"]
  stacked?: boolean; // true — рисуем stacked (sum)
  normalize100?: boolean; // true — нормируем к 100% (shares)
}
