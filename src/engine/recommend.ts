import { RIASEC_KEYS, type ReelVideo, type RiasecKey, type YouthProfile } from '../domain/types';
import { riasecOfTag } from '../data/tags';

export interface FeedItem {
  video: ReelVideo;
  score: number;
  /** true pour une carte « Découverte » (domaine peu scoré, contre la bulle de filtre). */
  exploration: boolean;
}

/** 1 fiche sur 4 est une Découverte : positions 4, 8, 12… (les 3 autres exploitent les affinités). */
export const DISCOVERY_EVERY = 4;
/** Une fiche est « peu scorée » si son score ne dépasse pas ce ratio du meilleur score. */
export const DISCOVERY_MAX_RATIO = 1 / 4;

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

/** Position (1, 2, 3…) réservée à une carte Découverte : 4, 8, 12… */
export function isDiscoverySlot(position: number): boolean {
  return position > 0 && position % DISCOVERY_EVERY === 0;
}

/**
 * Feed « Pour toi » : Exploitation (3 fiches sur 4) + Découverte (1 sur 4).
 *
 * - Exploitation : les fiches les mieux scorées (somme des tagScores), non vues d'abord.
 * - Découverte : aux positions 4, 8, 12…, une fiche d'un domaine encore peu scoré
 *   (score <= 1/4 du meilleur), en priorité compatible avec le RIASEC secondaire,
 *   pour ouvrir de nouvelles voies sans enfermer le jeune dans une bulle.
 *
 * `startPosition` permet de reconstruire la suite d'un feed déjà entamé en
 * gardant le rythme 3 + 1. Chaque vidéo apparaît exactement une fois.
 */
export function buildFeed(videos: readonly ReelVideo[], profile: YouthProfile, startPosition = 1): FeedItem[] {
  const ranked = rankVideos(videos, profile);
  const best = ranked.reduce((m, item) => Math.max(m, item.score), 0);
  const secondary = secondaryRiasec(profile);
  const pool = ranked
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => item.score <= best * DISCOVERY_MAX_RATIO)
    .sort(
      (a, b) =>
        Number(isCompatible(b.item.video, secondary)) - Number(isCompatible(a.item.video, secondary)) ||
        a.item.score - b.item.score ||
        a.index - b.index,
    )
    .map(({ item }) => item);
  const poolIds = new Set(pool.map((p) => p.video.id));
  const main = ranked.filter((item) => !poolIds.has(item.video.id));

  const feed: FeedItem[] = [];
  while (main.length > 0 || pool.length > 0) {
    const position = startPosition + feed.length;
    if (isDiscoverySlot(position) && pool.length > 0) {
      feed.push({ ...pool.shift()!, exploration: true });
    } else if (main.length > 0) {
      feed.push(main.shift()!);
    } else {
      // Plus de fiches d'affinité : on termine avec le reste, sans badge Découverte.
      feed.push(pool.shift()!);
    }
  }
  return feed;
}

/**
 * Feed vivant : les fiches déjà atteintes par le jeune restent à leur place
 * (scores rafraîchis), la suite est recalculée avec le profil actuel. Une
 * étoile, un regard ou un réglage réoriente donc immédiatement la suite du feed.
 */
export function buildLiveFeed(videos: readonly ReelVideo[], profile: YouthProfile, frozen: readonly FeedItem[]): FeedItem[] {
  const frozenIds = new Set(frozen.map((f) => f.video.id));
  const head = frozen.map((f) => ({ ...f, score: scoreVideo(f.video, profile.tagScores) }));
  const tail = buildFeed(
    videos.filter((v) => !frozenIds.has(v.id)),
    profile,
    head.length + 1,
  );
  return [...head, ...tail];
}
