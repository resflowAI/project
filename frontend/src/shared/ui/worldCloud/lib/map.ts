import { WordCloudData } from '@/app/(routing)/persona/api/useWordCloud';
import { IUiWordItem, IWordCloudResponse } from '@/shared/interface/worldCloud';

export function mapWordCloudDefault(api: IWordCloudResponse): WordCloudData {
  const items: IUiWordItem[] = (api.words ?? []).map((w) => ({
    text: w.word,
    value: w.mentions,
    color: w.color,
    mentions: w.mentions,
    avgRating: w.avg_rating,
  }));
  return { id: api.id, items };
}
