import type { JobZone } from '../domain/types';
import { isKnownTag, type TagName } from './tags';
import raw from './onet.json';

/**
 * Référentiel O*NET FR (Job Zones) du Centre des Possibles, généré par
 * `npm run import:onet` à partir de data/table-metiers-onet-fr-jobzones.xlsx.
 */
export interface OnetJob {
  /** Code O*NET-SOC, ex. « 27-4014.00 ». */
  code: string;
  title: string;
  zone: JobZone;
  /** 2 ou 3 tags PolarIA attribués à l'import (famille SOC + mots-clés). */
  tags: TagName[];
}

const isZone = (z: unknown): z is JobZone => z === 1 || z === 2 || z === 3 || z === 4 || z === 5;

export const ONET_JOBS: readonly OnetJob[] = (raw as unknown[]).flatMap((r) => {
  const j = r as Partial<OnetJob>;
  if (typeof j.code !== 'string' || typeof j.title !== 'string' || !isZone(j.zone) || !Array.isArray(j.tags)) return [];
  return [{ code: j.code, title: j.title, zone: j.zone, tags: j.tags.filter(isKnownTag) }];
});

const BY_CODE = new Map(ONET_JOBS.map((j) => [j.code, j]));

export function getOnetJob(code: string | undefined): OnetJob | undefined {
  return code ? BY_CODE.get(code) : undefined;
}

export type ZoneFilter = 'all' | 'short' | 'higher';

/** Filtre discret par durée d'études (zones O*NET 1-2 vs 3-5). */
export const ZONE_FILTERS: ReadonlyArray<{ id: ZoneFilter; label: string }> = [
  { id: 'all', label: 'Toutes les zones' },
  { id: 'short', label: 'Court (0 à 2 ans)' },
  { id: 'higher', label: 'Supérieur (1 à 10 ans)' },
];

export function matchesZoneFilter(zone: JobZone, filter: ZoneFilter): boolean {
  if (filter === 'short') return zone <= 2;
  if (filter === 'higher') return zone >= 3;
  return true;
}

/** Métiers du référentiel triés par affinité avec les scores de tags d'un profil. */
export function rankOnetJobs(tagScores: Record<string, number>, filter: ZoneFilter = 'all'): Array<OnetJob & { score: number }> {
  return ONET_JOBS.filter((j) => matchesZoneFilter(j.zone, filter))
    .map((j) => ({ ...j, score: j.tags.reduce((s, t) => s + (tagScores[t] ?? 0), 0) }))
    .sort((a, b) => b.score - a.score || a.zone - b.zone || a.title.localeCompare(b.title, 'fr'));
}
