import { useMappedSWR } from '@/shared/api/useMappedSWR';
import { formatFixed, toNumberSafe } from '@/shared/lib/format/number';
import { useFiltersStore } from '@/shared/filterStore/model/store';
import type { KpiCardPayload } from '@/shared/interface/kpiCars';

type AverageMarkRes = { id: string; value: string };

export function useAverageRatingKpi(concurrent?: string) {
  const title = 'Средний рейтинг';
  const { period, range, extra } = useFiltersStore().value;
  return useMappedSWR<AverageMarkRes, KpiCardPayload>(
    ['/metrics/average_mark', { params: { period, range, extra, concurrent } }],
    (api) => ({
      id: api.id,
      title,
      value: formatFixed(toNumberSafe(api.value), 2),
      unit: '★',
      period: {
        from: range && range[0] ? range[0].toISOString() : '',
        to: range && range[1] ? range[1].toISOString() : '',
        granularity: undefined,
      },
      compare: undefined,
      sparkline: undefined,
    }),
  );
}
