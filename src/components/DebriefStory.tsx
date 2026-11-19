import { useEffect, useMemo, useState } from 'react';
import type { YouthProfile } from '../domain/types';
import { VIDEOS } from '../data/videos';
import { generateDebrief } from '../engine/generate';
import { canSpeak, speak, stopSpeaking } from '../lib/speech';
import { StarIcon } from './ui';

const LINE_MS = 2600;

export function DebriefStory({ profile, onClose }: { profile: YouthProfile; onClose: () => void }) {
  const debrief = useMemo(() => generateDebrief(profile, VIDEOS), [profile]);
  const [index, setIndex] = useState(0);
  const [voice, setVoice] = useState(canSpeak());
  const done = index >= debrief.lines.length - 1;

  useEffect(() => {
    if (done) return;
    const t = window.setTimeout(() => setIndex((i) => i + 1), LINE_MS);
    return () => window.clearTimeout(t);
  }, [index, done]);

  useEffect(() => {
    if (voice) speak(debrief.text);
    else stopSpeaking();
    return () => stopSpeaking();
  }, [voice, debrief.text]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="story" role="dialog" aria-modal="true" aria-label="Mon débrief" data-testid="debrief">
      <div className="story__progress" aria-hidden="true">
        {debrief.lines.map((_, i) => (
          <span key={i} className={i < index ? 'is-done' : i === index ? 'is-current' : ''} />
        ))}
      </div>
      <div className="story__top">
        <span className="story__brand">
          <StarIcon size={16} /> Mon débrief
        </span>
        <div className="story__controls">
          {canSpeak() && (
            <button type="button" className="story__btn" onClick={() => setVoice((v) => !v)} aria-pressed={voice}>
              {voice ? '🔊' : '🔇'}
            </button>
          )}
          <button type="button" className="story__btn" onClick={onClose} aria-label="Fermer le débrief" data-testid="close-debrief">
            ✕
          </button>
        </div>
      </div>
      <button
        type="button"
        className="story__body"
        onClick={() => setIndex((i) => Math.min(i + 1, debrief.lines.length - 1))}
        aria-label="Phrase suivante"
      >
        <span className="story__line" key={index} data-testid="debrief-line">
          {debrief.lines[index]}
        </span>
      </button>
      <p className="story__footer">Basé uniquement sur ton bilan et tes étoiles. Rien n’est inventé.</p>
      <p className="sr-only" data-testid="debrief-text">
        {debrief.text}
      </p>
    </div>
  );
}
