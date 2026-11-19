import { ArrowLeft, ChevronDown } from 'lucide-react';
import type { ReelVideo, YouthProfile } from '../domain/types';
import { StarIcon, TagBadge } from './ui';
import { VideoIcon } from './icons';
import { WhyContent } from './WhyPanel';

interface Props {
  video: ReelVideo;
  profile: YouthProfile;
  /** Sur mobile, le résumé de l'algo s'affiche en bas de la fiche (repliable). */
  showWhy: boolean;
  onBack: () => void;
  onStar: () => void;
}

/** Fiche métier / formation / école, affichée DANS le téléphone (glisse depuis la droite). */
export function DetailsScreen({ video, profile, showWhy, onBack, onStar }: Props) {
  const starred = profile.starredVideoIds.includes(video.id);
  return (
    <div className="screen" data-testid="details">
      <header className="screen__top">
        <button type="button" className="btn btn--ghost btn--sm" onClick={onBack} data-testid="back-to-feed">
          <ArrowLeft size={16} aria-hidden="true" /> Retour au feed
        </button>
        <button
          type="button"
          className={`icon-btn${starred ? ' is-on' : ''}`}
          aria-pressed={starred}
          aria-label={starred ? 'Retirer l’étoile' : 'Mettre une étoile'}
          data-testid="details-star"
          onClick={onStar}
        >
          <StarIcon size={20} />
        </button>
      </header>

      <div className="screen__body">
        <div className="details__hero" style={{ background: video.gradient }}>
          <VideoIcon name={video.icon} size={40} strokeWidth={1.6} />
          <p className="details__category mono">{video.category}</p>
          <h1 className="display">{video.title}</h1>
          <p className="details__zone">
            Zone {video.zone} · {video.zoneLabel}
          </p>
          <div className="reel__tags">
            {video.tags.map((t) => (
              <TagBadge key={t} tag={t} tone="dark" />
            ))}
          </div>
        </div>

        <section className="card">
          <h2 className="card__title">C’est quoi au quotidien ?</h2>
          <ul className="bullets">
            {video.dailyTasks.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </section>
        <section className="card">
          <h2 className="card__title">Qualités clés</h2>
          <ul className="chips">
            {video.qualities.map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ul>
        </section>
        <section className="card">
          <h2 className="card__title">Formations &amp; écoles possibles</h2>
          <ul className="bullets">
            {video.formations.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </section>
        <section className="card">
          <h2 className="card__title">Évolutions possibles</h2>
          <p>{video.evolutions}</p>
        </section>

        {showWhy && (
          <details className="card why-mobile" open>
            <summary className="card__title">
              Pourquoi PolarIA te propose ça ? <ChevronDown size={16} aria-hidden="true" />
            </summary>
            <WhyContent video={video} profile={profile} onStar={onStar} />
          </details>
        )}
      </div>
    </div>
  );
}
