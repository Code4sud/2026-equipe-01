import { describe, expect, it } from 'vitest';
import { RIASEC_KEYS } from '../../src/domain/types';
import { dynamicRiasec, estimateRiasec, MAX_RIASEC_SHIFT } from '../../src/engine/riasec';
import { matchPercent, matchedTags } from '../../src/engine/match';
import { authenticate, createYouthAccount, validateRegistration, type RegistrationInput } from '../../src/engine/auth';
import { formatSize, makeDocument, MAX_PDF_BYTES, sanitizeFileName, validatePdf } from '../../src/engine/documents';
import { SEED_ACCOUNTS } from '../../src/data/accounts';
import { getVideoById } from '../../src/data/videos';
import { makeProfile, makeVideo } from '../helpers';

describe('dynamicRiasec', () => {
  it('ne bouge pas sans tag', () => {
    const p = makeProfile({ tagScores: {} });
    expect(dynamicRiasec(p)).toEqual(p.riasec);
  });

  it('augmente la dimension liée aux tags actifs, de façon bornée', () => {
    const p = makeProfile({ riasec: { Réaliste: 50, Investigateur: 50, Artistique: 50, Social: 50, Entreprenant: 50, Conventionnel: 50 }, tagScores: { 'Son & Média': 20 } });
    const d = dynamicRiasec(p);
    expect(d.Artistique).toBeGreaterThan(50);
    expect(d.Artistique - 50).toBeLessThanOrEqual(MAX_RIASEC_SHIFT);
    expect(d.Entreprenant).toBe(50);
  });

  it('réagit à chaque étoile (+5)', () => {
    const p = makeProfile({ tagScores: { 'Son & Média': 4 } });
    const after = makeProfile({ tagScores: { 'Son & Média': 9 } });
    expect(dynamicRiasec(after).Artistique).toBeGreaterThan(dynamicRiasec(p).Artistique);
  });

  it('reste dans [0, 100]', () => {
    const p = makeProfile({ riasec: { Réaliste: 99, Investigateur: 0, Artistique: 0, Social: 0, Entreprenant: 0, Conventionnel: 0 }, tagScores: { 'Manuel & Terrain': 100, 'Plein air & Nature': 100 } });
    for (const v of Object.values(dynamicRiasec(p))) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(100);
    }
  });
});

describe('estimateRiasec', () => {
  it('fait ressortir les dimensions des centres d’intérêt choisis', () => {
    const r = estimateRiasec(['Tech & Numérique', 'Logique']);
    const top = [...RIASEC_KEYS].sort((a, b) => r[b] - r[a])[0];
    expect(top).toBe('Investigateur');
    for (const v of Object.values(r)) expect(v).toBeLessThanOrEqual(85);
  });
});

describe('matchPercent', () => {
  it('vaut 100 % quand la vidéo porte les meilleurs tags du jeune', () => {
    const p = makeProfile({ tagScores: { 'Son & Média': 14, 'Créatif & Scène': 10, Finance: 2 } });
    expect(matchPercent(makeVideo('a', ['Son & Média', 'Créatif & Scène']), p)).toBe(100);
  });

  it('vaut 0 % sans tag commun ou sans tag du tout', () => {
    expect(matchPercent(makeVideo('a', ['Finance']), makeProfile({ tagScores: { Logique: 4 } }))).toBe(0);
    expect(matchPercent(makeVideo('a', ['Finance']), makeProfile({ tagScores: {} }))).toBe(0);
  });

  it('donne un pourcentage intermédiaire cohérent', () => {
    const p = makeProfile({ tagScores: { 'Son & Média': 10, 'Créatif & Scène': 10 } });
    expect(matchPercent(makeVideo('a', ['Son & Média', 'Finance']), p)).toBe(50);
  });

  it('liste chaque tag de la vidéo avec le poids du jeune', () => {
    const p = makeProfile({ tagScores: { 'Son & Média': 14 } });
    expect(matchedTags(getVideoById('technicien-son')!, p)).toEqual([
      ['Son & Média', 14],
      ['Technique & Énergie', 0],
    ]);
  });
});

describe('authenticate', () => {
  it('connecte un compte de démo, email insensible à la casse et aux espaces', () => {
    expect(authenticate(SEED_ACCOUNTS, '  Lucas@Polaria.fr ', 'jeune123')?.id).toBe('lucas');
    expect(authenticate(SEED_ACCOUNTS, 'dr.martin@polaria.fr', 'pro123')?.role).toBe('pro');
  });

  it('refuse un mauvais mot de passe ou un compte inconnu', () => {
    expect(authenticate(SEED_ACCOUNTS, 'lucas@polaria.fr', 'JEUNE123')).toBeNull();
    expect(authenticate(SEED_ACCOUNTS, 'personne@polaria.fr', 'jeune123')).toBeNull();
    expect(authenticate(SEED_ACCOUNTS, '', '')).toBeNull();
  });
});

