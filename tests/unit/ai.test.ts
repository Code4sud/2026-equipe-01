import { describe, expect, it } from 'vitest';
import {
  PARENT_DISCLAIMER,
  SCENE_MAX_WORDS,
  STORY_ICONS,
  buildAiContext,
  instantParentReport,
  instantScenario,
  inventsFacts,
  parentUserPrompt,
  sanitizeParentReport,
  sanitizeScenario,
  scenarioUserPrompt,
  zoneLabel,
} from '../../src/engine/ai';
import { SEED_PROFILES } from '../../src/data/profiles';
import { VIDEOS } from '../../src/data/videos';
import { RIASEC_KEYS } from '../../src/domain/types';
import { makeProfile } from '../helpers';

const wordCount = (s: string) => s.split(/\s+/).filter(Boolean).length;
const titles = new Set(VIDEOS.map((v) => v.title));
const lucas = SEED_PROFILES.find((p) => p.id === 'lucas')!;
const ctxLucas = buildAiContext(lucas, VIDEOS);

describe('buildAiContext : le seul JSON envoyé au LLM', () => {
  it('ne contient que le prénom, l’âge, les scores et des métiers du store', () => {
    const ctx = buildAiContext(lucas, VIDEOS);
    expect(Object.keys(ctx).sort()).toEqual(
      ['age', 'discovery', 'hasBilan', 'jobs', 'name', 'riasec', 'starredJobs', 'tagScores', 'topCognitive', 'watchedCount'].sort(),
    );
    expect(ctx.name).toBe('Lucas');
    for (const j of ctx.jobs) expect(titles.has(j.title)).toBe(true);
    expect(ctx.jobs.length).toBeLessThanOrEqual(8);
    expect(JSON.stringify(ctx)).not.toMatch(/rdv|documents|password|@/i);
  });

  it('place les métiers étoilés en tête et propose une Découverte hors de la liste', () => {
    const ctx = buildAiContext(lucas, VIDEOS);
    expect(ctx.starredJobs).toContain('Technicien solaire thermique');
    expect(ctx.jobs[0]!.title).toBe('Technicien solaire thermique');
    expect(ctx.discovery).not.toBeNull();
    expect(ctx.jobs.some((j) => j.id === ctx.discovery!.id)).toBe(false);
  });

  it('reste petit pour tenir dans la fenêtre de contexte du modèle', () => {
    for (const p of SEED_PROFILES) {
      const ctx = buildAiContext(p, VIDEOS);
      expect(scenarioUserPrompt(ctx).length).toBeLessThan(6000);
      expect(parentUserPrompt(ctx).length).toBeLessThan(6000);
    }
  });
});

describe('Mini-IA n°1 : scénario « Reel d’Immersion » (mode instantané)', () => {
  it.each(SEED_PROFILES.map((p) => [p.name, p]))('4 scènes de 25 mots max pour %s', (_n, profile) => {
    const s = instantScenario(buildAiContext(profile, VIDEOS));
    expect(s.scenes).toHaveLength(4);
    s.scenes.forEach((scene, i) => {
      expect(scene.step).toBe(i + 1);
      expect(wordCount(scene.subtitle)).toBeLessThanOrEqual(SCENE_MAX_WORDS);
      expect(wordCount(scene.subtitle)).toBeGreaterThanOrEqual(10);
      expect(STORY_ICONS).toContain(scene.iconName);
      expect(scene.durationSec).toBeGreaterThanOrEqual(4);
    });
  });

  it('tutoie, sans jargon psychométrique', () => {
    for (const p of SEED_PROFILES) {
      const text = instantScenario(buildAiContext(p, VIDEOS)).scenes.map((s) => s.subtitle).join(' ');
      expect(text).toMatch(/\b(tu|toi|ton|ta|tes|t’)\b/i);
      for (const key of RIASEC_KEYS) expect(text).not.toContain(key);
      expect(text).not.toMatch(/RIASEC|Flexibilité des catégories|Raisonnement/);
    }
  });

  it('suit la structure : métier, forces, étoiles, Découverte', () => {
    const s = instantScenario(ctxLucas);
    expect(s.scenes[0]!.subtitle).toContain('Technicien solaire thermique');
    expect(s.scenes[2]!.subtitle).toMatch(/étoile/);
    expect(s.scenes[3]!.subtitle).toContain(ctxLucas.discovery!.title);
    expect(s.scenes[3]!.iconName).toBe('Compass');
  });

  it('reste valide avec un profil vide', () => {
    const empty = makeProfile({ tagScores: {}, starredVideoIds: [], watchedVideoIds: [], topCognitive: [] });
    const s = instantScenario(buildAiContext(empty, VIDEOS));
    expect(s.scenes).toHaveLength(4);
  });
});

