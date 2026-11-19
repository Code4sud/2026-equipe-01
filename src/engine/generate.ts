import type { RiasecKey } from '../domain/types';

/**
 * Traductions « zéro jargon » des dimensions RIASEC et des aptitudes, utilisées
 * par les mini-IA (engine/ai.ts) et par Mon Profil. Gabarits fixes : rien n'est inventé.
 */

const RIASEC_PLAIN: Record<RiasecKey, string> = {
  Réaliste: 'aimer le concret et bouger',
  Investigateur: 'comprendre comment les choses marchent',
  Artistique: 'créer et t’exprimer',
  Social: 'aider et être avec les autres',
  Entreprenant: 'convaincre et lancer des projets',
  Conventionnel: 'organiser et faire les choses carré',
};

const COGNITIVE_PLAIN: Record<string, string> = {
  'Flexibilité des catégories': 'savoir t’adapter vite',
  'Partage du temps': 'gérer plusieurs choses à la fois',
  'Raisonnement inductif': 'repérer les règles cachées',
  'Raisonnement déductif': 'aller pas à pas vers la bonne réponse',
  'Facilité avec les nombres': 'être à l’aise avec les chiffres',
  Mémorisation: 'retenir les choses vite',
};

export function plainRiasec(key: RiasecKey): string {
  return RIASEC_PLAIN[key];
}

export function plainCognitive(aptitude: string): string | null {
  return Object.prototype.hasOwnProperty.call(COGNITIVE_PLAIN, aptitude) ? COGNITIVE_PLAIN[aptitude]! : null;
}

