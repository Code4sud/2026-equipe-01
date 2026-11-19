import { useEffect, useState, useSyncExternalStore } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart as RechartsRadar } from 'recharts';
import { RIASEC_KEYS, type YouthProfile } from '../domain/types';
import { dynamicRiasec } from '../engine/riasec';

/**
 * Étoile à 4 branches. DA v3 : réservée au logo PolarIA et au bouton
 * « Étoile » du feed (vérifié par test), jamais en décoration de titre.
 */
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

/**
 * Radar RIASEC réactif (Recharts) : pointillés = bilan, rose = « aujourd'hui »
 * (bilan + exploration). Il s'anime dès qu'un score de tag change.
 */
export function RadarChart({ profile, size = 280 }: { profile: YouthProfile; size?: number }) {
  const live = dynamicRiasec(profile);
  const data = RIASEC_KEYS.map((k) => ({ axe: k, bilan: profile.riasec[k], live: live[k] }));
  return (
    <figure
      className="radar-wrap"
      role="img"
      aria-label={`Profil RIASEC actuel : ${RIASEC_KEYS.map((k) => `${k} ${live[k]}`).join(', ')}`}
      data-testid="radar"
      data-values={RIASEC_KEYS.map((k) => live[k]).join(',')}
    >
      <RechartsRadar width={size} height={size} data={data} outerRadius="58%" className="radar">
        <PolarGrid stroke="rgba(91, 95, 246, 0.18)" />
        <PolarAngleAxis dataKey="axe" tick={{ fill: '#434873', fontSize: 11, fontWeight: 600 }} />
        <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
        <Radar
          name={profile.hasBilan ? 'Bilan' : 'Estimation'}
          dataKey="bilan"
          stroke="#0ea5e9"
          strokeWidth={1.5}
          strokeDasharray="4 4"
          fill="none"
          isAnimationActive={false}
        />
        <Radar
          name="Aujourd’hui"
          dataKey="live"
          stroke="#e12d8b"
          strokeWidth={2.5}
          fill="#e12d8b"
          fillOpacity={0.18}
          dot={{ r: 3, fill: '#e12d8b', strokeWidth: 0 }}
          animationDuration={500}
        />
      </RechartsRadar>
      <figcaption className="radar__legend">
        <span>
          <i className="legend legend--base" /> {profile.hasBilan ? 'Bilan' : 'Estimation'}
        </span>
        <span>
          <i className="legend legend--live" /> Aujourd’hui sur PolarIA
        </span>
      </figcaption>
    </figure>
  );
}

/** Barres d'affinités sur 2 niveaux : nom + score, puis barre pleine largeur (jamais de chevauchement). */
export function TagBars({ scores, limit = 6 }: { scores: Array<[string, number]>; limit?: number }) {
  const top = scores.slice(0, limit);
  const max = Math.max(20, ...top.map(([, s]) => s));
  if (!top.length) return <p className="muted small">Aucun tag pour l’instant.</p>;
  return (
    <ul className="bars" data-testid="tag-bars">
      {top.map(([tag, score]) => (
        <li key={tag} className="bars__row">
          <div className="bars__head">
            <span className="bars__label" title={tag}>
              {tag}
            </span>
            <span className="bars__value mono" data-testid={`tag-score-${tag}`}>
              {score}
            </span>
          </div>
          <span className="bars__track">
            <span className="bars__fill" style={{ width: `${(score / max) * 100}%` }} />
          </span>
        </li>
      ))}
    </ul>
  );
}

export function RgpdBadge() {
  return (
    <p className="rgpd" data-testid="rgpd-badge">
      <ShieldCheck size={16} aria-hidden="true" /> Mode RGPD actif : suivi uniquement par tags d’orientation, aucune donnée
      médicale stockée.
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

/** true au-dessus de 900 px (layout téléphone + panneau latéral). Faux en test (jsdom). */
export function useIsDesktop(): boolean {
  return useSyncExternalStore(
    (cb) => {
      if (typeof window.matchMedia !== 'function') return () => {};
      const mq = window.matchMedia('(min-width: 900px)');
      mq.addEventListener('change', cb);
      return () => mq.removeEventListener('change', cb);
    },
    () => typeof window.matchMedia === 'function' && window.matchMedia('(min-width: 900px)').matches,
    () => false,
  );
}
