import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';
import type { Account, DocumentMeta, Role, Session, YouthProfile } from '../domain/types';
import { DEFAULT_PROFILE_ID, SEED_PROFILES } from '../data/profiles';
import { SEED_ACCOUNTS } from '../data/accounts';
import { getVideoById } from '../data/videos';
import { sanitizeProfiles } from '../domain/validation';
import {
  YOUTH_NEW_TAG_POINTS,
  YOUTH_STEP,
  addTag,
  adjustTag,
  recordWatch,
  removeTag,
  toggleStar,
} from '../engine/signals';
import {
  authenticate,
  createYouthAccount,
  validateRegistration,
  type RegistrationErrors,
  type RegistrationInput,
} from '../engine/auth';
import { makeDocument, validatePdf, type FileLike } from '../engine/documents';

export const STORAGE_KEY = 'polaria-demo-v2';

const SEED_IDS = new Set(SEED_PROFILES.map((p) => p.id));
const isSeedYouth = (id: unknown): id is string => typeof id === 'string' && SEED_IDS.has(id);

interface PersistedState {
  profiles: Record<string, YouthProfile>;
  currentYouthId: string;
  session: Session | null;
}

export type LoginResult = { ok: true; role: Role } | { ok: false; error: string };
export type RegisterResult = { ok: true } | { ok: false; errors: RegistrationErrors };

export interface PolariaState extends PersistedState {
  /** Comptes de démo + comptes créés pendant la session (en mémoire seulement). */
  accounts: Account[];
  login: (email: string, password: string) => LoginResult;
  register: (input: RegistrationInput) => RegisterResult;
  logout: () => void;
  /** Le pro ouvre le feed d'un jeune pour le prévisualiser. */
  previewYouth: (id: string) => void;
  star: (videoId: string) => void;
  watch: (videoId: string) => void;
  /** Mon Profil : « Voir plus » (+3) ou « Voir moins » (-3) sur un tag du jeune affiché. */
  youthTune: (tag: string, direction: 1 | -1) => void;
  /** Mon Profil : explorer un nouveau domaine (+6). */
  youthExplore: (tag: string) => void;
  proAddTag: (youthId: string, tag: string) => void;
  proAdjustTag: (youthId: string, tag: string, delta: number) => void;
  proRemoveTag: (youthId: string, tag: string) => void;
  proAddDocument: (youthId: string, file: FileLike) => string | null;
  proRemoveDocument: (youthId: string, documentId: string) => void;
  resetDemo: () => void;
}

function initialState(): PersistedState & { accounts: Account[] } {
  return {
    profiles: Object.fromEntries(SEED_PROFILES.map((p) => [p.id, structuredClone(p)])),
    currentYouthId: DEFAULT_PROFILE_ID,
    session: null,
    accounts: structuredClone(SEED_ACCOUNTS),
  };
}

function sanitizeSession(raw: unknown): Session | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const { accountId, role } = raw as Record<string, unknown>;
  const account = SEED_ACCOUNTS.find((a) => a.id === accountId);
  return account && account.role === role ? { accountId: account.id, role: account.role } : null;
}

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

let idCounter = 0;
const newId = (prefix: string) =>
  `${prefix}-${typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID().slice(0, 8) : `${Date.now()}`}-${++idCounter}`;

