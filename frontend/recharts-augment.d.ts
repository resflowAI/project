// src/types/recharts-augment.d.ts
import 'recharts';

declare module 'recharts' {
  // В библиотеке проп есть, но не описан
  interface TreemapProps {
    /** Максимальная глубина развёртки дерева */
    depth?: number;
  }
}
