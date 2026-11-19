import { describe, expect, it } from 'vitest';
import { sanitizeProfile, sanitizeProfiles } from '../../src/domain/validation';
import { SEED_PROFILES } from '../../src/data/profiles';

const seed = SEED_PROFILES[0]!;

describe('sanitizeProfile', () => {
  it('accepte un profil valide tel quel', () => {
    expect(sanitizeProfile(structuredClone(seed), seed)).toEqual(seed);
  });

  it('rejette les entrées qui ne sont pas des objets', () => {
    for (const bad of [null, undefined, 42, 'x', [], true]) {
      expect(sanitizeProfile(bad, seed)).toEqual(seed);
    }
  });

  it('ignore les tags hors catalogue (injection depuis localStorage)', () => {
    const tampered = { ...seed, tagScores: { '<script>alert(1)</script>': 99, Finance: 7 } };
    expect(sanitizeProfile(tampered, seed).tagScores).toEqual({ Finance: 7 });
  });

  it('borne les scores et rejette les non-nombres', () => {
    const tampered = { ...seed, tagScores: { Finance: 1e9, Logistique: -4, 'Son & Média': 'x', 'Créatif & Scène': Number.NaN } };
    expect(sanitizeProfile(tampered, seed).tagScores).toEqual({ Finance: 100, Logistique: 0 });
  });

  it('ne garde que des ids de vidéos connus, sans doublon', () => {
    const tampered = { ...seed, starredVideoIds: ['acteur', 'acteur', 'javascript:alert(1)', 3], watchedVideoIds: 'nope' };
    const out = sanitizeProfile(tampered, seed);
    expect(out.starredVideoIds).toEqual(['acteur']);
    expect(out.watchedVideoIds).toEqual([]);
  });

  it('ne laisse jamais modifier les champs d’identité ni ajouter de champ', () => {
    const tampered = { ...seed, name: 'Pirate', age: 99, notes: 'texte libre médical', riasec: { Réaliste: 1 } };
    const out = sanitizeProfile(tampered, seed);
    expect(out.name).toBe(seed.name);
    expect(out.age).toBe(seed.age);
    expect(out.riasec).toEqual(seed.riasec);
    expect(out).not.toHaveProperty('notes');
  });

  it('résiste à la pollution de prototype', () => {
    const tampered = JSON.parse('{"tagScores":{"__proto__":{"polluted":1},"Finance":3}}');
    const out = sanitizeProfile(tampered, seed);
    expect(out.tagScores).toEqual({ Finance: 3 });
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });
});

describe('sanitizeProfiles', () => {
  it('reconstruit tous les profils de référence, même à partir de rien', () => {
    const out = sanitizeProfiles(undefined);
    expect(Object.keys(out).sort()).toEqual(SEED_PROFILES.map((p) => p.id).sort());
  });

  it('ignore les profils inconnus injectés', () => {
    const out = sanitizeProfiles({ intrus: { ...seed, id: 'intrus' } });
    expect(out).not.toHaveProperty('intrus');
  });
});
