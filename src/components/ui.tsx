import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { RIASEC_KEYS, type YouthProfile } from '../domain/types';
import { radarPoints, toPath } from '../lib/radar';

export function StarIcon({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M12 2L14.8 9.2L22 12L14.8 14.8L12 22L9.2 14.8L2 12L9.2 9.2L12 2Z" />
    </svg>
  );
}

export function Logo({ to = '/', light = false }: { to?: string; light?: boolean }) {
  return (
    <Link to={to} className={`logo${light ? ' logo--light' : ''}`} aria-label="PolarIA, accueil">
      <StarIcon size={22} className="logo__star" />
      <span>
        Polar<span className="logo__ia">IA</span>
      </span>
    </Link>
  );
}

export function TagBadge({ tag, tone = 'light' }: { tag: string; tone?: 'light' | 'dark' }) {
  return <span className={`tag tag--${tone}`}>#{tag}</span>;
}

export function RadarChart({ profile, size = 260 }: { profile: YouthProfile; size?: number }) {
  const c = size / 2;
  const r = size / 2 - 56;
  const values = RIASEC_KEYS.map((k) => profile.riasec[k]);
  const rings = [25, 50, 75, 100];
  const axes = radarPoints(RIASEC_KEYS.map(() => 100), r, c);
  const labels = radarPoints(RIASEC_KEYS.map(() => 100), r + 24, c);
  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className="radar"
      role="img"
      aria-label={`Profil RIASEC : ${RIASEC_KEYS.map((k) => `${k} ${profile.riasec[k]}`).join(', ')}`}
      data-testid="radar"
    >
      {rings.map((ring) => (
        <polygon key={ring} points={toPath(radarPoints(RIASEC_KEYS.map(() => ring), r, c))} className="radar__ring" />
      ))}
      {axes.map((p, i) => (
        <line key={i} x1={c} y1={c} x2={p.x} y2={p.y} className="radar__axis" />
      ))}
      <polygon points={toPath(radarPoints(values, r, c))} className="radar__shape" />
      {radarPoints(values, r, c).map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={3.5} className="radar__dot" />
      ))}
      {labels.map((p, i) => (
        <text key={i} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle" className="radar__label">
          {RIASEC_KEYS[i]}
        </text>
      ))}
    </svg>
  );
}

export function TagBars({ scores, limit = 6 }: { scores: Array<[string, number]>; limit?: number }) {
  const top = scores.slice(0, limit);
  const max = Math.max(20, ...top.map(([, s]) => s));
  if (!top.length) return <p className="muted">Aucun tag pour l’instant.</p>;
  return (
    <ul className="bars" data-testid="tag-bars">
      {top.map(([tag, score]) => (
        <li key={tag} className="bars__row">
          <span className="bars__label">{tag}</span>
          <span className="bars__track">
            <span className="bars__fill" style={{ width: `${(score / max) * 100}%` }} />
          </span>
          <span className="bars__value" data-testid={`tag-score-${tag}`}>
            {score}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function RgpdBadge() {
  return (
    <p className="rgpd" data-testid="rgpd-badge">
      <span aria-hidden="true">🔒</span> Mode RGPD actif : suivi uniquement par tags d’orientation, aucune donnée médicale
      stockée.
    </p>
  );
}

/** Micro-toast éphémère ; la clé force la ré-animation à chaque message. */
export function useToast(duration = 1600) {
  const [toast, setToast] = useState<{ id: number; text: string } | null>(null);
  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), duration);
    return () => window.clearTimeout(t);
  }, [toast, duration]);
  return {
    toast,
    show: (text: string) => setToast({ id: Date.now(), text }),
  };
}

export function Toast({ toast }: { toast: { id: number; text: string } | null }) {
  return (
    <div className="toast-zone" aria-live="polite">
      {toast && (
        <div key={toast.id} className="toast" data-testid="toast">
          {toast.text}
        </div>
      )}
    </div>
  );
}
