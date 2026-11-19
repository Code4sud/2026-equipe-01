import { useSyncExternalStore } from 'react';
import type { ReelVideo, YouthProfile } from '../domain/types';
import {
  PARENT_SCHEMA,
  PARENT_SYSTEM_PROMPT,
  SCENARIO_SCHEMA,
  SCENARIO_SYSTEM_PROMPT,
  buildAiContext,
  instantParentReport,
  instantScenario,
  parentUserPrompt,
  sanitizeParentReport,
  sanitizeScenario,
  scenarioUserPrompt,
  type AiContext,
  type AiResult,
  type ImmersiveReelScenario,
  type ParentReportData,
} from '../engine/ai';

/**
 * Service des 2 mini-IA de PolarIA, 100 % dans le navigateur.
 *
 * - IA locale : WebLLM (modèle open-weight Qwen2.5 1.5B quantifié) chargé à la
 *   demande dans un Web Worker, via WebGPU. Aucun serveur, aucune clé d'API :
 *   seules les données du modèle sont téléchargées (une fois, puis en cache), et
 *   le profil du jeune ne quitte jamais l'appareil.
 * - Mode instantané : générateur déterministe local, même schéma JSON. Il prend
 *   le relais sans bruit si WebGPU manque, si l'appareil est tactile ou en mode
 *   économie de données, si WebLLM échoue, ou si l'utilisateur le choisit.
 */

export const MODEL_ID = 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC';
const GENERATION_TIMEOUT_MS = 60_000;
const MODE_KEY = 'polaria-ai-mode';

export type AiMode = 'auto' | 'instant';
export type AiPhase = 'idle' | 'checking' | 'loading' | 'generating' | 'ready' | 'unsupported' | 'error';

export interface AiStatus {
  mode: AiMode;
  phase: AiPhase;
  /** Progression du chargement du modèle, entre 0 et 1. */
  progress: number;
}

// --------------------------------------------------------------- état observable
function readMode(): AiMode {
  try {
    return window.localStorage.getItem(MODE_KEY) === 'instant' ? 'instant' : 'auto';
  } catch {
    return 'auto';
  }
}

let status: AiStatus = { mode: typeof window === 'undefined' ? 'auto' : readMode(), phase: 'idle', progress: 0 };
const listeners = new Set<() => void>();
const modeListeners = new Set<() => void>();

function setStatus(patch: Partial<AiStatus>) {
  status = { ...status, ...patch };
  listeners.forEach((l) => l());
}

export function getAiStatus(): AiStatus {
  return status;
}

export function useAiStatus(): AiStatus {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => status,
    () => status,
  );
}

/** Bouton « Mode instantané » : bascule immédiatement et interrompt le chargement. */
export function setAiMode(mode: AiMode) {
  try {
    window.localStorage.setItem(MODE_KEY, mode);
  } catch {
    /* stockage indisponible : le choix vaut pour la session */
  }
  if (mode === 'instant') disposeEngine();
  setStatus({ mode, phase: mode === 'instant' ? 'idle' : status.phase });
  modeListeners.forEach((l) => l());
}

// ------------------------------------------------------------------- WebLLM
interface ChatEngine {
  chat: {
    completions: {
      create: (req: Record<string, unknown>) => Promise<{ choices: Array<{ message?: { content?: string | null } }> }>;
    };
  };
  unload?: () => Promise<void>;
}

let enginePromise: Promise<ChatEngine> | null = null;
let worker: Worker | null = null;

function disposeEngine() {
  worker?.terminate();
  worker = null;
  enginePromise = null;
}

/** WebGPU réel (pas l'adaptateur logiciel), sur un appareil à pointeur fin, hors mode économie de données. */
export async function canRunLocalLlm(): Promise<boolean> {
  if (typeof navigator === 'undefined' || typeof window === 'undefined') return false;
  const nav = navigator as unknown as {
    gpu?: { requestAdapter: () => Promise<{ info?: { isFallbackAdapter?: boolean }; isFallbackAdapter?: boolean } | null> };
    connection?: { saveData?: boolean };
  };
  if (!nav.gpu || nav.connection?.saveData) return false;
  if (window.matchMedia?.('(pointer: coarse)').matches) return false;
  try {
    const adapter = await nav.gpu.requestAdapter();
    return !!adapter && !adapter.isFallbackAdapter && !adapter.info?.isFallbackAdapter;
  } catch {
    return false;
  }
}

