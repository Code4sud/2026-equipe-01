import type { ReelVideo, YouthProfile } from '../domain/types';
import { matchPercent, matchedTags } from '../engine/match';
import { STAR_POINTS, WATCH_POINTS } from '../engine/signals';
import { StarIcon } from './ui';

/**
 * « Pourquoi PolarIA te propose ça ? » : % de match, tags déclencheurs avec
 * leurs points, règles de l'algorithme et bouton Étoile. Affiché dans le
 * panneau latéral (desktop) ou en bas de la fiche (mobile).
 */
export function WhyContent({ video, profile, onStar }: { video: ReelVideo; profile: YouthProfile; onStar: () => void }) {
  const percent = matchPercent(video, profile);
  const starred = profile.starredVideoIds.includes(video.id);
  const watched = profile.watchedVideoIds.includes(video.id);
  return (
    <div className="why" data-testid="why-panel">
      <div className="why__match">
        <svg viewBox="0 0 36 36" className="gauge" aria-hidden="true">
          <circle cx="18" cy="18" r="15.9" className="gauge__track" />
          <circle cx="18" cy="18" r="15.9" className="gauge__fill" strokeDasharray={`${percent} 100`} />
        </svg>
        <div>
          <strong className="why__percent mono" data-testid="match-percent">
            {percent} %
          </strong>
          <span className="muted small">de match avec ton profil</span>
        </div>
      </div>
      <ul className="why__tags">
        {matchedTags(video, profile).map(([tag, pts]) => (
          <li key={tag} className={pts > 0 ? 'is-match' : ''}>
            <span className="why__tag">#{tag}</span>
            <strong className="mono" data-testid={`why-pts-${tag}`}>
              {pts} pts
            </strong>
          </li>
        ))}
      </ul>
      <div className="why__algo">
        <p className="eyebrow">Comment l’algo calcule</p>
        <ul>
          <li>Score de la fiche = somme de tes points sur ses tags.</li>
          <li>+{STAR_POINTS} pts sur chaque tag si tu mets une étoile.</li>
          <li>
            +{WATCH_POINTS} pts après 3 s de visionnage{watched ? ' (déjà compté)' : ''}.
          </li>
          <li>Toi (Mon Profil) et ton conseiller pouvez ajuster tes tags.</li>
        </ul>
      </div>
      <button
        type="button"
        className={`btn btn--block ${starred ? 'btn--glass is-starred' : 'btn--primary'}`}
        aria-pressed={starred}
        onClick={onStar}
        data-testid="why-star"
      >
        <StarIcon size={16} /> {starred ? 'Étoilée · retirer l’étoile' : 'Mettre une étoile'}
      </button>
    </div>
  );
}
