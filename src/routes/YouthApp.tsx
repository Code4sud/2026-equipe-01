import { useMemo, useState } from 'react';
import { Link, Navigate, useMatch, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { Feed } from '../components/Feed';
import { Bilan } from '../components/Bilan';
import { ReelStory } from '../components/ReelStory';
import { AuthModal } from '../components/AuthModal';
import { DetailsScreen } from '../components/DetailsScreen';
import { ProfileScreen } from '../components/ProfileScreen';
import { AlgoContent } from '../components/AlgoPanel';
import { WhyContent } from '../components/WhyPanel';
import { StarIcon, Toast, useIsDesktop, useToast } from '../components/ui';
import { VIDEOS, getVideoById } from '../data/videos';
import { buildLiveFeed, type FeedItem } from '../engine/recommend';
import { STAR_POINTS } from '../engine/signals';
import { useCurrentYouth, useStore } from '../store/useStore';

type Tab = 'feed' | 'bilan';

const slide = {
  initial: { x: '100%' },
  animate: { x: 0 },
  exit: { x: '100%' },
  transition: { type: 'tween', duration: 0.28, ease: [0.2, 0.8, 0.2, 1] },
} as const;

/**
 * Parcours jeune : un cadre téléphone stable au centre (feed, Mon Bilan, fiche,
 * Mon Profil vivent DEDANS) et, sur desktop, un panneau latéral fixe qui
 * bascule entre « Algo en direct » et « Pourquoi PolarIA te propose ça ? ».
 */
export function YouthApp() {
  const session = useStore((s) => s.session);
  const star = useStore((s) => s.star);
  const logout = useStore((s) => s.logout);
  const profile = useCurrentYouth();
  const navigate = useNavigate();
  const desktop = useIsDesktop();
  const detailsMatch = useMatch('/app/details/:videoId');
  const profileOpen = useMatch('/app/profil') !== null;
  const [tab, setTab] = useState<Tab>('feed');
  const [story, setStory] = useState(false);
  const { toast, show } = useToast();

  // Feed vivant : les fiches atteintes restent figées, la suite se réoriente en direct.
  const [frozenFor, setFrozenFor] = useState<{ id: string; items: FeedItem[] }>({ id: profile.id, items: [] });
  const frozen = useMemo(() => (frozenFor.id === profile.id ? frozenFor.items : []), [frozenFor, profile.id]);
  const items = useMemo(() => buildLiveFeed(VIDEOS, profile, frozen), [profile, frozen]);
  const activeIndex = Math.max(0, frozen.length - 1);

  if (session === null) return <AuthModal />;

  const videoId = detailsMatch?.params.videoId;
  const video = videoId ? getVideoById(videoId) : undefined;
  if (videoId && !video) return <Navigate to="/app" replace />;

  const onActive = (index: number) => {
    if (index >= frozen.length) setFrozenFor({ id: profile.id, items: items.slice(0, index + 1) });
  };
  const toggleStar = (id: string, firstTag: string | undefined) => {
    const wasStarred = profile.starredVideoIds.includes(id);
    star(id);
    show(`${wasStarred ? '-' : '+'}${STAR_POINTS} pts #${firstTag ?? ''}`);
  };

  return (
    <div className="youth-layout">
      <div className={`phone${tab === 'bilan' ? ' phone--light' : ''}`} data-testid="phone">
        <header className="phone__top">
          {session.role === 'pro' ? (
            <Link to="/pro" className="phone__home" aria-label="Retour à l’espace Pro" data-testid="back-to-pro">
              <ArrowLeft size={18} aria-hidden="true" />
            </Link>
          ) : (
            <Link to="/" className="phone__home" aria-label="PolarIA, accueil">
              <StarIcon size={18} />
            </Link>
          )}
          <div className="tabs" role="tablist">
            <button type="button" role="tab" aria-selected={tab === 'feed'} onClick={() => setTab('feed')} data-testid="tab-feed">
              Pour toi
            </button>
            <button type="button" role="tab" aria-selected={tab === 'bilan'} onClick={() => setTab('bilan')} data-testid="tab-bilan">
              Mon Bilan
            </button>
          </div>
          <Link to="/app/profil" className="phone__who" aria-label={`Mon profil (${profile.name})`} data-testid="open-profile">
            {profile.name.charAt(0)}
          </Link>
        </header>

        {/* Le feed reste monté sous la fiche : on retrouve sa position au retour. */}
        <div className="phone__main" hidden={tab !== 'feed'}>
          <button type="button" className="debrief-cta" onClick={() => setStory(true)} data-testid="open-debrief">
            <Sparkles size={15} aria-hidden="true" /> Générer mon avenir
          </button>
          <Feed
            items={items}
            profile={profile}
            onActive={onActive}
            onOpen={(v) => navigate(`/app/details/${v.id}`)}
            onReload={() => setFrozenFor({ id: profile.id, items: [] })}
          />
        </div>
        {tab === 'bilan' && (
          <div className="phone__scroll">
            <Bilan profile={profile} />
          </div>
        )}

        <AnimatePresence>
          {video && (
            <motion.div key={`details-${video.id}`} className="phone__overlay" {...slide}>
              <DetailsScreen
                video={video}
                profile={profile}
                showWhy={!desktop}
                onBack={() => navigate('/app')}
                onStar={() => toggleStar(video.id, video.tags[0])}
              />
            </motion.div>
          )}
          {profileOpen && (
            <motion.div key="profile" className="phone__overlay" {...slide}>
              <ProfileScreen
                profile={profile}
                canLogout={session.role === 'jeune'}
                onBack={() => navigate('/app')}
                onLogout={() => {
                  logout();
                  navigate('/');
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {story && <ReelStory profile={profile} onClose={() => setStory(false)} />}
        <Toast toast={toast} />
      </div>

      {desktop && (
        <aside className="side glass" aria-live="polite" data-testid="side-panel">
          {video ? (
            <>
              <p className="eyebrow">Fiche ouverte</p>
              <h3 className="side__title display">Pourquoi PolarIA te propose ça ?</h3>
              <WhyContent video={video} profile={profile} onStar={() => toggleStar(video.id, video.tags[0])} />
            </>
          ) : (
            <>
              <p className="eyebrow">Algo en direct</p>
              <AlgoContent profile={profile} next={items.slice(activeIndex + 1, activeIndex + 9)} />
            </>
          )}
        </aside>
      )}
    </div>
  );
}
