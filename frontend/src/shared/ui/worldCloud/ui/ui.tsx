'use client';

import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Card, Empty, Tooltip } from 'antd';
import styles from './ui.module.scss';
import type { WordCloudProps as BaseProps, IUiWordItem } from '@/shared/interface/worldCloud';

type Props = BaseProps & {
  /** максимум слов для попытки отрисовать */
  maxWords?: number;
  /** отступ между словами (px) — анти-коллизия */
  padding?: number;
  /** максимальное число попыток на слово при укладке по спирали */
  maxAttemptsPerWord?: number;

  shrinkStep?: number; // 0.9 = минус 10%
};

/** ——— utils ——— */

/** детерминированный псевдослучайный генератор */
function xorshift32(seed: number): () => number {
  let x = seed | 0;
  return () => {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    return (x >>> 0) / 0xffffffff;
  };
}

/** детерминированная перемешка */
function shuffleDet<T>(arr: readonly T[], seed = 0x2f6e2b): T[] {
  const rnd = xorshift32(seed);
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    const ai = a[i]!;
    const aj = a[j]!;
    a[i] = aj;
    a[j] = ai;
  }
  return a;
}

/** sqrt-масштабирование value → [min, max] */
function sqrtScale(
  value: number,
  vMin: number,
  vMax: number,
  outMin: number,
  outMax: number,
): number {
  const lo = Math.max(vMin, 0);
  const hi = Math.max(vMax, lo + 1);
  const t = (Math.sqrt(value) - Math.sqrt(lo)) / (Math.sqrt(hi) - Math.sqrt(lo));
  const clamped = Number.isFinite(t) ? Math.min(1, Math.max(0, t)) : 0;
  return outMin + clamped * (outMax - outMin);
}

type PlacedWord = {
  text: string;
  x: number; // левый верх
  y: number; // левый верх
  w: number;
  h: number;
  fontSize: number;
  color?: string;
  mentions: number;
  avg: number;
};

function intersects(a: PlacedWord, b: PlacedWord, pad: number): boolean {
  return !(
    a.x + a.w + pad <= b.x ||
    b.x + b.w + pad <= a.x ||
    a.y + a.h + pad <= b.y ||
    b.y + b.h + pad <= a.y
  );
}

/** layout слов по прямоугольной спирали */
function layoutWords(
  words: IUiWordItem[],
  areaW: number,
  areaH: number,
  minFont: number,
  maxFont: number,
  pad: number,
  maxAttemptsPerWord: number,
  seed = 42,
  shrinkStep = 0.9, // 0.9 → -10% за итерацию
): PlacedWord[] {
  if (areaW <= 0 || areaH <= 0 || words.length === 0) return [];

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return [];

  const vMin = Math.min(...words.map((w) => w.value));
  const vMax = Math.max(...words.map((w) => w.value));
  const ordered = shuffleDet(words, seed).sort((a, b) => b.value - a.value);

  const placed: PlacedWord[] = [];
  const cx = areaW / 2;
  const cy = areaH / 2;

  const measure = (text: string, fs: number) => {
    ctx.font = `normal ${fs}px system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif`;
    const w = Math.ceil(ctx.measureText(text).width);
    const h = Math.ceil(fs * 1.2);
    return { w, h };
  };

  for (const it of ordered) {
    // стартовый размер по sqrt-scale
    const baseFs = Math.round(sqrtScale(it.value, vMin, vMax, minFont, maxFont));
    // уменьшаем до тех пор, пока не уложим или не дойдём до minFont
    let fs = baseFs;

    // ещё одна защита: если слово явно шире области — подгоняем под ширину
    const first = measure(it.text, fs);
    if (first.w + 2 * pad > areaW) {
      fs = Math.max(minFont, Math.floor((areaW - 2 * pad) / (first.w / baseFs)));
    }

    let placedOk = false;

    while (fs >= minFont && !placedOk) {
      const { w: wordW, h: wordH } = measure(it.text, fs);

      // прямоугольная спираль
      const step = 6;
      const maxSteps = Math.max(maxAttemptsPerWord, 200);

      placementLoop: for (let s = 0; s < maxSteps; s++) {
        const angle = s / 8;
        const r = step * (1 + s / 20);
        const x = Math.floor(cx + r * Math.cos(angle) - wordW / 2);
        const y = Math.floor(cy + r * Math.sin(angle) - wordH / 2);

        if (x < 0 || y < 0 || x + wordW > areaW || y + wordH > areaH) continue;

        const candidate: PlacedWord = {
          text: it.text,
          x,
          y,
          w: wordW,
          h: wordH,
          fontSize: fs,
          color: it.color,
          mentions: it.mentions,
          avg: it.avgRating,
        };

        let collision = false;
        for (const pw of placed) {
          if (intersects(candidate, pw, pad)) {
            collision = true;
            break;
          }
        }
        if (!collision) {
          placed.push(candidate);
          placedOk = true;
          break placementLoop;
        }
      }

      // не удалось — уменьшаем шрифт и пробуем ещё
      if (!placedOk) {
        const nextFs = Math.floor(fs * shrinkStep);
        if (nextFs === fs) break; // защита от зацикливания
        fs = nextFs;
      }
    }

    // если не получилось даже на minFont — пропускаем слово
  }

  return placed;
}

