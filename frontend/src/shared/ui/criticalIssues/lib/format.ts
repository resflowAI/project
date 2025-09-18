export const formatPercent = (p?: number) =>
  p == null || Number.isNaN(p) ? '—' : `${Math.round(p * 100)}%`;
