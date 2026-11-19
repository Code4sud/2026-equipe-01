import { describe, expect, it } from 'vitest';
import { buildFeed, buildLiveFeed, isDiscoverySlot, rankVideos, scoreVideo, secondaryRiasec } from '../../src/engine/recommend';
import { toggleStar } from '../../src/engine/signals';
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
    expect(secondaryRiasec(byId('lucas'))).toBe('Investigateur');
    expect(secondaryRiasec(byId('ines'))).toBe('Social');
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
    const first = buildFeed(VIDEOS, byId('ines'))[0]!;
    expect(first.video.tags).toContain('Événementiel & Contact');
    expect(first.exploration).toBe(false);
  });

  it('place une carte Découverte aux positions 4, 8, 12 (1 fiche sur 4)', () => {
    expect([1, 2, 3, 4, 8, 12].map(isDiscoverySlot)).toEqual([false, false, false, true, true, true]);
    const feed = buildFeed(VIDEOS, byId('lucas'));
    expect(feed.slice(0, 3).every((f) => !f.exploration)).toBe(true);
    expect(feed[3]!.exploration).toBe(true);
    expect(feed[7]!.exploration).toBe(true);
    expect(feed[11]!.exploration).toBe(true);
    expect(feed.slice(0, 12).filter((f) => f.exploration)).toHaveLength(3);
  });

  it('une carte Découverte vient d’un domaine encore peu scoré', () => {
    for (const p of SEED_PROFILES) {
      const feed = buildFeed(VIDEOS, p);
      const best = feed[0]!.score;
      for (const e of feed.filter((f) => f.exploration)) expect(e.score).toBeLessThanOrEqual(best / 4);
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

describe('buildLiveFeed (réorientation en direct)', () => {
  it('garde à l’identique les fiches déjà vues dans la session', () => {
    const lucas = byId('lucas');
    const frozen = buildFeed(VIDEOS, lucas).slice(0, 2);
    const live = buildLiveFeed(VIDEOS, { ...lucas, tagScores: { Finance: 80 } }, frozen);
    expect(live.slice(0, 2).map((f) => f.video.id)).toEqual(frozen.map((f) => f.video.id));
    expect(live).toHaveLength(VIDEOS.length);
    expect(new Set(live.map((f) => f.video.id)).size).toBe(VIDEOS.length);
  });

  it('réordonne la suite : une étoile sur une Découverte attire son domaine', () => {
    const lucas = byId('lucas');
    const feed = buildFeed(VIDEOS, lucas);
    const discovery = feed[3]!;
    expect(discovery.exploration).toBe(true);
    const frozen = feed.slice(0, 4);
    // Une étoile (+5) puis l'intérêt qui continue de grimper sur ce domaine.
    const starred = toggleStar(lucas, discovery.video);
    const p = {
      ...starred,
      tagScores: { ...starred.tagScores, ...Object.fromEntries(discovery.video.tags.map((t) => [t, 40])) },
    };
    const next = buildLiveFeed(VIDEOS, p, frozen)[4]!;
    expect(next.video.tags.some((t) => discovery.video.tags.includes(t))).toBe(true);
  });

  it('continue le rythme 3 + 1 après la partie figée', () => {
    const lucas = byId('lucas');
    const frozen = buildFeed(VIDEOS, lucas).slice(0, 5);
    const live = buildLiveFeed(VIDEOS, lucas, frozen);
    expect(live[5]!.exploration).toBe(false);
    expect(live[7]!.exploration).toBe(true);
  });

  it('met à jour le score affiché des fiches figées', () => {
    const lucas = byId('lucas');
    const frozen = buildFeed(VIDEOS, lucas).slice(0, 1);
    expect(buildLiveFeed(VIDEOS, { ...lucas, tagScores: {} }, frozen)[0]!.score).toBe(0);
  });
});
