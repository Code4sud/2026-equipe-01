import { useCallback, useEffect, useState } from 'react';
import {
  Briefcase,
  ChefHat,
  Compass,
  Cpu,
  Dumbbell,
  Headphones,
  HeartPulse,
  Leaf,
  Palette,
  Rocket,
  Sparkles,
  Star,
  Users,
  Volume2,
  VolumeX,
  Wrench,
  X,
  type LucideIcon,
} from 'lucide-react';
import { motion } from 'framer-motion';
import type { YouthProfile } from '../domain/types';
import { VIDEOS } from '../data/videos';
import type { AiResult, ImmersiveReelScenario, StoryIconName } from '../engine/ai';
import { canSpeak, speak, stopSpeaking } from '../lib/speech';
import { generateScenario } from '../services/aiService';
import { AiProgress, AiSourceBadge } from './AiStatus';

const ICONS: Record<StoryIconName, LucideIcon> = {
  Sparkles,
  Compass,
  Star,
  Dumbbell,
  Headphones,
  Rocket,
  Leaf,
  Wrench,
  Palette,
  HeartPulse,
  Users,
  Briefcase,
  Cpu,
  ChefHat,
};

/**
 * Lecteur « Reel d'Immersion » plein écran DANS le téléphone : barres de
 * progression façon Stories, zones tactiles gauche/droite, sous-titres en gros
 * et lecture vocale fr-FR activable en un clic.
 */
export function ReelStory({ profile, onClose }: { profile: YouthProfile; onClose: () => void }) {
  const [result, setResult] = useState<AiResult<ImmersiveReelScenario> | null>(null);
  const [index, setIndex] = useState(0);
  const [voice, setVoice] = useState(false);
  /** Index de la dernière scène lue en entier par la voix. */
  const [spokenIndex, setSpokenIndex] = useState(-1);

  useEffect(() => {
    let alive = true;
    void generateScenario(profile, VIDEOS).then((r) => alive && setResult(r));
    return () => {
      alive = false;
    };
    // Le scénario est généré une fois à l'ouverture : on ne relance pas à chaque étoile.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const scenes = result?.data.scenes ?? [];
  const scene = scenes[index];
  const last = index >= scenes.length - 1;
  const next = useCallback(() => setIndex((i) => Math.min(i + 1, Math.max(0, scenes.length - 1))), [scenes.length]);
  const prev = () => setIndex((i) => Math.max(0, i - 1));

  // Lecture vocale de la scène courante ; on attend la fin de la phrase avant d'avancer.
  useEffect(() => {
    if (!scene || !voice) return;
    speak(scene.subtitle, () => setSpokenIndex(index));
    return () => stopSpeaking();
  }, [scene, voice, index]);

  useEffect(() => {
    if (!scene || last || (voice && spokenIndex !== index)) return;
    const t = window.setTimeout(next, scene.durationSec * 1000);
    return () => window.clearTimeout(t);
  }, [scene, last, voice, spokenIndex, index, next]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') next();
      if (e.key === 'ArrowLeft') prev();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, next]);

  useEffect(() => () => stopSpeaking(), []);

  const Icon = scene ? ICONS[scene.iconName] : Sparkles;

  return (
    <div className="reel-story" role="dialog" aria-modal="true" aria-label="Mon avenir en 4 scènes" data-testid="debrief">
      <div className="reel-story__bars" aria-hidden="true">
        {(scenes.length ? scenes : [0, 1, 2, 3]).map((_, i) => (
          <span key={i} className={i < index ? 'is-done' : i === index && scene ? 'is-current' : ''}>
            <i key={`${index}-${i}`} style={scene && i === index ? { animationDuration: `${scene.durationSec}s` } : undefined} />
          </span>
        ))}
      </div>

      <div className="reel-story__top">
        <span className="reel-story__brand">
          <strong>{result?.data.headline ?? 'Générer mon avenir'}</strong>
          {result && <AiSourceBadge source={result.source} />}
        </span>
        <div className="reel-story__controls">
          {canSpeak() && (
            <button
              type="button"
              className="reel-story__btn"
              onClick={() => setVoice((v) => !v)}
              aria-pressed={voice}
              aria-label={voice ? 'Couper la voix' : 'Lire à voix haute'}
              data-testid="story-voice"
            >
              {voice ? <Volume2 size={18} aria-hidden="true" /> : <VolumeX size={18} aria-hidden="true" />}
            </button>
          )}
          <button type="button" className="reel-story__btn" onClick={onClose} aria-label="Fermer la story" data-testid="close-debrief">
            <X size={18} aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="reel-story__stage">
        {scene ? (
          <>
            <motion.span
              key={`icon-${index}`}
              className="reel-story__icon"
              initial={{ scale: 0.6, opacity: 0, rotate: -8 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 220, damping: 16 }}
            >
              <Icon size={52} strokeWidth={1.6} aria-hidden="true" />
            </motion.span>
            <p className="reel-story__tag">
              {scene.step}/{scenes.length} · {scene.tagLabel}
            </p>
            <motion.p
              key={`sub-${index}`}
              className="reel-story__subtitle"
              initial={{ y: 18, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.4 }}
              data-testid="story-subtitle"
              aria-live="polite"
            >
              {scene.subtitle}
            </motion.p>
            <button type="button" className="reel-story__tap reel-story__tap--prev" onClick={prev} aria-label="Scène précédente" data-testid="story-prev" />
            <button type="button" className="reel-story__tap reel-story__tap--next" onClick={next} aria-label="Scène suivante" data-testid="story-next" />
          </>
        ) : (
          <AiProgress />
        )}
      </div>

      <div className="reel-story__foot">
        <span>Basé uniquement sur ton profil, tes étoiles et les fiches PolarIA. Rien n’est inventé.</span>
      </div>
    </div>
  );
}
