import { describe, expect, it } from 'vitest';
import { generateDebrief, generateParentReport, plainCognitive, plainRiasec } from '../../src/engine/generate';
import { SEED_PROFILES } from '../../src/data/profiles';
import { VIDEOS } from '../../src/data/videos';
import { RIASEC_KEYS } from '../../src/domain/types';
import { makeProfile } from '../helpers';

const wordCount = (s: string) => s.split(/\s+/).filter(Boolean).length;
const knownTitles = new Set(VIDEOS.map((v) => v.title));

describe('generateDebrief (côté jeune)', () => {
  it.each(SEED_PROFILES.map((p) => [p.name, p]))('fait entre 40 et 60 mots pour %s', (_n, profile) => {
    const d = generateDebrief(profile, VIDEOS);
    expect(wordCount(d.text)).toBeGreaterThanOrEqual(40);
    expect(wordCount(d.text)).toBeLessThanOrEqual(60);
  });

  it('tutoie le jeune et l’appelle par son prénom', () => {
    const d = generateDebrief(SEED_PROFILES[0]!, VIDEOS);
    expect(d.text).toContain(SEED_PROFILES[0]!.name);
    expect(d.text).toMatch(/\b(tu|toi|ton|ta|tes|t’)\b/i);
  });

  it('cite exactement 2 pistes qui existent dans la base (zéro hallucination)', () => {
    for (const p of SEED_PROFILES) {
      const d = generateDebrief(p, VIDEOS);
      expect(d.citedVideoIds).toHaveLength(2);
      for (const id of d.citedVideoIds) {
        const v = VIDEOS.find((x) => x.id === id);
        expect(v).toBeDefined();
        expect(d.text).toContain(v!.title.split(',')[0]!);
      }
    }
  });

  it('n’emploie pas de jargon psychométrique brut', () => {
    for (const p of SEED_PROFILES) {
      const d = generateDebrief(p, VIDEOS);
      for (const key of RIASEC_KEYS) expect(d.text).not.toContain(key);
      expect(d.text).not.toMatch(/RIASEC|Flexibilité des catégories|Raisonnement/);
    }
  });

  it('découpe le texte en sous-titres courts', () => {
    const d = generateDebrief(SEED_PROFILES[1]!, VIDEOS);
    expect(d.lines.length).toBeGreaterThan(2);
    expect(d.lines.join(' ')).toBe(d.text);
    for (const l of d.lines) expect(wordCount(l)).toBeLessThanOrEqual(16);
  });

  it('suit la réorientation : les pistes changent avec les tags', () => {
    const p = makeProfile({ tagScores: { Finance: 60 } });
    expect(generateDebrief(p, VIDEOS).citedVideoIds).toContain('conseiller-financier');
  });

  it('reste valide avec un profil sans tag ni aptitude', () => {
    const p = makeProfile({ tagScores: {}, topCognitive: [] });
    const d = generateDebrief(p, VIDEOS);
    expect(d.citedVideoIds).toHaveLength(2);
    expect(d.text).not.toContain('undefined');
  });
});

describe('generateParentReport (côté parents)', () => {
  it('suit la structure attendue en 4 parties + avertissement', () => {
    const r = generateParentReport(SEED_PROFILES[2]!, VIDEOS);
    expect(r.sections.map((s) => s.id)).toEqual(['forces', 'exploration', 'pistes', 'conseil']);
    expect(r.disclaimer).toMatch(/pistes de réflexion/);
    expect(r.disclaimer).toMatch(/non une évaluation définitive/);
  });

  it('ne cite que des aptitudes, traits et scores présents dans le profil', () => {
    for (const p of SEED_PROFILES) {
      const r = generateParentReport(p, VIDEOS);
      const forces = r.sections.find((s) => s.id === 'forces')!;
      const text = forces.items.join(' ');
      for (const apt of p.topCognitive) expect(text).toContain(apt);
      const numbers = text.match(/\d+/g)?.map(Number) ?? [];
      // Seuls les scores RIASEC du profil (et l'échelle /100) peuvent apparaître.
      const allowed = new Set([...Object.values(p.riasec), 100]);
      for (const n of numbers) expect(allowed.has(n)).toBe(true);
    }
  });

  it('ne cite que des métiers du catalogue, rangés par durée d’études', () => {
    const r = generateParentReport(SEED_PROFILES[0]!, VIDEOS);
    const pistes = r.sections.find((s) => s.id === 'pistes')!;
    expect(pistes.groups!.length).toBeGreaterThan(0);
    const zones = pistes.groups!.map((g) => g.zone);
    expect([...zones].sort()).toEqual(zones);
    for (const g of pistes.groups!) {
      for (const t of g.titles) expect(knownTitles.has(t)).toBe(true);
    }
  });

  it('mentionne les vidéos étoilées dans la dynamique d’exploration', () => {
    const p = makeProfile({ starredVideoIds: ['acteur', 'barista'] });
    const r = generateParentReport(p, VIDEOS);
    const expl = r.sections.find((s) => s.id === 'exploration')!.items.join(' ');
    expect(expl).toContain('2');
    expect(expl).toContain('Acteur, actrice');
  });
});

describe('traductions en langage simple', () => {
  it('traduit chaque dimension RIASEC', () => {
    for (const k of RIASEC_KEYS) expect(plainRiasec(k).length).toBeGreaterThan(5);
    expect(plainRiasec('Réaliste')).toBe('aimer le concret et bouger');
  });

  it('traduit les aptitudes connues et ignore les inconnues', () => {
    expect(plainCognitive('Flexibilité des catégories')).toBe('savoir t’adapter vite');
    expect(plainCognitive('Inconnue')).toBeNull();
  });
});
