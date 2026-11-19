import type { RiasecKey } from '../domain/types';

/**
 * Catalogue fermé des tags d'intérêts. Le pro ne peut choisir que dans cette
 * liste (pas de saisie libre, conformité RGPD) et chaque tag est relié aux
 * dimensions RIASEC qu'il illustre (vidéo d'exploration, radar dynamique,
 * estimation à l'inscription).
 */
export const TAG_RIASEC = {
  'Plein air & Nature': ['Réaliste', 'Investigateur'],
  'Manuel & Terrain': ['Réaliste'],
  'Technique & Énergie': ['Réaliste', 'Investigateur'],
  Logistique: ['Conventionnel', 'Réaliste'],
  'Événementiel & Contact': ['Entreprenant', 'Social'],
  'Commerce & Gestion': ['Entreprenant', 'Conventionnel'],
  'Restauration & Service': ['Social', 'Réaliste'],
  Finance: ['Conventionnel', 'Entreprenant'],
  'Son & Média': ['Artistique', 'Réaliste'],
  'Créatif & Scène': ['Artistique', 'Social'],
  'Design & Image': ['Artistique', 'Investigateur'],
  'Tech & Numérique': ['Investigateur', 'Conventionnel'],
  'Sciences & Analyse': ['Investigateur'],
  Logique: ['Investigateur', 'Conventionnel'],
  'Soin & Santé': ['Social', 'Investigateur'],
  'Sport & Coaching': ['Social', 'Réaliste'],
  Accompagnement: ['Social'],
} as const satisfies Record<string, readonly RiasecKey[]>;

export type TagName = keyof typeof TAG_RIASEC;

export const ALL_TAGS = Object.keys(TAG_RIASEC) as TagName[];

export function isKnownTag(tag: unknown): tag is TagName {
  return typeof tag === 'string' && Object.prototype.hasOwnProperty.call(TAG_RIASEC, tag);
}

export function riasecOfTag(tag: string): readonly RiasecKey[] {
  return isKnownTag(tag) ? TAG_RIASEC[tag] : [];
}
