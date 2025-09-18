import { TreemapNode, TreemapResponse } from '@/shared/interface/treemap';
import { TreemapInput } from '../types';

/** Type guard: это TreemapResponse? (имеет поле data: TreemapNode[]) */
export function isTreemapResponse(x: TreemapInput): x is TreemapResponse {
  return (
    typeof x === 'object' && x !== null && 'data' in x && Array.isArray((x as TreemapResponse).data)
  );
}

/** Нормализация входа к массиву листьев */
export function toNodes(input: TreemapInput): TreemapNode[] {
  return Array.isArray(input) ? input : Array.isArray(input.data) ? input.data : [];
}

/** Генерация запасного цвета (градиент: красный → зелёный по sentimentScore 0..100) */
export function fallbackColor(sentimentScore: number): string {
  const sClamped = Number.isFinite(sentimentScore)
    ? Math.max(0, Math.min(100, sentimentScore))
    : 50;
  const hue = 120 * (sClamped / 100); // 0=red, 120=green
  return `hsl(${Math.round(hue)} 80% 50%)`;
}

/** Собираем листья (всегда с валидным color) */
export function collectLeaves(input: TreemapInput): TreemapNode[] {
  const nodes = toNodes(input);
  return nodes.map((n): TreemapNode => {
    const name = String(n.name);
    const size = Number(n.size ?? 0);
    const sentimentScore = Number(n.sentimentScore ?? 0);
    const color =
      typeof n.color === 'string' && n.color.trim() ? n.color : fallbackColor(sentimentScore); // ✅ теперь только один аргумент

    return { name, size, sentimentScore, color };
  });
}

/** Суммарный размер */
export function totalSize(input: TreemapInput): number {
  const nodes = toNodes(input);
  return nodes.reduce((acc, n) => acc + Number(n.size ?? 0), 0);
}
