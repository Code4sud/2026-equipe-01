import { ArrowLeft, LogOut, Minus, Plus } from 'lucide-react';
import { RIASEC_KEYS, type YouthProfile } from '../domain/types';
import { ALL_TAGS } from '../data/tags';
import { YOUTH_NEW_TAG_POINTS, YOUTH_STEP, topTags } from '../engine/signals';
import { useStore } from '../store/useStore';

interface Props {
  profile: YouthProfile;
  /** Un conseiller qui prévisualise ne peut pas déconnecter le jeune depuis ici. */
  canLogout: boolean;
  onBack: () => void;
  onLogout: () => void;
}

/** « Mon Profil & Mes Tags » : le jeune pilote lui-même son feed. */
export function ProfileScreen({ profile, canLogout, onBack, onLogout }: Props) {
  const tune = useStore((s) => s.youthTune);
  const explore = useStore((s) => s.youthExplore);
  const [first, second] = [...RIASEC_KEYS].sort((a, b) => profile.riasec[b] - profile.riasec[a]);
  const others = ALL_TAGS.filter((t) => !(t in profile.tagScores));

  return (
    <div className="screen screen--light" data-testid="profile-screen">
      <header className="screen__top">
        <button type="button" className="btn btn--ghost btn--sm" onClick={onBack} data-testid="back-from-profile">
          <ArrowLeft size={16} aria-hidden="true" /> Retour
        </button>
      </header>
      <div className="screen__body">
        <section className="card profile-card">
          <span className="profile-card__avatar display" aria-hidden="true">
            {profile.name.charAt(0)}
          </span>
          <div>
            <h1 className="display">{profile.name}</h1>
            <p className="muted small">
              {profile.age} ans · profil dominant <strong>{first}</strong>
              {second ? ` / ${second}` : ''}
              {profile.hasBilan ? '' : ' (estimation)'}
            </p>
          </div>
          {canLogout && (
            <button type="button" className="btn btn--glass btn--sm" onClick={onLogout} data-testid="logout">
              <LogOut size={15} aria-hidden="true" /> Se déconnecter
            </button>
          )}
        </section>

        <section className="card">
          <h2 className="card__title">Mes tags détectés</h2>
          <p className="muted small">
            Voir plus (+{YOUTH_STEP} pts) ou voir moins (-{YOUTH_STEP} pts) : ton feed suit tout de suite.
          </p>
          <ul className="my-tags">
            {topTags(profile).map(([tag, score]) => (
              <li key={tag} className="my-tags__row">
                <span className="my-tags__name" title={tag}>
                  {tag}
                </span>
                <button
                  type="button"
                  className="icon-btn icon-btn--sm"
                  aria-label={`Voir moins de ${tag}`}
                  onClick={() => tune(tag, -1)}
                  data-testid={`less-${tag}`}
                >
                  <Minus size={14} aria-hidden="true" />
                </button>
                <span className="my-tags__score mono" data-testid={`my-score-${tag}`}>
                  {score}
                </span>
                <button
                  type="button"
                  className="icon-btn icon-btn--sm"
                  aria-label={`Voir plus de ${tag}`}
                  onClick={() => tune(tag, 1)}
                  data-testid={`more-${tag}`}
                >
                  <Plus size={14} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        </section>

        {others.length > 0 && (
          <section className="card">
            <h2 className="card__title">Explorer de nouveaux domaines</h2>
            <p className="muted small">Un clic ajoute le domaine (+{YOUTH_NEW_TAG_POINTS} pts) à tes prochains Reels.</p>
            <div className="interests__chips">
              {others.map((tag) => (
                <button key={tag} type="button" className="chip-toggle" onClick={() => explore(tag)} data-testid={`explore-${tag}`}>
                  <Plus size={13} aria-hidden="true" /> {tag}
                </button>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
