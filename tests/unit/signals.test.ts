import { describe, expect, it } from 'vitest';
import {
  PRO_NEW_TAG_POINTS,
  STAR_POINTS,
  WATCH_POINTS,
  addTag,
  adjustTag,
  recordWatch,
  removeTag,
  toggleStar,
} from '../../src/engine/signals';
import { makeProfile, makeVideo } from '../helpers';

const video = makeVideo('v1', ['Son & Média', 'Finance']);

describe('toggleStar', () => {
  it('ajoute +5 à chaque tag et met la vidéo en favori', () => {
    const p = makeProfile({ tagScores: { 'Son & Média': 12 }, starredVideoIds: [] });
    const next = toggleStar(p, video);
    expect(STAR_POINTS).toBe(5);
    expect(next.tagScores).toEqual({ 'Son & Média': 17, Finance: 5 });
    expect(next.starredVideoIds).toEqual(['v1']);
  });

  it('retire 5 points quand on enlève l’étoile', () => {
    const p = makeProfile({ tagScores: { 'Son & Média': 12 }, starredVideoIds: [] });
    const back = toggleStar(toggleStar(p, video), video);
    expect(back.tagScores['Son & Média']).toBe(12);
    expect(back.tagScores.Finance).toBe(0);
    expect(back.starredVideoIds).toEqual([]);
  });

  it('ne descend jamais sous 0', () => {
    const p = makeProfile({ tagScores: { Finance: 2 }, starredVideoIds: ['v1'] });
    expect(toggleStar(p, video).tagScores.Finance).toBe(0);
  });

  it('ne mute pas le profil d’origine', () => {
    const p = makeProfile({ tagScores: { Finance: 1 } });
    const snapshot = structuredClone(p);
    toggleStar(p, video);
    expect(p).toEqual(snapshot);
  });
});

describe('recordWatch', () => {
  it('ajoute +2 la première fois seulement', () => {
    const p = makeProfile({ tagScores: { Finance: 1 }, watchedVideoIds: [] });
    const once = recordWatch(p, video);
    expect(WATCH_POINTS).toBe(2);
    expect(once.tagScores.Finance).toBe(3);
    expect(once.watchedVideoIds).toEqual(['v1']);
    expect(recordWatch(once, video)).toBe(once);
  });
});

describe('édition pro des tags', () => {
  it('ajoute un tag connu à 10 points', () => {
    const p = makeProfile({ tagScores: {} });
    expect(PRO_NEW_TAG_POINTS).toBe(10);
    expect(addTag(p, 'Logistique').tagScores).toEqual({ Logistique: 10 });
  });

  it('n’écrase pas un tag existant', () => {
    const p = makeProfile({ tagScores: { Logistique: 30 } });
    expect(addTag(p, 'Logistique')).toBe(p);
  });

  it('refuse un tag hors catalogue (pas de saisie libre)', () => {
    const p = makeProfile({ tagScores: {} });
    expect(() => addTag(p, '<img src=x onerror=alert(1)>')).toThrow();
    expect(() => addTag(p, 'Notes du psy : anxieux')).toThrow();
  });

  it('ajuste le poids dans les bornes 0..100', () => {
    const p = makeProfile({ tagScores: { Finance: 98 } });
    expect(adjustTag(p, 'Finance', 5).tagScores.Finance).toBe(100);
    expect(adjustTag(p, 'Finance', -500).tagScores.Finance).toBe(0);
  });

  it('refuse un delta non fini', () => {
    expect(() => adjustTag(makeProfile(), 'Finance', Number.POSITIVE_INFINITY)).toThrow();
  });

  it('supprime un tag', () => {
    const p = makeProfile({ tagScores: { Finance: 4, Logistique: 2 } });
    expect(removeTag(p, 'Finance').tagScores).toEqual({ Logistique: 2 });
  });
});
