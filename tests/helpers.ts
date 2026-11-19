import type { ReelVideo, YouthProfile } from '../src/domain/types';
import { SEED_PROFILES } from '../src/data/profiles';

export function makeProfile(overrides: Partial<YouthProfile> = {}): YouthProfile {
  const base = structuredClone(SEED_PROFILES[0]!);
  return { ...base, ...overrides };
}

export function makeVideo(id: string, tags: string[], overrides: Partial<ReelVideo> = {}): ReelVideo {
  return {
    id,
    title: `Métier ${id}`,
    category: 'Métier',
    zone: 3,
    zoneLabel: 'Accessible en 1 à 4 ans',
    tags,
    gradient: 'linear-gradient(#000,#fff)',
    icon: '*',
    hook: 'hook',
    dailyTasks: ['a', 'b', 'c'],
    qualities: ['q'],
    formations: ['f'],
    evolutions: 'e',
    ...overrides,
  };
}
