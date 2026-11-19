import type { RiasecKey } from '../domain/types';

/**
 * Catalogue fermé des tags d'intérêts. Le pro ne peut choisir que dans cette
 * liste (pas de saisie libre, conformité RGPD) et chaque tag est relié aux
 * dimensions RIASEC qu'il illustre (utilisé par la vidéo d'exploration).
 */
export const TAG_RIASEC = {
  'Plein air & Nature': ['Réaliste', 'Investigateur'],
  'Manuel & Terrain': ['Réaliste'],
  'Soin & Sport': ['Social', 'Réaliste'],
  Logistique: ['Conventionnel', 'Réaliste'],
  'Événementiel & Contact': ['Entreprenant', 'Social'],
  'Commerce & Gestion': ['Entreprenant', 'Conventionnel'],
  'Restauration & Service': ['Social', 'Réaliste'],
  Finance: ['Conventionnel', 'Entreprenant'],
  'Son & Média': ['Artistique', 'Réaliste'],
  'Créatif & Scène': ['Artistique', 'Social'],
  'Sport & Coaching': ['Social', 'Réaliste'],
  'Technique & Énergie': ['Réaliste', 'Investigateur'],
} as const satisfies Record<string, readonly RiasecKey[]>;

export type TagName = keyof typeof TAG_RIASEC;

export const ALL_TAGS = Object.keys(TAG_RIASEC) as TagName[];

export function isKnownTag(tag: unknown): tag is TagName {
  return typeof tag === 'string' && Object.prototype.hasOwnProperty.call(TAG_RIASEC, tag);
}

export function riasecOfTag(tag: string): readonly RiasecKey[] {
  return isKnownTag(tag) ? TAG_RIASEC[tag] : [];
}