/** хук на размер контейнера */
function useElementSize<T extends HTMLElement>(ref: React.RefObject<T>) {
  const [size, setSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new ResizeObserver((entries) => {
      const cr = entries[0]?.contentRect;
      if (cr) setSize({ w: cr.width, h: cr.height });
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, [ref]);

  return size;
}

/** ——— компонент ——— */

export const WordCloud: React.FC<Props> = ({
  title = 'Облако слов',
  items,
  height = 360,
  minFont = 14,
  maxFont = 56,
  maxWords, // ⬅️ по умолчанию undefined → берём все
  padding = 10,
  maxAttemptsPerWord = 1200,
  shrinkStep = 0.9, // ⬅️ уменьшать шрифт на 10%, если не влезает
}) => {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const { w } = useElementSize(rootRef);

  // ⬇️ Больше НЕ режем по умолчанию: если maxWords не задан — берём всё
  const normalized = useMemo<IUiWordItem[]>(
    () =>
      (items ?? [])
        .filter((i) => i && i.text && Number.isFinite(i.value) && i.value > 0)
        .slice(0, maxWords ?? items.length),
    [items, maxWords],
  );

  const placed = useMemo<PlacedWord[]>(
    () =>
      w > 0
        ? layoutWords(
            normalized,
            w,
            height,
            minFont,
            maxFont,
            padding,
            maxAttemptsPerWord,
            42,
            shrinkStep,
          )
        : [],
    [normalized, w, height, minFont, maxFont, padding, maxAttemptsPerWord, shrinkStep],
  );

  return (
    <Card title={title} className={styles.card}>
      <div ref={rootRef} className={styles.cloud} style={{ height }}>
        {!placed.length ? (
          <Empty description="Нет данных" />
        ) : (
          placed.map((pw) => (
            <Tooltip
              key={`${pw.text}-${pw.x}-${pw.y}`}
              title={
                <div>
                  {pw.text}

                  <div>Упоминаний: {pw.mentions}</div>
                  <div>Средний рейтинг: {pw.avg.toFixed(2)}</div>
                </div>
              }
              mouseEnterDelay={0.05}
            >
              <span
                className={styles.word}
                style={{
                  transform: `translate(${pw.x}px, ${pw.y}px)`,
                  fontSize: pw.fontSize,
                  color: pw.color || 'inherit',
                }}
              >
                {pw.text}
              </span>
            </Tooltip>
          ))
        )}
      </div>
    </Card>
  );
};
