import { ID } from './globalTypes';

/**
 * Recharts Treemap ожидает иерархический массив/дерево с полями name, size/children. :contentReference[oaicite:5]{index=5}
 */
export interface TreemapNode {
  name: string; // подпись прямоугольника
  size?: number; // величина (если лист)
  sentimentScore?: number; // -1..1 (для заливки цветом на фронте)
  color: string;
  children?: TreemapNode[];
}

export interface TreemapResponse {
  id: ID;
  title: string; // подпись прямоугольника
  size?: number; // величина (если лист)
  sentimentScore?: number; // -1..1 (для заливки цветом на фронте)
  data?: TreemapNode[]; // дочерние узлы (для иерархии)
}
