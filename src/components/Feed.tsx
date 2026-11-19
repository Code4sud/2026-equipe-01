import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import type { ReelVideo, YouthProfile } from '../domain/types';
import { VIDEOS } from '../data/videos';
import { buildFeed, type FeedItem } from '../engine/recommend';
import { STAR_POINTS, WATCH_THRESHOLD_MS } from '../engine/signals';
import { useStore } from '../store/useStore';
import { StarIcon, TagBadge, Toast, useToast } from './ui';

const SWIPE_DISTANCE = 90;

interface ReelProps {
  item: FeedItem;
  starred: boolean;
  root: React.RefObject<HTMLDivElement | null>;
  onStar: (video: ReelVideo) => void;
  onWatched: (video: ReelVideo) => void;
  onOpen: (video: ReelVideo) => void;
}

function Reel({ item, starred, root, onStar, onWatched, onOpen }: ReelProps) {
  const { video, exploration } = item;
  const ref = useRef<HTMLElement>(null);

  // Watch time : > 3 s à l'écran => signal envoyé (le moteur garantit l'unicité).
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    let timer: number | undefined;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          timer = window.setTimeout(() => onWatched(video), WATCH_THRESHOLD_MS);
        } else {
          window.clearTimeout(timer);
        }
      },
      { root: root.current, threshold: 0.6 },
    );
    observer.observe(el);
    return () => {
      window.clearTimeout(timer);
      observer.disconnect();
    };
  }, [video, root, onWatched]);

  return (
    <section ref={ref} className="reel" style={{ background: video.gradient }} data-testid={`reel-${video.id}`} aria-label={video.title}>
      <motion.div
        className="reel__content"
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.6}
        dragSnapToOrigin
        onDragEnd={(_e, info) => {
          if (Math.abs(info.offset.x) > SWIPE_DISTANCE) onOpen(video);
        }}
      >
        {exploration && <span className="reel__explore">🧭 Exploration</span>}
        <span className="reel__icon" aria-hidden="true">
          {video.icon}
        </span>
        <p className="reel__category">
          {video.category} · Zone {video.zone}
        </p>
        <h2 className="reel__title display">{video.title}</h2>
        <div className="reel__tags">
          {video.tags.map((t) => (
            <TagBadge key={t} tag={t} tone="dark" />
          ))}
        </div>
        <p className="reel__hook">{video.hook}</p>
        <p className="reel__hint" aria-hidden="true">
          Swipe pour la fiche →
        </p>
      </motion.div>

      <div className="reel__actions">
        <button
          type="button"
          className={`reel__btn reel__star${starred ? ' is-on' : ''}`}
          aria-pressed={starred}
          aria-label={starred ? 'Retirer l’étoile' : 'Mettre une étoile'}
          data-testid={`star-${video.id}`}
          onClick={() => onStar(video)}
        >
          <StarIcon size={30} />
        </button>
        <button
          type="button"
          className="reel__btn"
          aria-label={`Voir la fiche ${video.title}`}
          data-testid={`open-${video.id}`}
          onClick={() => onOpen(video)}
        >
          →
        </button>
      </div>
    </section>
  );
}

/**
 * L'ordre du feed est figé au montage pour que la carte ne « saute » pas
 * quand on met une étoile ; il est recalculé à chaque retour sur le feed
 * ou via le bouton « Recharger ».
 */
export function Feed({ profile }: { profile: YouthProfile }) {
  const [items, setItems] = useState(() => buildFeed(VIDEOS, profile));
  const star = useStore((s) => s.star);
  const watch = useStore((s) => s.watch);
  const navigate = useNavigate();
  const scroller = useRef<HTMLDivElement>(null);
  const { toast, show } = useToast();

  const onStar = (video: ReelVideo) => {
    const wasStarred = profile.starredVideoIds.includes(video.id);
    star(video.id);
    show(`✦ ${wasStarred ? '-' : '+'}${STAR_POINTS} pts #${video.tags[0]}`);
  };

  const reload = () => {
    setItems(buildFeed(VIDEOS, useStore.getState().profiles[profile.id] ?? profile));
    scroller.current?.scrollTo({ top: 0 });
  };

  return (
    <div className="feed" ref={scroller} data-testid="feed">
      {items.map((item) => (
        <Reel
          key={item.video.id}
          item={item}
          root={scroller}
          starred={profile.starredVideoIds.includes(item.video.id)}
          onStar={onStar}
          onWatched={(v) => watch(v.id)}
          onOpen={(v) => navigate(`/app/details/${v.id}`)}
        />
      ))}
      <section className="reel reel--end">
        <StarIcon size={40} />
        <p>Tu as tout vu ! Ton feed s’est adapté à tes étoiles.</p>
        <button type="button" className="btn btn--primary" onClick={reload} data-testid="reload-feed">
          ↻ Recharger mon feed
        </button>
      </section>
      <Toast toast={toast} />
    </div>
  );
}
