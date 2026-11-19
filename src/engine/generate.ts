import {
  RIASEC_KEYS,
  ZONE_SHORT,
  type JobZone,
  type ReelVideo,
  type RiasecKey,
  type YouthProfile,
} from '../domain/types';
import { scoreVideo } from './recommend';
import { topTags } from './signals';

/**
 * Moteur de restitution « zéro hallucination », 100 % déterministe et hors-ligne.
 * Chaque phrase est un gabarit fixe dont les trous sont remplis UNIQUEMENT avec
 * des valeurs du profil ou du catalogue de vidéos. Aucun texte n'est inventé.
 */

const RIASEC_PLAIN: Record<RiasecKey, string> = {
  Réaliste: 'aimer le concret et bouger',
  Investigateur: 'comprendre comment les choses marchent',
  Artistique: 'créer et t’exprimer',
  Social: 'aider et être avec les autres',
  Entreprenant: 'convaincre et lancer des projets',
  Conventionnel: 'organiser et faire les choses carré',
};

const RIASEC_PARENT: Record<RiasecKey, string> = {
  Réaliste: 'goût pour le concret, l’action et le travail manuel',
  Investigateur: 'curiosité pour comprendre et analyser',
  Artistique: 'besoin de créer et de s’exprimer',
  Social: 'envie d’aider et de travailler avec les autres',
  Entreprenant: 'aisance pour convaincre et porter des projets',
  Conventionnel: 'sens de l’organisation et de la méthode',
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

function topRiasec(profile: YouthProfile, n: number): RiasecKey[] {
  return [...RIASEC_KEYS].sort((a, b) => profile.riasec[b] - profile.riasec[a]).slice(0, n);
}

function bestVideos(profile: YouthProfile, videos: readonly ReelVideo[], n: number): ReelVideo[] {
  return videos
    .map((video, index) => ({ video, index, score: scoreVideo(video, profile.tagScores) }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, n)
    .map((x) => x.video);
}

const words = (s: string) => s.split(/\s+/).filter(Boolean).length;

export interface Debrief {
  text: string;
  /** Sous-titres façon Reel, affichés un par un. */
  lines: string[];
  citedVideoIds: string[];
}

export const DEBRIEF_MIN_WORDS = 40;
export const DEBRIEF_MAX_WORDS = 60;

/** Script oral de 40 à 60 mots pour le bouton « Générer mon avenir ». */
export function generateDebrief(profile: YouthProfile, videos: readonly ReelVideo[]): Debrief {
  const [r1, r2] = topRiasec(profile, 2);
  const aptitudes = profile.topCognitive.map(plainCognitive).filter((x): x is string => x !== null);
  const [tag] = topTags(profile, 1)[0] ?? [];
  const picks = bestVideos(profile, videos, 2);

  const required: string[] = [`Salut ${profile.name}, voilà ton débrief !`];
  if (r1) required.push(`Ce qui te ressemble ? ${capitalize(RIASEC_PLAIN[r1])}.`);
  if (r2) required.push(`Mais aussi ${RIASEC_PLAIN[r2]}.`);
  if (aptitudes[0]) required.push(`Ton super-pouvoir, c’est ${aptitudes[0]}.`);
  if (tag) required.push(`Sur PolarIA, c’est ${tag} qui t’attire le plus.`);

  const optional: string[] = [];
  if (aptitudes[1]) optional.push(`Et tu sais aussi ${aptitudes[1]}.`);
  optional.push('Garde ce que tu aimes avec l’étoile.');

  const closing = picks.length === 2
    ? `Deux pistes à creuser : ${picks[0]!.title} et ${picks[1]!.title}.`
    : picks.length === 1 ? `Une piste à creuser : ${picks[0]!.title}.` : '';

  const lines = [...required];
  const count = () => words([...lines, closing].join(' '));
  for (const line of optional) {
    if (count() >= DEBRIEF_MIN_WORDS) break;
    if (count() + words(line) <= DEBRIEF_MAX_WORDS) lines.push(line);
  }
  if (closing) lines.push(closing);

  return { text: lines.join(' '), lines, citedVideoIds: picks.map((v) => v.id) };
}

export interface ReportGroup {
  zone: JobZone;
  label: string;
  titles: string[];
}

export interface ReportSection {
  id: 'forces' | 'exploration' | 'pistes' | 'conseil';
  title: string;
  items: string[];
  groups?: ReportGroup[];
}

export interface ParentReport {
  title: string;
  subtitle: string;
  sections: ReportSection[];
  disclaimer: string;
}

export const REPORT_DISCLAIMER =
  'Ces résultats constituent des pistes de réflexion et non une évaluation définitive. Ils ne remplacent pas l’échange avec un professionnel de l’orientation.';

/** Synthèse structurée pour les parents (bouton « Générer le rapport d'accompagnement »). */
export function generateParentReport(profile: YouthProfile, videos: readonly ReelVideo[]): ParentReport {
  const forces: string[] = topRiasec(profile, 3).map(
    (k) => `${k} (${profile.riasec[k]}/100) : ${RIASEC_PARENT[k]}.`,
  );
  if (profile.topCognitive.length) forces.push(`Aptitudes les plus marquées : ${profile.topCognitive.join(', ')}.`);
  if (profile.topPersonality.length) forces.push(`Traits de personnalité dominants : ${profile.topPersonality.join(', ')}.`);

  const tags = topTags(profile, 3);
  const starred = profile.starredVideoIds
    .map((id) => videos.find((v) => v.id === id))
    .filter((v): v is ReelVideo => v !== undefined);
  const exploration: string[] = [];
  exploration.push(
    tags.length
      ? `Centres d’intérêt les plus actifs : ${tags.map(([t, s]) => `${t} (${s} pts)`).join(', ')}.`
      : 'Pas encore de centre d’intérêt marqué sur PolarIA.',
  );
  exploration.push(
    starred.length
      ? `${starred.length} fiche(s) mise(s) en favori : ${starred.map((v) => v.title).join(', ')}.`
      : 'Aucune fiche mise en favori pour le moment.',
  );
  exploration.push(`${profile.watchedVideoIds.length} fiche(s) métier consultée(s) avec attention.`);

  const picks = bestVideos(profile, videos, 6);
  const byZone = new Map<JobZone, string[]>();
  for (const v of picks) byZone.set(v.zone, [...(byZone.get(v.zone) ?? []), v.title]);
  const groups: ReportGroup[] = [...byZone.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([zone, titles]) => ({ zone, label: ZONE_SHORT[zone], titles }));

  const conseil = [
    `Parlez avec ${profile.name} des fiches qui l’ont attiré·e : demandez ce qui plaît concrètement.`,
    'Un stage d’observation, une journée portes ouvertes ou une rencontre avec un professionnel aident à confirmer une piste.',
    'Les études courtes comme longues mènent à ces métiers : il n’y a pas de mauvais chemin.',
  ];

  return {
    title: `Rapport d’accompagnement de ${profile.name}`,
    subtitle: `${profile.age} ans · ${profile.rdvRef} · Centre des Possibles`,
    sections: [
      { id: 'forces', title: 'Points forts observés', items: forces },
      { id: 'exploration', title: 'Dynamique d’exploration sur PolarIA', items: exploration },
      {
        id: 'pistes',
        title: 'Pistes concrètes par durée de formation',
        items: groups.map((g) => `${g.label} : ${g.titles.join(', ')}`),
        groups,
      },
      { id: 'conseil', title: 'Conseils pour accompagner', items: conseil },
    ],
    disclaimer: REPORT_DISCLAIMER,
  };
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