function loadEngine(): Promise<ChatEngine> {
  if (enginePromise) return enginePromise;
  setStatus({ phase: 'loading', progress: 0 });
  enginePromise = (async () => {
    const { CreateWebWorkerMLCEngine } = await import('@mlc-ai/web-llm');
    worker = new Worker(new URL('./llm.worker.ts', import.meta.url), { type: 'module' });
    const engine = await CreateWebWorkerMLCEngine(worker, MODEL_ID, {
      initProgressCallback: (r: { progress: number }) => setStatus({ progress: Math.max(0, Math.min(1, r.progress)) }),
    });
    return engine as unknown as ChatEngine;
  })();
  enginePromise.catch(() => disposeEngine());
  return enginePromise;
}

/** Résout `null` dès que l'utilisateur passe en mode instantané (sans attendre le LLM). */
function untilInstant(): Promise<null> {
  return new Promise((resolve) => {
    const l = () => {
      if (status.mode === 'instant') {
        modeListeners.delete(l);
        resolve(null);
      }
    };
    modeListeners.add(l);
  });
}

function timeout(ms: number): Promise<null> {
  return new Promise((resolve) => window.setTimeout(() => resolve(null), ms));
}

async function askLlm(system: string, user: string, schema: object): Promise<unknown> {
  const engine = await loadEngine();
  setStatus({ phase: 'generating', progress: 1 });
  const reply = await engine.chat.completions.create({
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    temperature: 0,
    max_tokens: 900,
    response_format: { type: 'json_object', schema: JSON.stringify(schema) },
  });
  return JSON.parse(reply.choices[0]?.message?.content ?? 'null');
}

async function generate<T>(
  ctx: AiContext,
  instant: (c: AiContext) => T,
  llm: () => Promise<unknown>,
  sanitize: (raw: unknown, c: AiContext) => T | null,
): Promise<AiResult<T>> {
  const fallback = (): AiResult<T> => ({ data: instant(ctx), source: 'instant' });
  if (status.mode === 'instant') return fallback();
  setStatus({ phase: 'checking' });
  if (!(await canRunLocalLlm())) {
    setStatus({ phase: 'unsupported' });
    return fallback();
  }
  try {
    const raw = await Promise.race([llm(), untilInstant(), timeout(GENERATION_TIMEOUT_MS)]);
    if (raw === null) {
      setStatus({ phase: getAiStatus().mode === 'instant' ? 'idle' : 'error' });
      return fallback();
    }
    const data = sanitize(raw, ctx);
    setStatus({ phase: 'ready' });
    return data ? { data, source: 'webllm' } : fallback();
  } catch {
    disposeEngine();
    setStatus({ phase: 'error' });
    return fallback();
  }
}

/** Mini-IA n°1 : scénario « Reel d'Immersion » (bouton « Générer mon avenir »). */
export function generateScenario(profile: YouthProfile, videos: readonly ReelVideo[]): Promise<AiResult<ImmersiveReelScenario>> {
  const ctx = buildAiContext(profile, videos);
  return generate(ctx, instantScenario, () => askLlm(SCENARIO_SYSTEM_PROMPT, scenarioUserPrompt(ctx), SCENARIO_SCHEMA), sanitizeScenario);
}

/** Mini-IA n°2 : « Bilan d'Accompagnement » pour les parents (onglet Mon Bilan). */
export function generateParentReport(profile: YouthProfile, videos: readonly ReelVideo[]): Promise<AiResult<ParentReportData>> {
  const ctx = buildAiContext(profile, videos);
  return generate(ctx, instantParentReport, () => askLlm(PARENT_SYSTEM_PROMPT, parentUserPrompt(ctx), PARENT_SCHEMA), sanitizeParentReport);
}
