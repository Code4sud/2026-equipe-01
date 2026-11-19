import { beforeEach, describe, expect, it } from 'vitest';
import { STORAGE_KEY, syncProfilesFromStorage, useStore } from '../../src/store/useStore';
import { buildFeed } from '../../src/engine/recommend';
import { VIDEOS } from '../../src/data/videos';
import type { RegistrationInput } from '../../src/engine/auth';

const state = () => useStore.getState();
const pdf = (name = 'rapport.pdf', size = 2048) => ({ name, size, type: 'application/pdf' });

const SIGNUP: RegistrationInput = {
  firstName: 'Sarah',
  lastName: 'Benali',
  age: '17',
  email: 'sarah@exemple.fr',
  password: 'secret1',
  interests: ['Design & Image', 'Tech & Numérique'],
};

beforeEach(() => {
  localStorage.clear();
  state().logout();
  state().resetDemo();
});

describe('connexion', () => {
  it('démarre sans session, sur Lucas', () => {
    expect(state().session).toBeNull();
    expect(state().currentYouthId).toBe('lucas');
  });

  it('connecte un jeune avec ses identifiants de démo', () => {
    expect(state().login('ines@polaria.fr', 'jeune123')).toEqual({ ok: true, role: 'jeune' });
    expect(state().session).toEqual({ accountId: 'ines', role: 'jeune' });
    expect(state().currentYouthId).toBe('ines');
  });

  it('connecte le pro', () => {
    expect(state().login('dr.martin@polaria.fr', 'pro123')).toEqual({ ok: true, role: 'pro' });
  });

  it('refuse de mauvais identifiants avec un message clair', () => {
    const r = state().login('lucas@polaria.fr', 'faux');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/incorrect/);
    expect(state().session).toBeNull();
  });
});

describe('inscription en mémoire', () => {
  it('crée, connecte et ajoute le jeune à la liste du pro', () => {
    expect(state().register(SIGNUP)).toEqual({ ok: true });
    const id = state().session!.accountId;
    expect(state().currentYouthId).toBe(id);
    expect(state().profiles[id]).toMatchObject({ name: 'Sarah', hasBilan: false });
    expect(state().login('sarah@exemple.fr', 'secret1').ok).toBe(true);
  });

  it('n’est jamais persistée dans le localStorage', () => {
    state().register(SIGNUP);
    const raw = localStorage.getItem(STORAGE_KEY) ?? '';
    expect(raw).not.toContain('Sarah');
    expect(raw).not.toContain('sarah@exemple.fr');
    expect(raw).not.toContain('secret1');
  });

  it('renvoie les erreurs de validation', () => {
    const r = state().register({ ...SIGNUP, email: 'lucas@polaria.fr', interests: [] });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.errors).sort()).toEqual(['email', 'interests']);
  });
});

describe('signaux du jeune', () => {
  beforeEach(() => state().login('lucas@polaria.fr', 'jeune123'));

  it('étoile : met à jour les tags du jeune connecté', () => {
    const before = state().profiles.lucas!.tagScores['Technique & Énergie']!;
    state().star('technicien-son');
    expect(state().profiles.lucas!.tagScores['Technique & Énergie']).toBe(before + 5);
  });

  it('Mon Profil : voir plus, voir moins et explorer un domaine', () => {
    const before = state().profiles.lucas!.tagScores['Manuel & Terrain']!;
    state().youthTune('Manuel & Terrain', 1);
    expect(state().profiles.lucas!.tagScores['Manuel & Terrain']).toBe(before + 3);
    state().youthTune('Manuel & Terrain', -1);
    state().youthTune('Manuel & Terrain', -1);
    expect(state().profiles.lucas!.tagScores['Manuel & Terrain']).toBe(before - 3);
    state().youthExplore('Design & Image');
    expect(state().profiles.lucas!.tagScores['Design & Image']).toBe(6);
    state().youthExplore('Pas un tag');
    expect(state().profiles.lucas!.tagScores).not.toHaveProperty('Pas un tag');
  });

  it('ignore une vidéo inconnue', () => {
    const before = structuredClone(state().profiles);
    state().star('nope');
    state().watch('nope');
    expect(state().profiles).toEqual(before);
  });

  it('ignore les signaux sans session', () => {
    state().logout();
    const before = structuredClone(state().profiles);
    state().star('acteur');
    expect(state().profiles).toEqual(before);
  });

  it('un jeune ne peut pas utiliser les actions pro', () => {
    const before = structuredClone(state().profiles);
    state().proAddTag('lucas', 'Finance');
    expect(state().proAddDocument('lucas', pdf())).toMatch(/réservée/);
    expect(state().profiles).toEqual(before);
  });
});

