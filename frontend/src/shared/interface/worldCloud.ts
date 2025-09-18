// Ответ бэка
export interface IWordCloudResponse {
  id: string;
  words: Array<{
    word: string;
    mentions: number;
    avg_rating: number;
    color?: string;
  }>;
}

// То, что отрисовывает компонент
export interface IUiWordItem {
  text: string; // слово
  value: number; // вес (обычно mentions)
  color?: string; // цвет из бэка
  mentions: number; // для тултипа
  avgRating: number; // для тултипа
}

// Пропсы UI-компонента
export interface WordCloudProps {
  title?: string;
  items: IUiWordItem[]; // ГЛАВНОЕ: все данные приходят через props
  height?: number; // px, по умолчанию 360
  minFont?: number; // по умолчанию 12
  maxFont?: number; // по умолчанию 48
}
