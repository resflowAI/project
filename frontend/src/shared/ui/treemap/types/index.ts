import { TreemapNode, TreemapResponse } from '@/shared/interface/treemap';

export type TreemapInput = TreemapResponse | TreemapNode[];

export interface TreemapChartProps {
  data: TreemapInput;
  height?: number;
  title: string;
  color?: string;
}
