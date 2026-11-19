import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Feed } from '../components/Feed';
import { Bilan } from '../components/Bilan';
import { DebriefStory } from '../components/DebriefStory';
import { AuthModal } from '../components/AuthModal';
import { StarIcon, TagBars } from '../components/ui';
import { VIDEOS } from '../data/videos';
import { buildFeed } from '../engine/recommend';
import { topTags } from '../engine/signals';
import { useCurrentYouth, useStore } from '../store/useStore';
import type { YouthProfile } from '../domain/types';

type Tab = 'feed' | 'bilan';

function AlgoPanel({ profile }: { profile: YouthProfile }) {
  const next = buildFeed(VIDEOS, profile).slice(0, 8);
  return (
    <aside className="algo glass" data-testid="algo-panel" aria-label="Algorithme en direct">
      <p className="eyebrow">Algo en direct</p>
      <h3 className="display">Boussole de {profile.name}</h3>
      <TagBars scores={topTags(profile)} limit={8} />
      <h4 className="algo__sub">Prochain feed</h4>
      <ol className="algo__list">
        {next.map((f) => (
          <li key={f.video.id}>
            <span>
              {f.video.icon} {f.video.title}
            </span>
            <span className={f.exploration ? 'algo__explo' : 'algo__score'}>{f.exploration ? '🧭' : f.score}</span>
          </li>
        ))}
      </ol>
      <p className="muted small">Score = somme des tags · ✦ +5 · regard &gt; 3 s +2 · 🧭 1 exploration toutes les 4.</p>
    </aside>
  );
}

export function YouthApp() {
  const session = useStore((s) => s.session);
  const profile = useCurrentYouth();
  const [tab, setTab] = useState<Tab>('feed');
  const [story, setStory] = useState(false);
  const logout = useStore((s) => s.logout);
  const navigate = useNavigate();

  // Un pro peut prévisualiser le feed d'un jeune ; un visiteur doit se connecter.
  if (session === null) return <AuthModal />;

  return (
    <div className="app-shell">
      <div className={`phone${tab === 'bilan' ? ' phone--light' : ''}`} data-testid="phone">
        <header className="phone__top">
          <Link to="/" className="phone__home" aria-label="Retour à l’accueil">
            <StarIcon size={18} />
          </Link>
          <div className="tabs" role="tablist">
            <button type="button" role="tab" aria-selected={tab === 'feed'} onClick={() => setTab('feed')} data-testid="tab-feed">
              Pour toi
            </button>
            <button type="button" role="tab" aria-selected={tab === 'bilan'} onClick={() => setTab('bilan')} data-testid="tab-bilan">
              Mon Bilan
            </button>
          </div>
          {session.role === 'pro' ? (
            <Link to="/pro" className="phone__who" title="Retour à l’espace Pro" aria-label="Retour à l’espace Pro" data-testid="back-to-pro">
              ←
            </Link>
          ) : (
            <button
              type="button"
              className="phone__who"
              title={`Se déconnecter (${profile.name})`}
              aria-label={`Se déconnecter (${profile.name})`}
              data-testid="logout"
              onClick={() => {
                logout();
                navigate('/');
              }}
            >
              {profile.name.charAt(0)}
            </button>
          )}
        </header>

        {tab === 'feed' ? (
          <>
            <button type="button" className="debrief-cta" onClick={() => setStory(true)} data-testid="open-debrief">
              ✦ Générer mon avenir
            </button>
            <Feed key={profile.id} profile={profile} />
          </>
        ) : (
          <div className="phone__scroll">
            <Bilan profile={profile} />
          </div>
        )}

        {story && <DebriefStory profile={profile} onClose={() => setStory(false)} />}
      </div>
      <AlgoPanel profile={profile} />
    </div>
  );
}
