import { ID, ISODateString } from './globalTypes';

/** Одна точка времени. X = t. В объекте могут быть сразу несколько Y-метрик. */
export interface TsPoint {
  t: ISODateString; // например "2025-09-24"
  [metricKey: string]: number | string | null; // null допустим, когда fillMissing='null'
}

export interface TsSeriesDef {
  key: string;
  label: string;
  yAxis?: 'left' | 'right';
}

export interface LineTimeseriesResponse {
  id: ID;
  title?: string;
  data: TsPoint[];
  series: TsSeriesDef[];
  yLeftDomain?: [number | null, number | null];
  yRightDomain?: [number | null, number | null];
}
