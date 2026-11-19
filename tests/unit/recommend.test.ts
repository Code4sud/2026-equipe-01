import { describe, expect, it } from 'vitest';
import { buildFeed, rankVideos, scoreVideo, secondaryRiasec } from '../../src/engine/recommend';
import { VIDEOS } from '../../src/data/videos';
import { SEED_PROFILES } from '../../src/data/profiles';
import { makeProfile, makeVideo } from '../helpers';

const byId = (id: string) => SEED_PROFILES.find((p) => p.id === id)!;

describe('scoreVideo', () => {
  it('additionne les scores des tags de la vidéo', () => {
    const v = makeVideo('a', ['Son & Média', 'Créatif & Scène']);
    expect(scoreVideo(v, { 'Son & Média': 12, 'Créatif & Scène': 10 })).toBe(22);
  });

  it('compte 0 pour un tag absent du profil', () => {
    expect(scoreVideo(makeVideo('a', ['Finance']), { 'Son & Média': 12 })).toBe(0);
  });

  it('renvoie 0 pour une vidéo sans tag', () => {
    expect(scoreVideo(makeVideo('a', []), { Finance: 5 })).toBe(0);
  });

  it('ignore les valeurs non finies', () => {
    expect(scoreVideo(makeVideo('a', ['Finance']), { Finance: Number.NaN })).toBe(0);
  });
});

describe('rankVideos', () => {
  const videos = [
    makeVideo('low', ['Finance']),
    makeVideo('high', ['Son & Média']),
    makeVideo('mid', ['Créatif & Scène']),
  ];

  it('trie par score décroissant', () => {
    const p = makeProfile({ tagScores: { 'Son & Média': 12, 'Créatif & Scène': 10, Finance: 1 } });
    expect(rankVideos(videos, p).map((r) => r.video.id)).toEqual(['high', 'mid', 'low']);
  });

  it('place les vidéos déjà vues après les non vues', () => {
    const p = makeProfile({
      tagScores: { 'Son & Média': 12, 'Créatif & Scène': 10, Finance: 1 },
      watchedVideoIds: ['high'],
    });
    expect(rankVideos(videos, p).map((r) => r.video.id)).toEqual(['mid', 'low', 'high']);
  });

  it('est stable à score égal (ordre du catalogue)', () => {
    const p = makeProfile({ tagScores: {} });
    expect(rankVideos(videos, p).map((r) => r.video.id)).toEqual(['low', 'high', 'mid']);
  });

  it('gère un catalogue vide', () => {
    expect(rankVideos([], makeProfile())).toEqual([]);
  });
});

describe('secondaryRiasec', () => {
  it('renvoie la 2e dimension RIASEC la plus forte', () => {
    expect(secondaryRiasec(byId('lucas'))).toBe('Réaliste');
    expect(secondaryRiasec(byId('emma'))).toBe('Social');
  });
});

describe('buildFeed', () => {
  it('contient chaque vidéo exactement une fois', () => {
    for (const profile of SEED_PROFILES) {
      const ids = buildFeed(VIDEOS, profile).map((f) => f.video.id);
      expect(ids).toHaveLength(VIDEOS.length);
      expect(new Set(ids).size).toBe(VIDEOS.length);
    }
  });

  it('met en tête la vidéo la mieux scorée', () => {
    const first = buildFeed(VIDEOS, byId('emma'))[0]!;
    expect(first.video.tags).toContain('Événementiel & Contact');
    expect(first.exploration).toBe(false);
  });

  it('injecte une vidéo d’exploration après chaque bloc de 4', () => {
    const feed = buildFeed(VIDEOS, byId('lucas'));
    expect(feed.slice(0, 4).every((f) => !f.exploration)).toBe(true);
    expect(feed[4]!.exploration).toBe(true);
  });

  it('choisit une exploration peu scorée et compatible avec le RIASEC secondaire', () => {
    const lucas = byId('lucas');
    const feed = buildFeed(VIDEOS, lucas);
    const explo = feed.filter((f) => f.exploration);
    expect(explo.length).toBeGreaterThan(0);
    for (const e of explo) {
      expect(e.score).toBeLessThan(feed[0]!.score);
    }
  });

  it('réagit à un changement de tagScores (réorientation)', () => {
    const p = makeProfile({ tagScores: { Finance: 50 } });
    expect(buildFeed(VIDEOS, p)[0]!.video.id).toBe('conseiller-financier');
  });

  it('fonctionne avec moins de 5 vidéos (pas d’exploration)', () => {
    const vids = [makeVideo('a', ['Finance']), makeVideo('b', ['Logistique'])];
    const feed = buildFeed(vids, makeProfile());
    expect(feed).toHaveLength(2);
    expect(feed.some((f) => f.exploration)).toBe(false);
  });
});
