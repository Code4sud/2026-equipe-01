import { RIASEC_KEYS, type ReelVideo, type RiasecKey, type YouthProfile } from '../domain/types';
import { riasecOfTag } from '../data/tags';

export interface FeedItem {
  video: ReelVideo;
  score: number;
  /** true si la vidéo a été injectée pour éviter la bulle de filtre. */
  exploration: boolean;
}

/** Nombre de vidéos « pertinentes » entre deux vidéos d'exploration. */
export const EXPLORATION_EVERY = 4;

/** Score(vidéo) = somme des tagScores de l'utilisateur pour les tags de la vidéo. */
export function scoreVideo(video: ReelVideo, tagScores: Record<string, number>): number {
  let total = 0;
  for (const tag of video.tags) {
    const value = tagScores[tag];
    if (typeof value === 'number' && Number.isFinite(value)) total += value;
  }
  return total;
}

/** Vidéos non vues d'abord, puis vues ; chaque groupe trié par score décroissant (tri stable). */
export function rankVideos(videos: readonly ReelVideo[], profile: YouthProfile): FeedItem[] {
  const watched = new Set(profile.watchedVideoIds);
  return videos
    .map((video, index) => ({ video, index, score: scoreVideo(video, profile.tagScores), seen: watched.has(video.id) }))
    .sort((a, b) => Number(a.seen) - Number(b.seen) || b.score - a.score || a.index - b.index)
    .map(({ video, score }) => ({ video, score, exploration: false }));
}

/** 2e dimension RIASEC la plus forte du jeune. */
export function secondaryRiasec(profile: YouthProfile): RiasecKey {
  const sorted = [...RIASEC_KEYS].sort((a, b) => profile.riasec[b] - profile.riasec[a]);
  return sorted[1] ?? sorted[0]!;
}

function isCompatible(video: ReelVideo, key: RiasecKey): boolean {
  return video.tags.some((t) => riasecOfTag(t).includes(key));
}

/**
 * Construit le feed « Pour toi » : classement par score, puis injection d'une
 * vidéo d'exploration après chaque bloc de EXPLORATION_EVERY vidéos. Une vidéo
 * d'exploration est peu scorée (moitié basse du classement) et compatible avec
 * le RIASEC secondaire du jeune. Chaque vidéo apparaît exactement une fois.
 */
export function buildFeed(videos: readonly ReelVideo[], profile: YouthProfile): FeedItem[] {
  const ranked = rankVideos(videos, profile);
  if (ranked.length <= EXPLORATION_EVERY) return ranked;

  const secondary = secondaryRiasec(profile);
  const lowerHalf = ranked.slice(Math.ceil(ranked.length / 2));
  const pool = lowerHalf
    .filter((item) => isCompatible(item.video, secondary))
    .sort((a, b) => a.score - b.score);
  const poolIds = new Set(pool.map((p) => p.video.id));
  const main = ranked.filter((item) => !poolIds.has(item.video.id));

  const feed: FeedItem[] = [];
  let sinceExploration = 0;
  while (main.length > 0 || pool.length > 0) {
    if (sinceExploration === EXPLORATION_EVERY && pool.length > 0) {
      feed.push({ ...pool.shift()!, exploration: true });
      sinceExploration = 0;
    } else if (main.length > 0) {
      feed.push(main.shift()!);
      sinceExploration += 1;
    } else {
      // Plus de vidéos principales : on termine avec le reste du pool, sans marquer d'exploration.
      feed.push(pool.shift()!);
    }
  }
  return feed;
}
