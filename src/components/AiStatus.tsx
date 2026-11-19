import { Cpu, Zap } from 'lucide-react';
import type { AiSource } from '../engine/ai';
import { setAiMode, useAiStatus } from '../services/aiService';

/**
 * Indicateur non bloquant du chargement de l'IA locale, avec le bouton
 * « Mode instantané » qui bascule tout de suite sur le générateur local.
 */
export function AiProgress({ light = false }: { light?: boolean }) {
  const { phase, progress } = useAiStatus();
  const busy = phase === 'checking' || phase === 'loading' || phase === 'generating';
  if (!busy) return null;
  const label =
    phase === 'checking'
      ? 'Vérification de WebGPU…'
      : phase === 'loading'
        ? `Chargement de l’IA locale (une seule fois, puis en cache) : ${Math.round(progress * 100)} %`
        : 'L’IA locale écrit à partir de tes données…';
  return (
    <div className={`ai-status${light ? ' ai-status--light' : ''}`} role="status" data-testid="ai-progress">
      <div className="ai-status__row">
        <span>{label}</span>
        <button type="button" className={`btn btn--sm ${light ? 'btn--ghost' : 'btn--on-dark'}`} onClick={() => setAiMode('instant')} data-testid="ai-instant">
          <Zap size={14} aria-hidden="true" /> Mode instantané
        </button>
      </div>
      {phase === 'loading' && (
        <div className="ai-status__bar" aria-hidden="true">
          <span style={{ width: `${Math.round(progress * 100)}%` }} />
        </div>
      )}
    </div>
  );
}

/** Badge « qui a écrit ce texte » : l'IA locale WebLLM ou la synthèse instantanée. */
export function AiSourceBadge({ source }: { source: AiSource }) {
  const { mode } = useAiStatus();
  return (
    <span className="ai-source">
      <span className={`ai-badge${source === 'webllm' ? ' ai-badge--llm' : ''}`} data-testid="ai-source" data-source={source}>
        {source === 'webllm' ? <Cpu size={13} aria-hidden="true" /> : <Zap size={13} aria-hidden="true" />}
        {source === 'webllm' ? 'Généré par l’IA locale (WebLLM)' : 'Synthèse instantanée'}
      </span>
      {mode === 'instant' && (
        <button type="button" className="link-btn" onClick={() => setAiMode('auto')} data-testid="ai-auto">
          Réactiver l’IA locale
        </button>
      )}
    </span>
  );
}
