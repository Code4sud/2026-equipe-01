import { Link, Navigate, useParams } from 'react-router-dom';
import { getVideoById } from '../data/videos';
import { useCurrentYouth, useStore } from '../store/useStore';
import { StarIcon, TagBadge, Toast, useToast } from '../components/ui';
import { AuthModal } from '../components/AuthModal';
import { STAR_POINTS, WATCH_POINTS } from '../engine/signals';
import { matchPercent, matchedTags } from '../engine/match';
import type { ReelVideo, YouthProfile } from '../domain/types';

function WhyPanel({ video, profile, onStar }: { video: ReelVideo; profile: YouthProfile; onStar: () => void }) {
  const percent = matchPercent(video, profile);
  const starred = profile.starredVideoIds.includes(video.id);
  const watched = profile.watchedVideoIds.includes(video.id);
  return (
    <aside className="why glass" aria-label="Pourquoi PolarIA te propose ça ?" data-testid="why-panel">
      <h2 className="why__title display">
        <StarIcon size={18} className="accent-star" /> Pourquoi PolarIA te propose ça ?
      </h2>
      <div className="why__match">
        <svg viewBox="0 0 36 36" className="gauge" aria-hidden="true">
          <circle cx="18" cy="18" r="15.9" className="gauge__track" />
          <circle cx="18" cy="18" r="15.9" className="gauge__fill" strokeDasharray={`${percent} 100`} />
        </svg>
        <div>
          <strong className="why__percent" data-testid="match-percent">
            {percent} %
          </strong>
          <span className="muted small">de match avec ton profil</span>
        </div>
      </div>
      <ul className="why__tags">
        {matchedTags(video, profile).map(([tag, pts]) => (
          <li key={tag} className={pts > 0 ? 'is-match' : ''}>
            <span>#{tag}</span>
            <strong data-testid={`why-pts-${tag}`}>{pts} pts</strong>
          </li>
        ))}
      </ul>
      <div className="why__algo">
        <p className="eyebrow">Comment l’algo calcule</p>
        <ul>
          <li>Score de la fiche = somme de tes points sur ses tags.</li>
          <li>
            ✦ +{STAR_POINTS} pts sur chaque tag si tu mets une étoile.
          </li>
          <li>+{WATCH_POINTS} pts après 3 s de visionnage {watched ? '(déjà compté ✓)' : ''}</li>
          <li>Ton conseiller peut aussi ajuster tes tags.</li>
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
    </aside>
  );
}

export function Details() {
  const { videoId = '' } = useParams();
  const video = getVideoById(videoId);
  const session = useStore((s) => s.session);
  const profile = useCurrentYouth();
  const star = useStore((s) => s.star);
  const { toast, show } = useToast();

  if (!session) return <AuthModal />;
  if (!video) return <Navigate to="/app" replace />;

  const starred = profile.starredVideoIds.includes(video.id);
  const toggle = () => {
    star(video.id);
    show(`✦ ${starred ? '-' : '+'}${STAR_POINTS} pts #${video.tags[0]}`);
  };

  return (
    <div className="details-page" data-testid="details">
      <header className="details__top glass">
        <Link to="/app" className="btn btn--ghost btn--sm" data-testid="back-to-feed">
          ← Retour au feed
        </Link>
        <button
          type="button"
          className={`icon-btn${starred ? ' is-on' : ''}`}
          aria-pressed={starred}
          aria-label={starred ? 'Retirer l’étoile' : 'Mettre une étoile'}
          data-testid="details-star"
          onClick={toggle}
        >
          <StarIcon size={22} />
        </button>
      </header>

      <div className="details__grid">
        <main className="details__main">
          <div className="details__hero" style={{ background: video.gradient }}>
            <span className="details__icon" aria-hidden="true">
              {video.icon}
            </span>
            <p className="details__category">{video.category}</p>
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
            <h2 className="card__title">Qualités clés</h2>
            <ul className="chips">
              {video.qualities.map((q) => (
                <li key={q}>{q}</li>
              ))}
            </ul>
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
        </main>

        <WhyPanel video={video} profile={profile} onStar={toggle} />
      </div>
      <Toast toast={toast} />
    </div>
  );
}
