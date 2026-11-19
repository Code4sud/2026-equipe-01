import { TAG_SCORE_MAX, TAG_SCORE_MIN, type ReelVideo, type YouthProfile } from '../domain/types';
import { isKnownTag } from '../data/tags';

export const STAR_POINTS = 5;
export const WATCH_POINTS = 2;
export const WATCH_THRESHOLD_MS = 3000;
export const PRO_NEW_TAG_POINTS = 10;

export function clampScore(value: number): number {
  return Math.min(TAG_SCORE_MAX, Math.max(TAG_SCORE_MIN, Math.round(value)));
}

function applyDelta(scores: Record<string, number>, tags: readonly string[], delta: number): Record<string, number> {
  const next = { ...scores };
  for (const tag of tags) next[tag] = clampScore((next[tag] ?? 0) + delta);
  return next;
}

/** Étoile (✦) : +5 sur chaque tag de la vidéo, ou -5 si on retire l'étoile. */
export function toggleStar(profile: YouthProfile, video: ReelVideo): YouthProfile {
  const starred = profile.starredVideoIds.includes(video.id);
  return {
    ...profile,
    tagScores: applyDelta(profile.tagScores, video.tags, starred ? -STAR_POINTS : STAR_POINTS),
    starredVideoIds: starred
      ? profile.starredVideoIds.filter((id) => id !== video.id)
      : [...profile.starredVideoIds, video.id],
  };
}

/** Temps de visionnage > 3 s : +2 sur chaque tag, une seule fois par vidéo. */
export function recordWatch(profile: YouthProfile, video: ReelVideo): YouthProfile {
  if (profile.watchedVideoIds.includes(video.id)) return profile;
  return {
    ...profile,
    tagScores: applyDelta(profile.tagScores, video.tags, WATCH_POINTS),
    watchedVideoIds: [...profile.watchedVideoIds, video.id],
  };
}

function assertKnownTag(tag: string): void {
  if (!isKnownTag(tag)) throw new Error('Tag hors catalogue refusé');
}

/** Réorientation pro : ajoute un tag du catalogue, initialisé à 10. */
export function addTag(profile: YouthProfile, tag: string): YouthProfile {
  assertKnownTag(tag);
  if (tag in profile.tagScores) return profile;
  return { ...profile, tagScores: { ...profile.tagScores, [tag]: PRO_NEW_TAG_POINTS } };
}

/** Réorientation pro : ajuste le poids d'un tag dans les bornes [0, 100]. */
export function adjustTag(profile: YouthProfile, tag: string, delta: number): YouthProfile {
  assertKnownTag(tag);
  if (!Number.isFinite(delta)) throw new Error('Delta invalide');
  return { ...profile, tagScores: applyDelta(profile.tagScores, [tag], delta) };
}

/** Réorientation pro : supprime un tag. */
export function removeTag(profile: YouthProfile, tag: string): YouthProfile {
  const next = { ...profile.tagScores };
  delete next[tag];
  return { ...profile, tagScores: next };
}

/** Tags triés par score décroissant. */
export function topTags(profile: YouthProfile, limit = Infinity): Array<[string, number]> {
  return Object.entries(profile.tagScores)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit);
}
