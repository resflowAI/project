import { http } from './axios';
import type { MetricQuery } from './metricQuery';

/** Try to extract filename from Content-Disposition header */
function parseFilename(cd?: string | null): string | null {
  if (!cd) return null;
  const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/.exec(cd);
  return match && typeof match[1] === 'string' ? decodeURIComponent(match[1]) : null;
}

export async function downloadCsv(endpoint: string, params: MetricQuery): Promise<void> {
  const res = await http.get(endpoint, { params, responseType: 'blob' });
  const blob = res.data as Blob;
  const cd = res.headers?.['content-disposition'] ?? res.headers?.['Content-Disposition'] ?? null;
  const filename = parseFilename(cd) ?? `${endpoint.replace(/[^a-z0-9.-]/gi, '_')}.csv`;

  // Trigger download in browser
  if (typeof window === 'undefined') return;
  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }
}
