import { SEED_PROFILES } from '../data/profiles';
import { isKnownTag } from '../data/tags';
import { VIDEOS } from '../data/videos';
import type { YouthProfile } from './types';
import { clampScore } from '../engine/signals';

const KNOWN_VIDEO_IDS = new Set(VIDEOS.map((v) => v.id));

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function sanitizeTagScores(value: unknown, fallback: Record<string, number>): Record<string, number> {
  if (!isRecord(value)) return { ...fallback };
  const out: Record<string, number> = {};
  for (const [tag, score] of Object.entries(value)) {
    if (!isKnownTag(tag)) continue;
    if (typeof score !== 'number' || Number.isNaN(score)) continue;
    out[tag] = clampScore(score);
  }
  return out;
}

function sanitizeVideoIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const ids = value.filter((id): id is string => typeof id === 'string' && KNOWN_VIDEO_IDS.has(id));
  return [...new Set(ids)];
}

/**
 * Tout ce qui sort du localStorage est non fiable (modifiable par n'importe qui
 * via les outils du navigateur). On ne réutilise que les champs dynamiques,
 * validés contre les catalogues fermés ; l'identité et les résultats du bilan
 * viennent toujours des données de référence.
 */
export function sanitizeProfile(raw: unknown, seed: YouthProfile): YouthProfile {
  const base = structuredClone(seed);
  if (!isRecord(raw)) return base;
  return {
    ...base,
    tagScores: sanitizeTagScores(raw.tagScores, base.tagScores),
    starredVideoIds: sanitizeVideoIds(raw.starredVideoIds),
    watchedVideoIds: sanitizeVideoIds(raw.watchedVideoIds),
  };
}

export function sanitizeProfiles(raw: unknown): Record<string, YouthProfile> {
  const source = isRecord(raw) ? raw : {};
  const out: Record<string, YouthProfile> = {};
  for (const seed of SEED_PROFILES) {
    out[seed.id] = sanitizeProfile(Object.prototype.hasOwnProperty.call(source, seed.id) ? source[seed.id] : undefined, seed);
  }
  return out;
}