const valid: RegistrationInput = {
  firstName: 'Sarah',
  lastName: 'Benali',
  age: '17',
  email: 'sarah@exemple.fr',
  password: 'secret1',
  interests: ['Design & Image', 'Tech & Numérique'],
};

describe('validateRegistration', () => {
  it('accepte une inscription valide', () => {
    const r = validateRegistration(valid, []);
    expect(r.ok).toBe(true);
  });

  it.each([
    ['firstName', { firstName: '' }],
    ['firstName', { firstName: '<script>' }],
    ['lastName', { lastName: 'x'.repeat(41) }],
    ['age', { age: '12' }],
    ['age', { age: '17.5' }],
    ['email', { email: 'pas-un-email' }],
    ['password', { password: '123' }],
    ['interests', { interests: ['Design & Image'] }],
    ['interests', { interests: ['Design & Image', 'Logique', 'Finance', 'Accompagnement'] }],
    ['interests', { interests: ['Design & Image', 'Inventé'] }],
  ] as const)('refuse un champ %s invalide', (field, patch) => {
    const r = validateRegistration({ ...valid, ...patch } as RegistrationInput, []);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors).toHaveProperty(field);
  });

  it('refuse un email déjà utilisé', () => {
    const r = validateRegistration({ ...valid, email: 'LUCAS@polaria.fr' }, SEED_ACCOUNTS.map((a) => a.email));
    expect(r.ok).toBe(false);
  });
});

describe('createYouthAccount', () => {
  it('crée un compte jeune sans bilan, avec tags de départ et RIASEC estimé', () => {
    const r = validateRegistration(valid, []);
    if (!r.ok) throw new Error('invalide');
    const { account, profile } = createYouthAccount(r.value, 'u-1');
    expect(account).toMatchObject({ id: 'u-1', role: 'jeune', email: 'sarah@exemple.fr', displayName: 'Sarah B.' });
    expect(profile).toMatchObject({ id: 'u-1', name: 'Sarah', age: 17, hasBilan: false, documents: [] });
    expect(profile.tagScores).toEqual({ 'Design & Image': 10, 'Tech & Numérique': 10 });
    expect(JSON.stringify(profile)).not.toContain('Benali');
  });
});

describe('documents PDF', () => {
  it('accepte un PDF raisonnable', () => {
    expect(validatePdf({ name: 'rapport.pdf', size: 1000, type: 'application/pdf' })).toBeNull();
    expect(validatePdf({ name: 'RAPPORT.PDF', size: 1000, type: '' })).toBeNull();
  });

  it.each([
    [{ name: 'photo.png', size: 10, type: 'image/png' }],
    [{ name: 'faux.pdf', size: 10, type: 'text/html' }],
    [{ name: 'vide.pdf', size: 0, type: 'application/pdf' }],
    [{ name: 'gros.pdf', size: MAX_PDF_BYTES + 1, type: 'application/pdf' }],
  ])('refuse %o', (file) => {
    expect(validatePdf(file)).not.toBeNull();
  });

  it('nettoie le nom de fichier', () => {
    expect(sanitizeFileName('C:\\fakepath\\rapport<img onerror=x> 2187.pdf')).toBe('rapportimg onerror=x 2187.pdf'.replace('=', ''));
    expect(sanitizeFileName('../../etc/rapport.PDF')).toBe('rapport.pdf');
    expect(sanitizeFileName('a'.repeat(200) + '.pdf').length).toBeLessThanOrEqual(80);
    expect(sanitizeFileName('.pdf')).toBe('document.pdf');
  });

  it('formate les tailles en français', () => {
    expect(formatSize(500)).toBe('500 o');
    expect(formatSize(2048)).toBe('2 Ko');
    expect(formatSize(2_457_600)).toBe('2,3 Mo');
  });

  it('crée une entrée datée', () => {
    expect(makeDocument({ name: 'r.pdf', size: 10, type: 'application/pdf' }, new Date('2026-11-19T10:00:00Z'), 'd1')).toEqual({
      id: 'd1',
      name: 'r.pdf',
      size: 10,
      date: '2026-11-19',
    });
  });
});
