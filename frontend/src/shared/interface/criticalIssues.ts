import { ID } from './globalTypes';

export interface CriticalIssueRow {
  id: ID;
  aspect: string; // название проблемы/аспекта
  negativeShare: number; // доля негатива (0..1)
  volume?: number; // объём упоминаний
  description?: string;
}

export interface CriticalIssuesResponse {
  updatedAt: string;
  rows: CriticalIssueRow[];
}
