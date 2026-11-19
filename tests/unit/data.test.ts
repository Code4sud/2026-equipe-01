import { describe, expect, it } from 'vitest';
import { VIDEOS, getVideoById } from '../../src/data/videos';
import { SEED_PROFILES } from '../../src/data/profiles';
import { ALL_TAGS, isKnownTag, riasecOfTag } from '../../src/data/tags';
import { RIASEC_KEYS, ZONE_LABELS } from '../../src/domain/types';

describe('catalogue de vidéos', () => {
  it('contient entre 12 et 15 vidéos aux ids uniques', () => {
    expect(VIDEOS.length).toBeGreaterThanOrEqual(12);
    expect(VIDEOS.length).toBeLessThanOrEqual(15);
    expect(new Set(VIDEOS.map((v) => v.id)).size).toBe(VIDEOS.length);
  });

  it.each(VIDEOS.map((v) => [v.id, v]))('%s respecte le contrat', (_id, v) => {
    expect(v.tags.length).toBeGreaterThanOrEqual(2);
    expect(v.tags.length).toBeLessThanOrEqual(3);
    for (const t of v.tags) expect(isKnownTag(t)).toBe(true);
    expect(v.hook.length).toBeLessThanOrEqual(140);
    expect(v.dailyTasks).toHaveLength(3);
    expect(v.zoneLabel).toBe(ZONE_LABELS[v.zone]);
    expect(v.id).toMatch(/^[a-z0-9-]+$/);
  });

  it('couvre chaque tag du catalogue au moins une fois', () => {
    const used = new Set(VIDEOS.flatMap((v) => v.tags));
    for (const t of ALL_TAGS) expect(used.has(t)).toBe(true);
  });

  it('retrouve une vidéo par id', () => {
    expect(getVideoById('acteur')?.title).toBe('Acteur, actrice');
    expect(getVideoById('inconnu')).toBeUndefined();
  });
});

describe('profils fictifs', () => {
  it('fournit les 3 profils attendus', () => {
    expect(SEED_PROFILES.map((p) => p.name).sort()).toEqual(['Emma', 'Lucas', 'Yanis']);
  });

  it.each(SEED_PROFILES.map((p) => [p.name, p]))('%s a des données cohérentes', (_n, p) => {
    for (const k of RIASEC_KEYS) {
      expect(p.riasec[k]).toBeGreaterThanOrEqual(0);
      expect(p.riasec[k]).toBeLessThanOrEqual(100);
    }
    for (const t of Object.keys(p.tagScores)) expect(isKnownTag(t)).toBe(true);
    expect(p.age).toBeGreaterThanOrEqual(16);
    expect(p.age).toBeLessThanOrEqual(25);
  });

  it('associe chaque tag à au moins une dimension RIASEC', () => {
    for (const t of ALL_TAGS) expect(riasecOfTag(t).length).toBeGreaterThan(0);
    expect(riasecOfTag('inconnu')).toEqual([]);
  });
});
