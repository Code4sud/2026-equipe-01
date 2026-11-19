import { useEffect, useEffectEvent, useRef } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Compass, RotateCcw } from 'lucide-react';
import type { ReelVideo, YouthProfile } from '../domain/types';
import type { FeedItem } from '../engine/recommend';
import { STAR_POINTS, WATCH_THRESHOLD_MS } from '../engine/signals';
import { useStore } from '../store/useStore';
import { StarIcon, TagBadge, Toast, useToast } from './ui';
import { VideoIcon } from './icons';

const SWIPE_DISTANCE = 90;
/** Molette : delta cumulé qui déclenche un changement de fiche, et pause entre deux fiches (pavés tactiles). */
const WHEEL_THRESHOLD_PX = 30;
const WHEEL_COOLDOWN_MS = 450;
const WHEEL_LINE_PX = 40;

interface ReelProps {
  item: FeedItem;
  index: number;
  starred: boolean;
  root: React.RefObject<HTMLDivElement | null>;
  onStar: (video: ReelVideo) => void;
  onWatched: (video: ReelVideo) => void;
  onActive: (index: number) => void;
  onOpen: (video: ReelVideo) => void;
}

function Reel({ item, index, starred, root, onStar, onWatched, onActive, onOpen }: ReelProps) {
  const { video, exploration } = item;
  const ref = useRef<HTMLElement>(null);
  const watched = useEffectEvent(() => onWatched(video));
  const active = useEffectEvent(() => onActive(index));

  // Carte active + temps de visionnage : > 3 s à l'écran => signal (le moteur garantit l'unicité).
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    let timer: number | undefined;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          active();
          timer = window.setTimeout(() => watched(), WATCH_THRESHOLD_MS);
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
  }, [root]);

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
        {exploration && (
          <span className="badge-discovery" data-testid={`discovery-${video.id}`}>
            <Compass size={14} aria-hidden="true" /> Découverte
          </span>
        )}
        <span className="reel__icon">
          <VideoIcon name={video.icon} size={84} strokeWidth={1.4} />
        </span>
        <p className="reel__category mono">
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
          Glisse pour ouvrir la fiche
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
          <ArrowRight size={24} aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}

interface FeedProps {
  items: FeedItem[];
  profile: YouthProfile;
  onActive: (index: number) => void;
  onOpen: (video: ReelVideo) => void;
  onReload: () => void;
}

/**
 * Feed vertical « Pour toi ». L'ordre vient du parent (buildLiveFeed) : les
 * fiches déjà vues restent en place, la suite se réoriente en direct.
 */
export function Feed({ items, profile, onActive, onOpen, onReload }: FeedProps) {
  const star = useStore((s) => s.star);
  const watch = useStore((s) => s.watch);
  const scroller = useRef<HTMLDivElement>(null);
  const { toast, show } = useToast();

  // Molette de souris : avec le scroll aimanté « mandatory », un cran (≈100 px) est
  // plus petit qu'une demi-carte et le navigateur ramène sur la même fiche. On
  // traduit donc chaque geste de molette en « fiche suivante / précédente ».
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    let acc = 0;
    let lockedUntil = 0;
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      e.preventDefault();
      const now = performance.now();
      if (now < lockedUntil) return;
      acc += e.deltaMode === 1 ? e.deltaY * WHEEL_LINE_PX : e.deltaY;
      if (Math.abs(acc) < WHEEL_THRESHOLD_PX) return;
      const page = el.clientHeight || 1;
      const target = Math.round(el.scrollTop / page) + Math.sign(acc);
      acc = 0;
      lockedUntil = now + WHEEL_COOLDOWN_MS;
      el.scrollTo({ top: Math.max(0, target) * page, behavior: 'smooth' });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  const onStar = (video: ReelVideo) => {
    const wasStarred = profile.starredVideoIds.includes(video.id);
    star(video.id);
    show(`${wasStarred ? '-' : '+'}${STAR_POINTS} pts #${video.tags[0]}`);
  };

  return (
    <div className="feed" ref={scroller} data-testid="feed">
      {items.map((item, index) => (
        <Reel
          key={item.video.id}
          item={item}
          index={index}
          root={scroller}
          starred={profile.starredVideoIds.includes(item.video.id)}
          onStar={onStar}
          onWatched={(v) => watch(v.id)}
          onActive={onActive}
          onOpen={onOpen}
        />
      ))}
      <section className="reel reel--end">
        <p>Tu as tout vu. Ton feed s’est adapté à tes étoiles.</p>
        <button
          type="button"
          className="btn btn--primary"
          onClick={() => {
            onReload();
            scroller.current?.scrollTo({ top: 0 });
          }}
          data-testid="reload-feed"
        >
          <RotateCcw size={16} aria-hidden="true" /> Recharger mon feed
        </button>
      </section>
      <Toast toast={toast} />
    </div>
  );
}
