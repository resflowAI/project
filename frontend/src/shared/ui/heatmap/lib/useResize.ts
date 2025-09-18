import { useEffect, useState } from 'react';

export function useResizeObserver<T extends HTMLElement>() {
  const [el, setEl] = useState<T | null>(null);
  const [rect, setRect] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  useEffect(() => {
    if (!el) return;
    const obs = new ResizeObserver((entries: ResizeObserverEntry[]) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      setRect({ width, height });
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, [el]);

  // Возвращаем колбэк-реф строго типизированным как RefCallback<T>
  return { ref: (node: T | null) => setEl(node), size: rect } as const;
}
