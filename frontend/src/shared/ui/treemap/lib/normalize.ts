import { TreemapNode, TreemapResponse } from '@/shared/interface/treemap';
import { TreemapInput } from '../types';

/** Узел для Recharts Treemap */
export type RechartsTreemapNode = {
  name: string;
  size?: number;
  sentimentScore?: number;
  children?: RechartsTreemapNode[];
};

function normalizeNode(n: TreemapNode): RechartsTreemapNode {
  return {
    name: n.name,
    size: n.size,
    sentimentScore: n.sentimentScore,
    children: n.children?.map(normalizeNode),
  };
}

// Приводим к структуре Recharts: children вместо data
export function normalizeToRecharts(node: TreemapResponse): RechartsTreemapNode {
  return {
    name: node.title,
    size: node.size,
    sentimentScore: node.sentimentScore,
    children: node.data?.map(normalizeNode),
  };
}

// Если приходит массив листьев, оборачиваем корнем
export function wrapIfArray(input: TreemapInput): RechartsTreemapNode {
  if (Array.isArray(input)) {
    return {
      name: 'root',
      children: input.map(normalizeNode),
    };
  }
  return normalizeToRecharts(input);
}