describe('Mini-IA n°2 : bilan parents (mode instantané)', () => {
  it.each(SEED_PROFILES.map((p) => [p.name, p]))('4 blocs + rappel officiel pour %s', (_n, profile) => {
    const r = instantParentReport(buildAiContext(profile, VIDEOS));
    expect(r.profileSummary.length).toBeGreaterThan(40);
    expect(r.explorationDynamics.length).toBeGreaterThan(20);
    expect(r.careerTracks).toHaveLength(3);
    expect(r.homeAdvice.length).toBeGreaterThanOrEqual(2);
    expect(r.homeAdvice.length).toBeLessThanOrEqual(3);
    expect(r.disclaimer).toBe(PARENT_DISCLAIMER);
  });

  it('propose 3 métiers du store avec leur zone et leurs formations réelles', () => {
    for (const p of SEED_PROFILES) {
      const r = instantParentReport(buildAiContext(p, VIDEOS));
      for (const t of r.careerTracks) {
        const v = VIDEOS.find((x) => x.title === t.jobTitle)!;
        expect(v).toBeDefined();
        expect(t.zoneLabel).toBe(zoneLabel(v.zone));
        expect(t.formations).toBe(v.formations.join(' · '));
      }
    }
  });

  it('varie les horizons d’études quand le store le permet', () => {
    const r = instantParentReport(ctxLucas);
    const zones = new Set(r.careerTracks.map((t) => t.zoneLabel));
    expect(zones.size).toBeGreaterThanOrEqual(2);
  });

  it('signale un profil estimé sans bilan', () => {
    const r = instantParentReport(buildAiContext(makeProfile({ hasBilan: false }), VIDEOS));
    expect(r.profileSummary).toMatch(/estimé/);
  });
});

describe('garde-fous anti-hallucination sur la réponse du LLM', () => {
  it('détecte un chiffre ou un diplôme absent du JSON', () => {
    expect(inventsFacts('Tu gagneras 4500 euros par mois.', ctxLucas)).toBe(true);
    expect(inventsFacts('Passe un doctorat en physique.', ctxLucas)).toBe(true);
    expect(inventsFacts(`Tu as ${ctxLucas.age} ans et tu aimes le terrain.`, ctxLucas)).toBe(false);
  });

  it('garde les scènes valides du LLM et remplace les scènes fautives', () => {
    const raw = {
      headline: 'Lucas, ton futur au soleil',
      scenes: [
        { step: 1, tagLabel: 'Ton terrain', iconName: 'Wrench', subtitle: 'Imagine-toi sur un toit au soleil, à poser des panneaux avec ton équipe.', durationSec: 6 },
        { step: 2, tagLabel: 'Tes forces', iconName: 'Licorne', subtitle: 'Tu aimes le concret et comprendre comment ça marche.', durationSec: 40 },
        { step: 3, tagLabel: 'Tes étoiles', iconName: 'Star', subtitle: 'Avec un Master de 5 ans tu gagneras 3000 euros.', durationSec: 6 },
        { step: 4, tagLabel: 'Découverte', iconName: 'Compass', subtitle: '', durationSec: 6 },
      ],
    };
    const s = sanitizeScenario(raw, ctxLucas)!;
    const fb = instantScenario(ctxLucas);
    expect(s.headline).toBe('Lucas, ton futur au soleil');
    expect(s.scenes[0]!.subtitle).toContain('panneaux');
    expect(s.scenes[1]!.iconName).toBe(fb.scenes[1]!.iconName); // icône hors liste
    expect(s.scenes[1]!.durationSec).toBe(8); // borné
    expect(s.scenes[2]).toEqual(fb.scenes[2]); // diplôme et chiffres inventés
    expect(s.scenes[3]).toEqual(fb.scenes[3]); // vide
  });

  it('rejette une réponse inexploitable', () => {
    expect(sanitizeScenario(null, ctxLucas)).toBeNull();
    expect(sanitizeScenario({ scenes: [] }, ctxLucas)).toBeNull();
    expect(sanitizeScenario({ scenes: [{}, {}, {}, {}] }, ctxLucas)).toBeNull();
    expect(sanitizeParentReport('texte', ctxLucas)).toBeNull();
  });

  it('neutralise le HTML et les caractères de contrôle', () => {
    const raw = { headline: '<img src=x onerror=alert(1)>Salut', scenes: Array.from({ length: 4 }, () => ({ subtitle: 'Tu <b>aimes</b> le terrain et les outils.' })) };
    const s = sanitizeScenario(raw, ctxLucas)!;
    expect(s.headline).not.toMatch(/[<>]/);
    for (const sc of s.scenes) expect(sc.subtitle).not.toMatch(/[<>]/);
  });

  it('bilan parents : écarte les métiers inventés, impose zone, formations et rappel du store', () => {
    const job = ctxLucas.jobs[1]!;
    const raw = {
      profileSummary: 'Lucas aime le concret et le travail en extérieur.',
      explorationDynamics: 'Il a regardé 250 vidéos.',
      careerTracks: [
        { jobTitle: 'Astronaute', zoneLabel: 'Zone 1', whyItFits: 'Il aime les étoiles.', formations: 'Aucune' },
        { jobTitle: job.title.toUpperCase(), zoneLabel: 'Zone 1 · faux', whyItFits: 'Lien avec ses tags terrain.', formations: 'Doctorat inventé' },
      ],
      homeAdvice: ['Visitez un chantier ensemble.', 'Parlez-en sans pression.', 'Visez un MBA à Londres.'],
      disclaimer: 'Ceci est un verdict définitif.',
    };
    const r = sanitizeParentReport(raw, ctxLucas)!;
    const fb = instantParentReport(ctxLucas);
    expect(r.profileSummary).toBe('Lucas aime le concret et le travail en extérieur.');
    expect(r.explorationDynamics).toBe(fb.explorationDynamics); // 250 inventé
    expect(r.careerTracks.map((t) => t.jobTitle)).not.toContain('Astronaute');
    expect(r.careerTracks[0]).toMatchObject({ jobTitle: job.title, zoneLabel: job.zoneLabel, formations: job.formations.join(' · '), whyItFits: 'Lien avec ses tags terrain.' });
    expect(r.careerTracks).toHaveLength(3);
    expect(r.homeAdvice).toEqual(['Visitez un chantier ensemble.', 'Parlez-en sans pression.']);
    expect(r.disclaimer).toBe(PARENT_DISCLAIMER);
  });
});
