import type { ReelVideo, YouthProfile } from '../domain/types';
import { scoreVideo } from './recommend';

/** Tags de la vidéo avec le poids actuel du jeune (0 si absent). */
export function matchedTags(video: ReelVideo, profile: YouthProfile): Array<[string, number]> {
  return video.tags.map((t) => [t, profile.tagScores[t] ?? 0]);
}

/**
 * Pourcentage de match : score de la vidéo rapporté au meilleur score possible
 * pour une vidéo ayant autant de tags (somme des N meilleurs tags du jeune).
 */
export function matchPercent(video: ReelVideo, profile: YouthProfile): number {
  const best = Object.values(profile.tagScores)
    .filter((v) => Number.isFinite(v) && v > 0)
    .sort((a, b) => b - a)
    .slice(0, video.tags.length)
    .reduce((a, b) => a + b, 0);
  if (best <= 0) return 0;
  return Math.min(100, Math.round((scoreVideo(video, profile.tagScores) / best) * 100));
}
