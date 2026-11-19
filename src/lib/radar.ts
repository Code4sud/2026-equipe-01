export interface Point {
  x: number;
  y: number;
}

/**
 * Sommets d'un polygone radar. Le premier axe pointe vers le haut et les axes
 * tournent dans le sens horaire. Les valeurs sont bornées à [0, max].
 */
export function radarPoints(values: readonly number[], radius: number, center: number, max = 100): Point[] {
  const n = values.length;
  return values.map((raw, i) => {
    const v = Number.isFinite(raw) ? Math.min(max, Math.max(0, raw)) : 0;
    const angle = -Math.PI / 2 + (2 * Math.PI * i) / n;
    const r = (v / max) * radius;
    return { x: round(center + r * Math.cos(angle)), y: round(center + r * Math.sin(angle)) };
  });
}

export function toPath(points: readonly Point[]): string {
  return points.map((p) => `${p.x},${p.y}`).join(' ');
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
