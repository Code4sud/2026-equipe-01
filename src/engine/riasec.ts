import { RIASEC_KEYS, type RiasecKey, type YouthProfile } from '../domain/types';
import { riasecOfTag } from '../data/tags';

/** Décalage maximal (en points) qu'apporte l'exploration sur l'app à une dimension du bilan. */
export const MAX_RIASEC_SHIFT = 15;
/** Points de tag nécessaires pour +1 point RIASEC sur la dimension principale du tag. */
const TAG_POINTS_PER_RIASEC = 4;

const clamp = (n: number) => Math.min(100, Math.max(0, Math.round(n)));

/**
 * RIASEC « vivant » : les scores du bilan, légèrement déplacés par les centres
 * d'intérêt explorés sur PolarIA. La dimension principale d'un tag pèse 1, la
 * secondaire 0,5. Le décalage est plafonné pour ne jamais trahir le bilan.
 */
export function dynamicRiasec(profile: YouthProfile): Record<RiasecKey, number> {
  const shift = Object.fromEntries(RIASEC_KEYS.map((k) => [k, 0])) as Record<RiasecKey, number>;
  for (const [tag, score] of Object.entries(profile.tagScores)) {
    if (!Number.isFinite(score) || score <= 0) continue;
    riasecOfTag(tag).forEach((key, i) => {
      shift[key] += (score * (i === 0 ? 1 : 0.5)) / TAG_POINTS_PER_RIASEC;
    });
  }
  return Object.fromEntries(
    RIASEC_KEYS.map((k) => [k, clamp(profile.riasec[k] + Math.min(MAX_RIASEC_SHIFT, shift[k]))]),
  ) as Record<RiasecKey, number>;
}

/**
 * Estimation RIASEC pour un compte créé sans bilan, à partir des 2-3 centres
 * d'intérêt choisis. Elle est toujours présentée comme une estimation.
 */
export function estimateRiasec(interests: readonly string[]): Record<RiasecKey, number> {
  const out = Object.fromEntries(RIASEC_KEYS.map((k) => [k, 35])) as Record<RiasecKey, number>;
  for (const tag of interests) {
    riasecOfTag(tag).forEach((key, i) => {
      out[key] = Math.min(85, out[key] + (i === 0 ? 20 : 10));
    });
  }
  return out;
}

/** Dimensions RIASEC du bilan, de la plus forte à la plus faible. */
export function rankedRiasec(profile: Pick<YouthProfile, 'riasec'>): RiasecKey[] {
  return [...RIASEC_KEYS].sort((a, b) => profile.riasec[b] - profile.riasec[a]);
}

/** Libellé « Dominante / Secondaire » (ex. « Réaliste / Investigateur »). */
export function dominantRiasec(profile: Pick<YouthProfile, 'riasec'>): string {
  return rankedRiasec(profile).slice(0, 2).join(' / ');
}
