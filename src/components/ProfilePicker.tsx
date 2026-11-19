import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { SEED_PROFILES } from '../data/profiles';
import { RIASEC_KEYS } from '../domain/types';
import { useStore } from '../store/useStore';
import { StarIcon } from './ui';

const AVATAR: Record<string, string> = { lucas: '🎧', emma: '🎉', yanis: '🌲' };

export function ProfilePicker({ onClose }: { onClose?: () => void }) {
  const loginYouth = useStore((s) => s.loginYouth);
  const navigate = useNavigate();
  const firstButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    firstButton.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-labelledby="picker-title" data-testid="profile-picker">
      <div className="modal__backdrop" onClick={onClose} />
      <div className="modal__card glass">
        <h2 id="picker-title" className="display">
          <StarIcon size={20} className="accent-star" /> Qui es-tu ?
        </h2>
        <p className="muted">Profils de démonstration 100 % fictifs.</p>
        <div className="picker">
          {SEED_PROFILES.map((p, i) => {
            const dominant = [...RIASEC_KEYS].sort((a, b) => p.riasec[b] - p.riasec[a])[0];
            return (
              <button
                key={p.id}
                ref={i === 0 ? firstButton : undefined}
                type="button"
                className="picker__item"
                data-testid={`pick-${p.id}`}
                onClick={() => {
                  loginYouth(p.id);
                  navigate('/app');
                }}
              >
                <span className="picker__avatar" aria-hidden="true">
                  {AVATAR[p.id] ?? '✦'}
                </span>
                <span>
                  <strong>
                    {p.name}, {p.age} ans
                  </strong>
                  <small>Profil dominant : {dominant}</small>
                </span>
              </button>
            );
          })}
        </div>
        {onClose && (
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Annuler
          </button>
        )}
      </div>
    </div>
  );
}
