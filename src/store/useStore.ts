import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';
import type { YouthProfile } from '../domain/types';
import { DEFAULT_PROFILE_ID, SEED_PROFILES } from '../data/profiles';
import { getVideoById } from '../data/videos';
import { sanitizeProfiles } from '../domain/validation';
import { addTag, adjustTag, recordWatch, removeTag, toggleStar } from '../engine/signals';

export const STORAGE_KEY = 'polaria-demo-v1';

export type Session = 'jeune' | 'pro' | null;

interface PersistedState {
  profiles: Record<string, YouthProfile>;
  currentYouthId: string;
  session: Session;
}

export interface PolariaState extends PersistedState {
  loginYouth: (id: string) => void;
  loginPro: () => void;
  logout: () => void;
  star: (videoId: string) => void;
  watch: (videoId: string) => void;
  proAddTag: (youthId: string, tag: string) => void;
  proAdjustTag: (youthId: string, tag: string, delta: number) => void;
  proRemoveTag: (youthId: string, tag: string) => void;
  resetDemo: () => void;
}

function initialState(): PersistedState {
  return {
    profiles: Object.fromEntries(SEED_PROFILES.map((p) => [p.id, structuredClone(p)])),
    currentYouthId: DEFAULT_PROFILE_ID,
    session: null,
  };
}

const isKnownYouth = (id: unknown): id is string =>
  typeof id === 'string' && SEED_PROFILES.some((p) => p.id === id);

/** localStorage peut être indisponible (navigation privée, iframe) : on dégrade sans planter. */
const safeStorage: StateStorage = {
  getItem: (name) => {
    try {
      return localStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem: (name, value) => {
    try {
      localStorage.setItem(name, value);
    } catch {
      /* quota ou stockage bloqué : la démo continue en mémoire */
    }
  },
  removeItem: (name) => {
    try {
      localStorage.removeItem(name);
    } catch {
      /* ignoré */
    }
  },
};

export const useStore = create<PolariaState>()(
  persist(
    (set, get) => {
      const updateYouth = (id: string, fn: (p: YouthProfile) => YouthProfile) => {
        const current = get().profiles[id];
        if (!current) return;
        try {
          const next = fn(current);
          if (next !== current) set({ profiles: { ...get().profiles, [id]: next } });
        } catch {
          /* action refusée par le moteur (tag hors catalogue, valeur invalide) */
        }
      };

      return {
        ...initialState(),
        loginYouth: (id) => {
          if (isKnownYouth(id)) set({ session: 'jeune', currentYouthId: id });
        },
        loginPro: () => set({ session: 'pro' }),
        logout: () => set({ session: null }),
        star: (videoId) => {
          const video = getVideoById(videoId);
          if (video) updateYouth(get().currentYouthId, (p) => toggleStar(p, video));
        },
        watch: (videoId) => {
          const video = getVideoById(videoId);
          if (video) updateYouth(get().currentYouthId, (p) => recordWatch(p, video));
        },
        proAddTag: (youthId, tag) => updateYouth(youthId, (p) => addTag(p, tag)),
        proAdjustTag: (youthId, tag, delta) => updateYouth(youthId, (p) => adjustTag(p, tag, delta)),
        proRemoveTag: (youthId, tag) => updateYouth(youthId, (p) => removeTag(p, tag)),
        resetDemo: () => set(initialState()),
      };
    },
    {
      name: STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => safeStorage),
      partialize: (s): PersistedState => ({
        profiles: s.profiles,
        currentYouthId: s.currentYouthId,
        session: s.session,
      }),
      // Tout ce qui vient du stockage est revalidé (cf. src/domain/validation.ts).
      merge: (persisted, current) => {
        const raw = (typeof persisted === 'object' && persisted !== null ? persisted : {}) as Partial<
          Record<keyof PersistedState, unknown>
        >;
        return {
          ...current,
          profiles: sanitizeProfiles(raw.profiles),
          currentYouthId: isKnownYouth(raw.currentYouthId) ? raw.currentYouthId : DEFAULT_PROFILE_ID,
          session: raw.session === 'jeune' || raw.session === 'pro' ? raw.session : null,
        };
      },
    },
  ),
);

/**
 * Applique les profils écrits par un autre onglet. Seuls les profils (tags,
 * étoiles) sont partagés : la session et le jeune affiché restent propres à
 * chaque onglet, pour pouvoir garder /app et /pro ouverts côte à côte.
 */
export function syncProfilesFromStorage(raw: string | null): void {
  if (raw === null) return;
  try {
    const parsed: unknown = JSON.parse(raw);
    const state = typeof parsed === 'object' && parsed !== null ? (parsed as { state?: { profiles?: unknown } }).state : undefined;
    const incoming = sanitizeProfiles(state?.profiles);
    // Sans ce test, chaque onglet réécrit l'état reçu et relance l'autre : boucle infinie.
    if (JSON.stringify(incoming) === JSON.stringify(useStore.getState().profiles)) return;
    useStore.setState({ profiles: incoming });
  } catch {
    /* valeur corrompue : on garde l'état courant */
  }
}

/** Synchronisation entre onglets : /app et /pro ouverts côte à côte pendant la démo. */
export function enableCrossTabSync(): () => void {
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) syncProfilesFromStorage(e.newValue);
  };
  window.addEventListener('storage', onStorage);
  return () => window.removeEventListener('storage', onStorage);
}

export function useCurrentYouth(): YouthProfile {
  return useStore((s) => s.profiles[s.currentYouthId] ?? s.profiles[DEFAULT_PROFILE_ID]!);
}
