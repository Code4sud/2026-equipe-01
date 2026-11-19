import { ZONE_LABELS, type JobZone, type ReelVideo, type RiasecKey, type YouthProfile } from '../domain/types';
import { buildFeed, scoreVideo } from './recommend';
import { rankedRiasec } from './riasec';
import { topTags } from './signals';
import { plainRiasec } from './generate';

/**
 * Mini-IA PolarIA : contrat de données, générateurs instantanés (déterministes)
 * et garde-fous anti-hallucination appliqués à toute réponse d'un LLM.
 *
 * Principe : le LLM ne reçoit QUE le JSON produit par `buildAiContext`. Sa
 * réponse n'est jamais affichée telle quelle : elle passe par `sanitizeScenario`
 * ou `sanitizeParentReport`, qui rejettent tout métier, diplôme ou chiffre absent
 * de ce JSON et remplacent l'élément fautif par la version instantanée.
 */

// ------------------------------------------------------------------ contrats
export const STORY_ICONS = [
  'Sparkles',
  'Compass',
  'Star',
  'Dumbbell',
  'Headphones',
  'Rocket',
  'Leaf',
  'Wrench',
  'Palette',
  'HeartPulse',
  'Users',
  'Briefcase',
  'Cpu',
  'ChefHat',
] as const;
export type StoryIconName = (typeof STORY_ICONS)[number];

export interface ImmersiveReelScenario {
  headline: string;
  scenes: Array<{
    step: number;
    tagLabel: string;
    iconName: StoryIconName;
    subtitle: string;
    durationSec: number;
  }>;
}

export interface CareerTrack {
  zoneLabel: string;
  jobTitle: string;
  whyItFits: string;
  formations: string;
}

export interface ParentReportData {
  profileSummary: string;
  explorationDynamics: string;
  careerTracks: CareerTrack[];
  homeAdvice: string[];
  disclaimer: string;
}

/** Qui a écrit le texte affiché : le LLM local (WebLLM) ou le générateur instantané. */
export type AiSource = 'webllm' | 'instant';

export interface AiResult<T> {
  data: T;
  source: AiSource;
}

export const PARENT_DISCLAIMER =
  'Ces éléments sont des pistes de réflexion et non un verdict. Ils ne remplacent pas l’échange avec un professionnel de l’orientation du Centre des Possibles.';

export const SCENE_COUNT = 4;
export const SCENE_MAX_WORDS = 25;

// ------------------------------------------------------------------ contexte
export interface AiJob {
  id: string;
  title: string;
  zone: JobZone;
  zoneLabel: string;
  tags: string[];
  formations: string[];
  firstTask: string;
}

/** Seul et unique JSON transmis au LLM (prénom, jamais de nom ni de données sensibles). */
export interface AiContext {
  name: string;
  age: number;
  hasBilan: boolean;
  riasec: Record<RiasecKey, number>;
  topCognitive: string[];
  tagScores: Record<string, number>;
  starredJobs: string[];
  watchedCount: number;
  /** Métiers du store les plus proches du profil (le LLM ne peut citer qu'eux). */
  jobs: AiJob[];
  /** Fiche « Découverte » proposée par l'algorithme pour ouvrir l'horizon. */
  discovery: AiJob | null;
}

export function zoneLabel(zone: JobZone): string {
  return `Zone ${zone} · ${ZONE_LABELS[zone].replace(/^Accessible en /, '')}`;
}

function toAiJob(v: ReelVideo): AiJob {
  return {
    id: v.id,
    title: v.title,
    zone: v.zone,
    zoneLabel: zoneLabel(v.zone),
    tags: [...v.tags],
    formations: [...v.formations],
    firstTask: v.dailyTasks[0] ?? '',
  };
}

const CONTEXT_JOBS = 8;