export const useStore = create<PolariaState>()(
  persist(
    (set, get) => {
      const isPro = () => get().session?.role === 'pro';

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
      const proUpdate = (id: string, fn: (p: YouthProfile) => YouthProfile) => {
        if (isPro()) updateYouth(id, fn);
      };

      return {
        ...initialState(),
        login: (email, password) => {
          const account = authenticate(get().accounts, email, password);
          if (!account) return { ok: false, error: 'Identifiant ou mot de passe incorrect.' };
          set({
            session: { accountId: account.id, role: account.role },
            ...(account.role === 'jeune' ? { currentYouthId: account.id } : {}),
          });
          return { ok: true, role: account.role };
        },
        register: (input) => {
          const result = validateRegistration(input, get().accounts.map((a) => a.email));
          if (!result.ok) return result;
          const { account, profile } = createYouthAccount(result.value, newId('u'));
          set({
            accounts: [...get().accounts, account],
            profiles: { ...get().profiles, [profile.id]: profile },
            session: { accountId: account.id, role: 'jeune' },
            currentYouthId: profile.id,
          });
          return { ok: true };
        },
        logout: () => set({ session: null }),
        previewYouth: (id) => {
          if (isPro() && get().profiles[id]) set({ currentYouthId: id });
        },
        star: (videoId) => {
          const video = getVideoById(videoId);
          if (video && get().session) updateYouth(get().currentYouthId, (p) => toggleStar(p, video));
        },
        watch: (videoId) => {
          const video = getVideoById(videoId);
          if (video && get().session) updateYouth(get().currentYouthId, (p) => recordWatch(p, video));
        },
        youthTune: (tag, direction) => {
          if (get().session) updateYouth(get().currentYouthId, (p) => adjustTag(p, tag, direction * YOUTH_STEP));
        },
        youthExplore: (tag) => {
          if (get().session) updateYouth(get().currentYouthId, (p) => addTag(p, tag, YOUTH_NEW_TAG_POINTS));
        },
        proAddTag: (youthId, tag) => proUpdate(youthId, (p) => addTag(p, tag)),
        proAdjustTag: (youthId, tag, delta) => proUpdate(youthId, (p) => adjustTag(p, tag, delta)),
        proRemoveTag: (youthId, tag) => proUpdate(youthId, (p) => removeTag(p, tag)),
        proAddDocument: (youthId, file) => {
          if (!isPro()) return 'Action réservée aux professionnels.';
          const error = validatePdf(file);
          if (error) return error;
          const doc: DocumentMeta = makeDocument(file, new Date(), newId('doc'));
          updateYouth(youthId, (p) => ({ ...p, documents: [...p.documents, doc] }));
          return null;
        },
        proRemoveDocument: (youthId, documentId) =>
          proUpdate(youthId, (p) => ({ ...p, documents: p.documents.filter((d) => d.id !== documentId) })),
        resetDemo: () => set({ ...initialState(), session: get().session && sanitizeSession(get().session) }),
      };
    },
    {
      name: STORAGE_KEY,
      version: 2,
      storage: createJSONStorage(() => safeStorage),
      // Les comptes créés pendant la session ne sont JAMAIS persistés (consigne : mémoire uniquement).
      partialize: (s): PersistedState => ({
        profiles: Object.fromEntries(Object.entries(s.profiles).filter(([id]) => isSeedYouth(id))),
        currentYouthId: isSeedYouth(s.currentYouthId) ? s.currentYouthId : DEFAULT_PROFILE_ID,
        session: sanitizeSession(s.session),
      }),
      // Tout ce qui vient du stockage est revalidé (cf. src/domain/validation.ts).
      merge: (persisted, current) => {
        const raw = (typeof persisted === 'object' && persisted !== null ? persisted : {}) as Partial<
          Record<keyof PersistedState, unknown>
        >;
        return {
          ...current,
          profiles: sanitizeProfiles(raw.profiles),
          currentYouthId: isSeedYouth(raw.currentYouthId) ? raw.currentYouthId : DEFAULT_PROFILE_ID,
          session: sanitizeSession(raw.session),
        };
      },
    },
  ),
);

/**
 * Applique les profils écrits par un autre onglet. Seuls les profils de démo
 * (tags, étoiles, documents) sont partagés : la session, le jeune affiché et
 * les comptes créés en mémoire restent propres à chaque onglet.
 */
export function syncProfilesFromStorage(raw: string | null): void {
  if (raw === null) return;
  try {
    const parsed: unknown = JSON.parse(raw);
    const state =
      typeof parsed === 'object' && parsed !== null ? (parsed as { state?: { profiles?: unknown } }).state : undefined;
    const current = useStore.getState().profiles;
    const incoming = sanitizeProfiles(state?.profiles);
    const seedsNow = Object.fromEntries(Object.entries(current).filter(([id]) => isSeedYouth(id)));
    // Sans ce test, chaque onglet réécrit l'état reçu et relance l'autre : boucle infinie.
    if (JSON.stringify(incoming) === JSON.stringify(seedsNow)) return;
    useStore.setState({ profiles: { ...current, ...incoming } });
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

export function useCurrentAccount(): Account | undefined {
  return useStore((s) => s.accounts.find((a) => a.id === s.session?.accountId));
}
