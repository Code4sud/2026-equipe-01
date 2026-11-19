import { Link, Navigate, useParams } from 'react-router-dom';
import { getVideoById } from '../data/videos';
import { useCurrentYouth, useStore } from '../store/useStore';
import { StarIcon, TagBadge, Toast, useToast } from '../components/ui';
import { STAR_POINTS } from '../engine/signals';

export function Details() {
  const { videoId = '' } = useParams();
  const video = getVideoById(videoId);
  const profile = useCurrentYouth();
  const star = useStore((s) => s.star);
  const { toast, show } = useToast();

  if (!video) return <Navigate to="/app" replace />;

  const starred = profile.starredVideoIds.includes(video.id);
  const matching = video.tags.filter((t) => (profile.tagScores[t] ?? 0) > 0);

  return (
    <div className="app-shell app-shell--single">
      <div className="phone phone--light" data-testid="details">
        <header className="details__top">
          <Link to="/app" className="btn btn--ghost btn--sm" data-testid="back-to-feed">
            ← Retour au feed
          </Link>
          <button
            type="button"
            className={`icon-btn${starred ? ' is-on' : ''}`}
            aria-pressed={starred}
            aria-label={starred ? 'Retirer l’étoile' : 'Mettre une étoile'}
            data-testid="details-star"
            onClick={() => {
              star(video.id);
              show(`✦ ${starred ? '-' : '+'}${STAR_POINTS} pts #${video.tags[0]}`);
            }}
          >
            <StarIcon size={22} />
          </button>
        </header>

        <div className="phone__scroll">
          <div className="details__hero" style={{ background: video.gradient }}>
            <span className="details__icon" aria-hidden="true">
              {video.icon}
            </span>
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

          <section className="glass card">
            <h2 className="card__title">C’est quoi au quotidien ?</h2>
            <ul className="bullets">
              {video.dailyTasks.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </section>

          <section className="glass card">
            <h2 className="card__title">Qualités qui matchent avec ton profil</h2>
            <ul className="chips">
              {video.qualities.map((q) => (
                <li key={q}>{q}</li>
              ))}
            </ul>
            {matching.length > 0 && (
              <p className="muted small">✦ Tu as déjà des points sur {matching.map((t) => `#${t}`).join(' ')}.</p>
            )}
          </section>

          <section className="glass card">
            <h2 className="card__title">Formations &amp; écoles possibles</h2>
            <ul className="bullets">
              {video.formations.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          </section>

          <section className="glass card">
            <h2 className="card__title">Évolutions possibles</h2>
            <p>{video.evolutions}</p>
          </section>
        </div>
        <Toast toast={toast} />
      </div>
    </div>
  );
}