export function buildAiContext(profile: YouthProfile, videos: readonly ReelVideo[]): AiContext {
  const starred = new Set(profile.starredVideoIds);
  const ranked = videos
    .filter((v) => v.category === 'Métier')
    .map((v, index) => ({ v, index, score: scoreVideo(v, profile.tagScores) + (starred.has(v.id) ? 1000 : 0) }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((x) => x.v);
  const jobs = ranked.slice(0, CONTEXT_JOBS).map(toAiJob);
  const inJobs = new Set(jobs.map((j) => j.id));
  const discoveryItem = buildFeed(videos, profile).find((i) => i.exploration && i.video.category === 'Métier' && !inJobs.has(i.video.id));

  return {
    name: profile.name,
    age: profile.age,
    hasBilan: profile.hasBilan,
    riasec: { ...profile.riasec },
    topCognitive: [...profile.topCognitive],
    tagScores: Object.fromEntries(topTags(profile, 6)),
    starredJobs: videos.filter((v) => starred.has(v.id)).map((v) => v.title),
    watchedCount: profile.watchedVideoIds.length,
    jobs,
    discovery: discoveryItem ? toAiJob(discoveryItem.video) : null,
  };
}

// ------------------------------------------------------- générateur instantané
const words = (s: string) => s.split(/\s+/).filter(Boolean);
const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

function clampWords(s: string, max = SCENE_MAX_WORDS): string {
  const w = words(s);
  return w.length <= max ? w.join(' ') : `${w.slice(0, max).join(' ').replace(/[,;:]$/, '')}…`;
}

const TAG_ICON: Record<string, StoryIconName> = {
  'Plein air & Nature': 'Leaf',
  'Manuel & Terrain': 'Wrench',
  'Technique & Énergie': 'Wrench',
  Logistique: 'Briefcase',
  'Événementiel & Contact': 'Users',
  'Commerce & Gestion': 'Briefcase',
  'Restauration & Service': 'ChefHat',
  Finance: 'Briefcase',
  'Son & Média': 'Headphones',
  'Créatif & Scène': 'Palette',
  'Design & Image': 'Palette',
  'Tech & Numérique': 'Cpu',
  'Sciences & Analyse': 'Cpu',
  Logique: 'Cpu',
  'Soin & Santé': 'HeartPulse',
  'Sport & Coaching': 'Dumbbell',
  Accompagnement: 'Users',
};

function topTag(ctx: AiContext): string | undefined {
  return Object.entries(ctx.tagScores).sort((a, b) => b[1] - a[1])[0]?.[0];
}

function instantScenes(ctx: AiContext): ImmersiveReelScenario['scenes'] {
  const [r1, r2] = rankedRiasec(ctx);
  const tag = topTag(ctx);
  const job = ctx.jobs[0];
  const stars = ctx.starredJobs.length;

  const scene1 = job
    ? `Imagine-toi demain matin. Tu es ${job.title} : ${lowerFirst(job.firstTask)}. Et c’est toi qu’on attend.`
    : 'Imagine-toi demain matin, dans un métier où tu te sens à ta place. Ça commence ici.';
  const scene2 =
    r1 && r2
      ? `Tes deux forces : ${plainRiasec(r1)}, et ${plainRiasec(r2)}. Ça, c’est une vraie base pour avancer.`
      : 'Tu as déjà des forces. On va les mettre en lumière, une étoile après l’autre.';
  const scene3 =
    stars > 0
      ? `Tes ${stars} étoile${stars > 1 ? 's' : ''} et tes fiches regardées le confirment : ${tag ?? 'ce domaine'} t’attire vraiment.`
      : ctx.watchedCount > 0
        ? `Les fiches que tu regardes le montrent : ${tag ?? 'un domaine'} revient souvent dans ton feed.`
        : `Ton feed commence à te connaître : ${tag ?? 'un domaine'} sort déjà du lot. Mets des étoiles pour l’affiner.`;
  const scene4 = ctx.discovery
    ? `Et si tu testais ${ctx.discovery.title} ? Une piste Découverte, hors de tes habitudes, pour ouvrir ton horizon.`
    : 'Garde l’esprit ouvert : chaque fiche Découverte de ton feed peut changer ton horizon.';

  return [
    { step: 1, tagLabel: 'Ton terrain de jeu', iconName: TAG_ICON[job?.tags[0] ?? ''] ?? 'Rocket', subtitle: clampWords(scene1), durationSec: 6 },
    { step: 2, tagLabel: 'Tes super-pouvoirs', iconName: 'Sparkles', subtitle: clampWords(scene2), durationSec: 6 },
    { step: 3, tagLabel: 'Ce que tes étoiles disent', iconName: 'Star', subtitle: clampWords(scene3), durationSec: 6 },
    { step: 4, tagLabel: 'Piste Découverte', iconName: 'Compass', subtitle: clampWords(scene4), durationSec: 6 },
  ];
}

export function instantScenario(ctx: AiContext): ImmersiveReelScenario {
  return { headline: `${ctx.name}, ton avenir en 4 scènes`, scenes: instantScenes(ctx) };
}

const RIASEC_PARENT: Record<RiasecKey, string> = {
  Réaliste: 'le goût du concret et de l’action',
  Investigateur: 'la curiosité de comprendre et d’analyser',
  Artistique: 'le besoin de créer et de s’exprimer',
  Social: 'l’envie d’aider et de travailler avec les autres',
  Entreprenant: 'l’aisance pour convaincre et porter des projets',
  Conventionnel: 'le sens de l’organisation et de la méthode',
};

/** 3 pistes sur des horizons d'études variés : court (1-2), moyen (3), long (4-5). */
function pickTracks(ctx: AiContext): AiJob[] {
  const groups: Array<(z: JobZone) => boolean> = [(z) => z <= 2, (z) => z === 3, (z) => z >= 4];
  const picks: AiJob[] = [];
  for (const inGroup of groups) {
    const j = ctx.jobs.find((x) => inGroup(x.zone) && !picks.includes(x));
    if (j) picks.push(j);
  }
  for (const j of ctx.jobs) if (picks.length < 3 && !picks.includes(j)) picks.push(j);
  return picks.slice(0, 3).sort((a, b) => a.zone - b.zone);
}

function trackFor(ctx: AiContext, job: AiJob, why?: string): CareerTrack {
  const shared = job.tags.filter((t) => (ctx.tagScores[t] ?? 0) > 0);
  return {
    zoneLabel: job.zoneLabel,
    jobTitle: job.title,
    whyItFits:
      why ??
      (shared.length
        ? `Rejoint ses centres d’intérêt les plus actifs : ${shared.join(', ')}.`
        : `Piste complémentaire liée à ${job.tags.join(', ')}.`),
    formations: job.formations.join(' · '),
  };
}

export function instantParentReport(ctx: AiContext): ParentReportData {
  const [r1, r2, r3] = rankedRiasec(ctx);
  const tags = Object.entries(ctx.tagScores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);
  const top = tags[0]?.[0];

  const summary = [
    `${ctx.name} (${ctx.age} ans) montre surtout ${r1 ? RIASEC_PARENT[r1] : 'des intérêts variés'}${r2 ? `, puis ${RIASEC_PARENT[r2]}` : ''}.`,
    r3 ? `On retrouve aussi ${RIASEC_PARENT[r3]}.` : '',
    ctx.topCognitive.length ? `Ses aptitudes les plus marquées : ${ctx.topCognitive.join(', ')}.` : '',
    ctx.hasBilan ? '' : 'Profil estimé à partir de ses centres d’intérêt : le bilan au Centre des Possibles le précisera.',
  ]
    .filter(Boolean)
    .join(' ');

  const dynamics = [
    tags.length
      ? `Sur PolarIA, ses centres d’intérêt les plus actifs sont ${tags.map(([t, s]) => `${t} (${s} pts)`).join(', ')}.`
      : 'Ses centres d’intérêt sur PolarIA sont encore en train de se dessiner.',
    ctx.starredJobs.length
      ? `Fiches mises en favori : ${ctx.starredJobs.join(', ')}.`
      : 'Aucune fiche n’a encore été mise en favori.',
    `${ctx.watchedCount} fiche(s) regardée(s) avec attention.`,
  ].join(' ');

  const advice = [
    `Demandez à ${ctx.name} de vous montrer les fiches qui lui plaisent, et ce qui l’attire concrètement dans chacune.`,
    top
      ? `Cherchez ensemble une journée portes ouvertes, un stage d’observation ou une rencontre autour de ${top}.`
      : 'Cherchez ensemble une journée portes ouvertes ou un stage d’observation pour confirmer une piste.',
    'Rappelez que les études courtes comme longues mènent à des métiers qui ont du sens : il n’y a pas de mauvais chemin.',
  ];

  return {
    profileSummary: summary,
    explorationDynamics: dynamics,
    careerTracks: pickTracks(ctx).map((j) => trackFor(ctx, j)),
    homeAdvice: advice,
    disclaimer: PARENT_DISCLAIMER,
  };
}

// ------------------------------------------------------ garde-fous (anti-hallu)
/** Diplômes et filières qu'un LLM pourrait inventer : autorisés seulement s'ils sont dans le JSON. */
const DIPLOMA = /\b(BTS|BUT|DUT|CAP|BEP|BPJEPS|CQP|DEUST|Bac\s?pro|Licence|Master|Doctorat|MBA|Prépa|IFSI|STAPS|Parcoursup)\b/gi;

function contextText(ctx: AiContext): string {
  return JSON.stringify(ctx).toLowerCase();
}

/**
 * true si le texte cite un chiffre ou un diplôme absent du JSON transmis.
 * C'est la règle « N'invente RIEN » rendue vérifiable.
 */
export function inventsFacts(text: string, ctx: AiContext): boolean {
  const known = contextText(ctx);
  const numbers = new Set(known.match(/\d+/g) ?? []);
  for (const n of text.match(/\d+/g) ?? []) if (!numbers.has(n)) return true;
  for (const d of text.match(DIPLOMA) ?? []) if (!known.includes(d.toLowerCase())) return true;
  return false;
}

const clean = (v: unknown, max: number): string | null => {
  if (typeof v !== 'string') return null;
  // eslint-disable-next-line no-control-regex
  const s = v.replace(/[\u0000-\u001f<>]/g, ' ').replace(/\s+/g, ' ').trim();
  return s.length > 0 && s.length <= max ? s : null;
};

const isIcon = (v: unknown): v is StoryIconName => typeof v === 'string' && (STORY_ICONS as readonly string[]).includes(v);

/**
 * Valide la réponse du LLM pour la story. Chaque scène fautive (trop longue,
 * vide, chiffre ou diplôme inventé) est remplacée par la scène instantanée.
 * Retourne null si la réponse est inexploitable.
 */
export function sanitizeScenario(raw: unknown, ctx: AiContext): ImmersiveReelScenario | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as { headline?: unknown; scenes?: unknown };
  if (!Array.isArray(r.scenes) || r.scenes.length < SCENE_COUNT) return null;
  const fallback = instantScenario(ctx);
  let kept = 0;
  const scenes = fallback.scenes.map((fb, i) => {
    const s = (r.scenes as unknown[])[i] as Record<string, unknown> | undefined;
    const subtitle = clean(s?.subtitle, 220);
    if (!s || !subtitle || words(subtitle).length > SCENE_MAX_WORDS + 5 || inventsFacts(subtitle, ctx)) return fb;
    kept++;
    const tagLabel = clean(s.tagLabel, 40);
    const duration = Number(s.durationSec);
    return {
      step: i + 1,
      tagLabel: tagLabel && !inventsFacts(tagLabel, ctx) ? tagLabel : fb.tagLabel,
      iconName: isIcon(s.iconName) ? s.iconName : fb.iconName,
      subtitle: clampWords(subtitle),
      durationSec: Number.isFinite(duration) ? Math.min(8, Math.max(4, Math.round(duration))) : fb.durationSec,
    };
  });
  if (kept === 0) return null;
  const headline = clean(r.headline, 90);
  return { headline: headline && !inventsFacts(headline, ctx) ? headline : fallback.headline, scenes };
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

/**
 * Valide la réponse du LLM pour le bilan parents : seuls les métiers présents
 * dans le JSON sont gardés, la zone et les formations viennent TOUJOURS du store,
 * et le rappel officiel n'est jamais réécrit.
 */
export function sanitizeParentReport(raw: unknown, ctx: AiContext): ParentReportData | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const fallback = instantParentReport(ctx);
  const text = (v: unknown, max: number, fb: string) => {
    const s = clean(v, max);
    return s && !inventsFacts(s, ctx) ? s : fb;
  };

  const byTitle = new Map(ctx.jobs.map((j) => [norm(j.title), j]));
  if (ctx.discovery) byTitle.set(norm(ctx.discovery.title), ctx.discovery);
  const tracks: CareerTrack[] = [];
  for (const t of Array.isArray(r.careerTracks) ? r.careerTracks : []) {
    const item = t as Record<string, unknown> | null;
    const job = typeof item?.jobTitle === 'string' ? byTitle.get(norm(item.jobTitle)) : undefined;
    if (!job || tracks.some((x) => x.jobTitle === job.title)) continue;
    const why = clean(item?.whyItFits, 240);
    tracks.push(trackFor(ctx, job, why && !inventsFacts(why, ctx) ? why : undefined));
    if (tracks.length === 3) break;
  }
  for (const fb of fallback.careerTracks) {
    if (tracks.length < 3 && !tracks.some((x) => x.jobTitle === fb.jobTitle)) tracks.push(fb);
  }

  const advice = (Array.isArray(r.homeAdvice) ? r.homeAdvice : [])
    .map((a) => clean(a, 220))
    .filter((a): a is string => a !== null && !inventsFacts(a, ctx))
    .slice(0, 3);

  return {
    profileSummary: text(r.profileSummary, 600, fallback.profileSummary),
    explorationDynamics: text(r.explorationDynamics, 600, fallback.explorationDynamics),
    careerTracks: tracks,
    homeAdvice: advice.length >= 2 ? advice : fallback.homeAdvice,
    disclaimer: PARENT_DISCLAIMER,
  };
}

// ------------------------------------------------------------------- prompts
export const SCENARIO_SYSTEM_PROMPT =
  'Tu es PolarIA, un guide d’orientation qui parle à un jeune de 16 ans fâché avec l’écrit. RÈGLE ABSOLUE : N’invente RIEN. Utilise uniquement les données JSON fournies. Génère un scénario de story vidéo immersif de 4 scènes courtes (15 à 25 mots max par scène) en tutoyant le jeune, sans aucun jargon psychométrique. Réponds uniquement en JSON valide.';

export const PARENT_SYSTEM_PROMPT =
  'Tu es un conseiller d’orientation du Centre des Possibles. RÈGLE ABSOLUE : N’invente RIEN, appuie-toi uniquement sur le JSON fourni. Rédige une synthèse claire, structurée et rassurante pour les parents du jeune. Réponds uniquement en JSON valide.';

export function scenarioUserPrompt(ctx: AiContext): string {
  return [
    `Données JSON du jeune :\n${JSON.stringify(ctx)}`,
    'Scène 1 : accroche immersive dans l’ambiance de son premier métier de "jobs".',
    'Scène 2 : ses 2 forces dominantes (riasec), en mots simples.',
    'Scène 3 : ce que ses étoiles (starredJobs) et ses fiches regardées confirment.',
    'Scène 4 : la piste "discovery" pour ouvrir son horizon.',
    `Format : {"headline": string, "scenes": [{"step": 1, "tagLabel": string, "iconName": un parmi ${STORY_ICONS.join(', ')}, "subtitle": string, "durationSec": 6}]}`,
  ].join('\n');
}

export function parentUserPrompt(ctx: AiContext): string {
  return [
    `Données JSON du jeune :\n${JSON.stringify(ctx)}`,
    'Choisis 3 métiers UNIQUEMENT dans "jobs", sur des zones différentes si possible.',
    'Format : {"profileSummary": string (3 à 4 lignes), "explorationDynamics": string, "careerTracks": [{"zoneLabel": string, "jobTitle": string, "whyItFits": string, "formations": string}], "homeAdvice": [2 ou 3 conseils], "disclaimer": string}',
  ].join('\n');
}

export const SCENARIO_SCHEMA = {
  type: 'object',
  properties: {
    headline: { type: 'string' },
    scenes: {
      type: 'array',
      minItems: SCENE_COUNT,
      maxItems: SCENE_COUNT,
      items: {
        type: 'object',
        properties: {
          step: { type: 'integer' },
          tagLabel: { type: 'string' },
          iconName: { type: 'string', enum: [...STORY_ICONS] },
          subtitle: { type: 'string' },
          durationSec: { type: 'integer' },
        },
        required: ['step', 'tagLabel', 'iconName', 'subtitle', 'durationSec'],
      },
    },
  },
  required: ['headline', 'scenes'],
} as const;

export const PARENT_SCHEMA = {
  type: 'object',
  properties: {
    profileSummary: { type: 'string' },
    explorationDynamics: { type: 'string' },
    careerTracks: {
      type: 'array',
      minItems: 3,
      maxItems: 3,
      items: {
        type: 'object',
        properties: {
          zoneLabel: { type: 'string' },
          jobTitle: { type: 'string' },
          whyItFits: { type: 'string' },
          formations: { type: 'string' },
        },
        required: ['zoneLabel', 'jobTitle', 'whyItFits', 'formations'],
      },
    },
    homeAdvice: { type: 'array', minItems: 2, maxItems: 3, items: { type: 'string' } },
    disclaimer: { type: 'string' },
  },
  required: ['profileSummary', 'explorationDynamics', 'careerTracks', 'homeAdvice', 'disclaimer'],
} as const;
