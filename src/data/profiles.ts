import type { YouthProfile } from '../domain/types';

/**
 * Profils 100 % FICTIFS, inspirés de la structure des rapports du Centre des
 * Possibles. Aucun prénom, âge ou score ne correspond à une personne réelle.
 */
export const SEED_PROFILES: YouthProfile[] = [
  {
    id: 'lucas',
    role: 'jeune',
    name: 'Lucas',
    age: 16,
    rdvRef: 'Rdv 2187',
    riasec: { Réaliste: 76, Investigateur: 38, Artistique: 86, Social: 60, Entreprenant: 45, Conventionnel: 30 },
    topCognitive: ['Flexibilité des catégories', 'Partage du temps', 'Mémorisation'],
    topPersonality: ['Agréabilité', 'Extraversion', 'Ouvert à l’expérience'],
    tagScores: { 'Son & Média': 12, 'Créatif & Scène': 10, 'Sport & Coaching': 8, 'Technique & Énergie': 6 },
    starredVideoIds: [],
    watchedVideoIds: [],
  },
  {
    id: 'emma',
    role: 'jeune',
    name: 'Emma',
    age: 17,
    rdvRef: 'Rdv 2188',
    riasec: { Réaliste: 28, Investigateur: 40, Artistique: 62, Social: 72, Entreprenant: 88, Conventionnel: 55 },
    topCognitive: ['Facilité avec les nombres', 'Partage du temps', 'Raisonnement déductif'],
    topPersonality: ['Caractère consciencieux', 'Extraversion', 'Ouvert à l’expérience'],
    tagScores: { 'Événementiel & Contact': 14, 'Commerce & Gestion': 10, 'Restauration & Service': 8, Finance: 6 },
    starredVideoIds: [],
    watchedVideoIds: [],
  },
  {
    id: 'yanis',
    role: 'jeune',
    name: 'Yanis',
    age: 16,
    rdvRef: 'Rdv 2189',
    riasec: { Réaliste: 90, Investigateur: 42, Artistique: 25, Social: 55, Entreprenant: 35, Conventionnel: 50 },
    topCognitive: ['Partage du temps', 'Raisonnement inductif', 'Flexibilité des catégories'],
    topPersonality: ['Extraversion', 'Humilité-honnêteté', 'Agréabilité'],
    tagScores: { 'Plein air & Nature': 12, 'Manuel & Terrain': 10, 'Soin & Sport': 8, Logistique: 5 },
    starredVideoIds: [],
    watchedVideoIds: [],
  },
];

export const DEFAULT_PROFILE_ID = 'lucas';
