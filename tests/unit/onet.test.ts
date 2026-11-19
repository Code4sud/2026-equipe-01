import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ONET_JOBS, ZONE_FILTERS, getOnetJob, matchesZoneFilter, rankOnetJobs } from '../../src/data/onet';
import { VIDEOS } from '../../src/data/videos';
import { isKnownTag } from '../../src/data/tags';

const ROOT = join(__dirname, '..', '..');

describe('référentiel O*NET FR (Job Zones)', () => {
  it('contient les 721 métiers du classeur, avec un code, une zone 1 à 5 et 2 à 3 tags connus', () => {
    expect(ONET_JOBS).toHaveLength(721);
    const codes = new Set<string>();
    for (const j of ONET_JOBS) {
      expect(j.code).toMatch(/^\d{2}-\d{4}\.\d{2}$/);
      expect(codes.has(j.code), j.code).toBe(false);
      codes.add(j.code);
      expect([1, 2, 3, 4, 5]).toContain(j.zone);
      expect(j.tags.length, j.title).toBeGreaterThanOrEqual(1);
      expect(j.tags.length).toBeLessThanOrEqual(3);
      for (const t of j.tags) expect(isKnownTag(t)).toBe(true);
    }
  });

  it('couvre les 5 zones de qualification', () => {
    for (const z of [1, 2, 3, 4, 5]) expect(ONET_JOBS.some((j) => j.zone === z), `zone ${z}`).toBe(true);
  });

  it('src/data/onet.json est à jour avec le classeur du dépôt (npm run import:onet)', () => {
    const out = join(mkdtempSync(join(tmpdir(), 'onet-')), 'onet.json');
    execFileSync(process.execPath, [join(ROOT, 'scripts/import-onet.mjs'), join(ROOT, 'data/table-metiers-onet-fr-jobzones.xlsx'), out], {
      stdio: 'ignore',
    });
    expect(readFileSync(out, 'utf8').replace(/\r\n/g, '\n')).toBe(readFileSync(join(ROOT, 'src/data/onet.json'), 'utf8').replace(/\r\n/g, '\n'));
  });

  it('filtre par durée d’études : court (zones 1-2) et supérieur (zones 3-5)', () => {
    expect(ZONE_FILTERS.map((f) => f.id)).toEqual(['all', 'short', 'higher']);
    expect(matchesZoneFilter(2, 'short')).toBe(true);
    expect(matchesZoneFilter(3, 'short')).toBe(false);
    expect(matchesZoneFilter(3, 'higher')).toBe(true);
    expect(matchesZoneFilter(1, 'all')).toBe(true);
    for (const j of rankOnetJobs({}, 'short')) expect(j.zone).toBeLessThanOrEqual(2);
  });

  it('classe les métiers par affinité avec les tags du jeune', () => {
    const ranked = rankOnetJobs({ 'Son & Média': 40 });
    expect(ranked[0]!.tags).toContain('Son & Média');
    expect(ranked[0]!.score).toBeGreaterThanOrEqual(40);
  });
});

describe('fiches du feed reliées au référentiel', () => {
  const jobs = VIDEOS.filter((v) => v.category === 'Métier');

  it('au moins 30 métiers actifs dans le feed, sur les 5 zones', () => {
    expect(jobs.length).toBeGreaterThanOrEqual(30);
    for (const z of [1, 2, 3, 4, 5]) expect(jobs.some((v) => v.zone === z), `zone ${z}`).toBe(true);
  });

  it.each(jobs.map((v) => [v.id, v]))('%s porte un code O*NET réel et la zone du référentiel', (_id, v) => {
    const job = getOnetJob(v.onetCode);
    expect(job, v.onetCode).toBeDefined();
    expect(v.zone).toBe(job!.zone);
  });
});
