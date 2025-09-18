import { CriticalIssueRow, CriticalIssuesResponse } from '@/shared/interface/criticalIssues';

/** Готовые варианты оформления */
export type CriticalVariant = 'issue' | 'insight' | 'recommendation';

export type TokenOverrides = Partial<{
  accentColor: string;
  icon: React.ReactNode;
  tagColor: string; // цвет тега «негатив %»/«приоритет»
  tagLabelBuilder: (row: CriticalIssueRow) => string | null;
}>;

export type SortKey = 'negativeShare' | 'volume' | 'aspect';

export type CriticalBlockProps = {
  data: CriticalIssuesResponse;
  title?: string;
  ctaLabel?: string;

  /** Вариант оформления (подбирает цвета, иконки и логику бейджа) */
  variant?: CriticalVariant;

  /** Тонкая кастомизация поверх варианта */
  tokens?: TokenOverrides;

  /** Сколько строк показывать в модалке (truncate) */
  limit?: number;

  /** Сортировка */
  sortBy?: SortKey;
  sortDir?: 'asc' | 'desc';

  /** Баннер: сколько строк preview (2 по умолчанию). */
  bannerLines?: 1 | 2 | 3;

  /** Полный контроль над строкой в модалке, если нужно */
  renderRow?: (row: CriticalIssueRow) => React.ReactNode;
};
