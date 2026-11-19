export const RIASEC_KEYS = [
  'Réaliste',
  'Investigateur',
  'Artistique',
  'Social',
  'Entreprenant',
  'Conventionnel',
] as const;

export type RiasecKey = (typeof RIASEC_KEYS)[number];

/** 1: 0-6 mois | 2: 3 mois-2 ans | 3: 1-4 ans | 4: 2-6 ans | 5: 4-10 ans */
export type JobZone = 1 | 2 | 3 | 4 | 5;

export interface YouthProfile {
  id: string;
  role: 'jeune';
  name: string;
  age: number;
  rdvRef: string;
  riasec: Record<RiasecKey, number>;
  topCognitive: string[];
  topPersonality: string[];
  tagScores: Record<string, number>;
  starredVideoIds: string[];
  watchedVideoIds: string[];
}

export interface ReelVideo {
  id: string;
  title: string;
  category: 'Métier' | 'École' | 'Témoignage';
  zone: JobZone;
  zoneLabel: string;
  tags: string[];
  gradient: string;
  icon: string;
  hook: string;
  dailyTasks: string[];
  qualities: string[];
  formations: string[];
  evolutions: string;
}

export const ZONE_LABELS: Record<JobZone, string> = {
  1: 'Accessible en 0 à 6 mois',
  2: 'Accessible en 3 mois à 2 ans',
  3: 'Accessible en 1 à 4 ans',
  4: 'Accessible en 2 à 6 ans',
  5: 'Accessible en 4 à 10 ans',
};

export const ZONE_SHORT: Record<JobZone, string> = {
  1: '0-6 mois',
  2: '3 mois-2 ans',
  3: '1-4 ans',
  4: '2-6 ans',
  5: '4-10 ans',
};

/** Bornes des scores de tags (évite les dérives et les valeurs absurdes). */
export const TAG_SCORE_MIN = 0;
export const TAG_SCORE_MAX = 100;
