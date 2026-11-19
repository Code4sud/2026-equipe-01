import { beforeEach, describe, expect, it } from 'vitest';
import { STORAGE_KEY, syncProfilesFromStorage, useStore } from '../../src/store/useStore';
import { buildFeed } from '../../src/engine/recommend';
import { VIDEOS } from '../../src/data/videos';

const state = () => useStore.getState();

beforeEach(() => {
  localStorage.clear();
  state().resetDemo();
});

describe('store PolarIA', () => {
  it('démarre sur Lucas, sans session', () => {
    expect(state().currentYouthId).toBe('lucas');
    expect(state().session).toBeNull();
  });

  it('connecte un jeune connu et refuse un id inconnu', () => {
    state().loginYouth('emma');
    expect(state().session).toBe('jeune');
    expect(state().currentYouthId).toBe('emma');
    state().loginYouth('intrus');
    expect(state().currentYouthId).toBe('emma');
  });

  it('étoile : met à jour les tags du jeune courant', () => {
    state().loginYouth('lucas');
    const before = state().profiles.lucas!.tagScores['Son & Média']!;
    state().star('technicien-son');
    expect(state().profiles.lucas!.tagScores['Son & Média']).toBe(before + 5);
    expect(state().profiles.lucas!.starredVideoIds).toContain('technicien-son');
  });

  it('ignore une vidéo inconnue', () => {
    const before = structuredClone(state().profiles);
    state().star('nope');
    state().watch('nope');
    expect(state().profiles).toEqual(before);
  });

  it('la réorientation pro change instantanément le feed du jeune', () => {
    state().loginPro();
    state().proAddTag('lucas', 'Finance');
    state().proAdjustTag('lucas', 'Finance', 80);
    const feed = buildFeed(VIDEOS, state().profiles.lucas!);
    expect(feed[0]!.video.id).toBe('conseiller-financier');
  });

  it('ignore une action pro sur un tag hors catalogue', () => {
    state().proAddTag('lucas', 'Remarque libre');
    expect(state().profiles.lucas!.tagScores).not.toHaveProperty('Remarque libre');
  });

  it('persiste dans localStorage', () => {
    state().star('acteur');
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(raw.state.profiles.lucas.starredVideoIds).toContain('acteur');
  });

  it('assainit un localStorage falsifié à la réhydratation', async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
        state: {
          currentYouthId: '<img onerror=alert(1)>',
          session: 'admin',
          profiles: { lucas: { name: 'Hack', tagScores: { '<b>x</b>': 50, Finance: 9999 } } },
        },
      }),
    );
    await useStore.persist.rehydrate();
    expect(state().currentYouthId).toBe('lucas');
    expect(state().session).toBeNull();
    expect(state().profiles.lucas!.name).toBe('Lucas');
    expect(state().profiles.lucas!.tagScores).toEqual({ Finance: 100 });
  });

  it('synchro inter-onglets : profils partagés, session locale conservée', () => {
    state().loginYouth('emma');
    const other = structuredClone(state().profiles);
    other.emma!.tagScores.Finance = 42;
    syncProfilesFromStorage(JSON.stringify({ version: 1, state: { session: 'pro', currentYouthId: 'yanis', profiles: other } }));
    expect(state().profiles.emma!.tagScores.Finance).toBe(42);
    expect(state().session).toBe('jeune');
    expect(state().currentYouthId).toBe('emma');
  });

  it('synchro inter-onglets : ne réécrit pas un état identique (pas de ping-pong)', () => {
    const writes: string[] = [];
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (k: string, v: string) {
      writes.push(k);
      return original.call(this, k, v);
    };
    try {
      syncProfilesFromStorage(JSON.stringify({ version: 1, state: { profiles: state().profiles } }));
      expect(writes).toEqual([]);
    } finally {
      Storage.prototype.setItem = original;
    }
  });

  it('synchro inter-onglets : ignore les valeurs nulles ou corrompues', () => {
    const before = structuredClone(state().profiles);
    syncProfilesFromStorage(null);
    syncProfilesFromStorage('{oops');
    expect(state().profiles).toEqual(before);
  });

  it('survit à un JSON corrompu', async () => {
    localStorage.setItem(STORAGE_KEY, '{pas du json');
    await useStore.persist.rehydrate();
    expect(Object.keys(state().profiles)).toHaveLength(3);
  });
});
