export interface HeatmapCell {
  /** Ключ колонки (ось X) */
  x: string | number;
  /** Ключ строки (ось Y) */
  y: string | number;
  /** Значение интенсивности */
  v: number;
}

export interface HeatmapData {
  /** Явный порядок значений по оси X (иначе выводится из данных) */
  xOrder?: Array<string | number>;
  /** Явный порядок значений по оси Y */
  yOrder?: Array<string | number>;
  /** Список ячеек (разреженное представление) */
  cells: HeatmapCell[];
  /** Доп. метаданные для подписей и форматирования */
  meta?: {
    xLabel?: string;
    yLabel?: string;
    vLabel?: string;
    vMin?: number; // нижняя граница шкалы
    vMax?: number; // верхняя граница шкалы
    decimals?: number; // кол-во знаков для форматирования
  };
}

export type PaletteName = 'green' | 'red' | 'blue' | 'gray';

export interface HeatmapProps {
  /** Данные теплограммы */
  data: HeatmapData;
  /** Палитра или своя функция раскраски */
  colorScale?: PaletteName | ((v: number, vMin: number, vMax: number) => string);
  /** Отступ между ячейками, px */
  gap?: number;
  /** Скругление ячеек, px */
  radius?: number;
  /** Показать легенду */
  showLegend?: boolean;
  /** Кастомный форматтер значений */
  formatValue?: (v: number) => string;
  /** Обработчик клика по ячейке */
  onCellClick?: (cell: HeatmapCell) => void;
  /** Высота области графика, px */
  height?: number;
  /** Заголовок блока */
  title?: string;
  /** Включить белый фон */
  withBackground?: boolean;
  /** Включить внутренние отступы */
  withPadding?: boolean;
}