describe('actions pro', () => {
  beforeEach(() => state().login('dr.martin@polaria.fr', 'pro123'));

  it('la réorientation change instantanément le feed du jeune', () => {
    state().proAddTag('noah', 'Finance');
    state().proAdjustTag('noah', 'Finance', 80);
    expect(buildFeed(VIDEOS, state().profiles.noah!)[0]!.video.id).toBe('conseiller-financier');
  });

  it('ignore un tag hors catalogue', () => {
    state().proAddTag('noah', 'Remarque libre');
    expect(state().profiles.noah!.tagScores).not.toHaveProperty('Remarque libre');
  });

  it('importe puis retire un PDF', () => {
    expect(state().proAddDocument('yanis', pdf('bilan.pdf', 4096))).toBeNull();
    const docs = state().profiles.yanis!.documents;
    expect(docs).toHaveLength(1);
    expect(docs[0]).toMatchObject({ name: 'bilan.pdf', size: 4096 });
    state().proRemoveDocument('yanis', docs[0]!.id);
    expect(state().profiles.yanis!.documents).toEqual([]);
  });

  it('refuse un fichier qui n’est pas un PDF', () => {
    expect(state().proAddDocument('yanis', { name: 'x.exe', size: 10, type: 'application/octet-stream' })).not.toBeNull();
    expect(state().profiles.yanis!.documents).toEqual([]);
  });

  it('prévisualise le feed d’un jeune', () => {
    state().previewYouth('chloe');
    expect(state().currentYouthId).toBe('chloe');
  });
});

describe('persistance', () => {
  it('persiste les profils de démo', () => {
    state().login('lucas@polaria.fr', 'jeune123');
    state().star('acteur');
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(raw.state.profiles.lucas.starredVideoIds).toContain('acteur');
  });

  it('assainit un localStorage falsifié à la réhydratation', async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 2,
        state: {
          currentYouthId: '<img onerror=alert(1)>',
          session: { accountId: 'dr-martin', role: 'jeune' },
          profiles: {
            lucas: {
              name: 'Hack',
              tagScores: { '<b>x</b>': 50, Finance: 9999 },
              documents: [{ id: 'd1', name: '<script>.pdf', size: 10, date: '2026-01-01' }, { id: 'bad', name: 'x', size: -1, date: 'hier' }],
            },
          },
        },
      }),
    );
    await useStore.persist.rehydrate();
    expect(state().currentYouthId).toBe('lucas');
    expect(state().session).toBeNull();
    expect(state().profiles.lucas!.name).toBe('Lucas');
    expect(state().profiles.lucas!.tagScores).toEqual({ Finance: 100 });
    expect(state().profiles.lucas!.documents).toEqual([{ id: 'd1', name: 'script.pdf', size: 10, date: '2026-01-01' }]);
  });

  it('survit à un JSON corrompu', async () => {
    localStorage.setItem(STORAGE_KEY, '{pas du json');
    await useStore.persist.rehydrate();
    expect(Object.keys(state().profiles)).toHaveLength(5);
  });
});

describe('synchro inter-onglets', () => {
  it('partage les profils, garde la session locale et les comptes en mémoire', () => {
    state().register(SIGNUP);
    const me = state().session!;
    const other = structuredClone(state().profiles);
    other.ines!.tagScores.Finance = 42;
    syncProfilesFromStorage(JSON.stringify({ version: 2, state: { session: null, profiles: other } }));
    expect(state().profiles.ines!.tagScores.Finance).toBe(42);
    expect(state().session).toEqual(me);
    expect(state().profiles[me.accountId]).toBeDefined();
  });

  it('ne réécrit pas un état identique (pas de ping-pong)', () => {
    const writes: string[] = [];
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (k: string, v: string) {
      writes.push(k);
      return original.call(this, k, v);
    };
    try {
      syncProfilesFromStorage(JSON.stringify({ version: 2, state: { profiles: state().profiles } }));
      expect(writes).toEqual([]);
    } finally {
      Storage.prototype.setItem = original;
    }
  });

  it('ignore les valeurs nulles ou corrompues', () => {
    const before = structuredClone(state().profiles);
    syncProfilesFromStorage(null);
    syncProfilesFromStorage('{oops');
    expect(state().profiles).toEqual(before);
  });
});
