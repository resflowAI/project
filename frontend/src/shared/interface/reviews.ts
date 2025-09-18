export type BackendValidationIssue = {
  loc: (string | number)[];
  msg: string;
  type: string;
};

export type BackendErrorResponse = {
  detail: BackendValidationIssue[];
};
export type OrderDir = 'ASC' | 'DESC';

export type CommentTableQuery = {
  limit?: number;
  offset?: number;
  service?: string;
  start_date?: string; // YYYY-MM-DD
  end_date?: string; // YYYY-MM-DD
  min_rating?: number;
  max_rating?: number;
  text?: string;
  date_order?: OrderDir; // default на бэке: DESC
  rating_order?: OrderDir;
};

export type CommentRow = {
  id: string | number;
  date: string; // ISO / YYYY-MM-DD
  rating?: number; // 0..5
  service?: string;
  author?: string;
  source?: string;
  text: string;
  tags?: Record<string, number>;
};

export type CommentTableResponse = {
  total: number;
  limit: number;
  offset: number;
  rows: CommentRow[];
};
export type CommentsCountResponse = {
  id: string;
  value: string; // число в строке
};
