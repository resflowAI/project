import { PaletteName } from "@/shared/interface/hitmap";

const clamp01 = (t: number): number => Math.max(0, Math.min(1, t));
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

function hsl(h: number, s: number, l: number): string {
  return `hsl(${Math.round(h)} ${Math.round(s)}% ${Math.round(l)}%)`;
}

export function scaleGreen(v: number, vMin: number, vMax: number): string {
  const t = clamp01((v - vMin) / Math.max(1e-9, vMax - vMin));
  return hsl(lerp(60, 140, t), 70, 45);
}

export function scaleRed(v: number, vMin: number, vMax: number): string {
  const t = clamp01((v - vMin) / Math.max(1e-9, vMax - vMin));
  return hsl(lerp(10, 0, t), 70, 50);
}

export function scaleBlue(v: number, vMin: number, vMax: number): string {
  const t = clamp01((v - vMin) / Math.max(1e-9, vMax - vMin));
  return hsl(lerp(190, 230, t), 70, 50);
}

export function scaleGray(v: number, vMin: number, vMax: number): string {
  const t = clamp01((v - vMin) / Math.max(1e-9, vMax - vMin));
  const l = lerp(90, 25, t);
  return hsl(0, 0, l);
}

export function getPaletteFn(kind: PaletteName): (v: number, vMin: number, vMax: number) => string {
  switch (kind) {
    case 'red':
      return scaleRed;
    case 'blue':
      return scaleBlue;
    case 'gray':
      return scaleGray;
    default:
      return scaleGreen;
  }
}
