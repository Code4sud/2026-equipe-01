import { Compass } from 'lucide-react';
import type { YouthProfile } from '../domain/types';
import type { FeedItem } from '../engine/recommend';
import { topTags } from '../engine/signals';
import { TagBars } from './ui';
import { VideoIcon } from './icons';

/** « Algo en direct » : boussole des tags + prochaines fiches du feed vivant. */
export function AlgoContent({ profile, next }: { profile: YouthProfile; next: FeedItem[] }) {
  return (
    <div className="algo" data-testid="algo-panel">
      <h3 className="side__title display">Boussole de {profile.name}</h3>
      <TagBars scores={topTags(profile)} limit={8} />
      <h4 className="side__sub">Prochain feed</h4>
      <ol className="next">
        {next.map((f, i) => (
          <li key={f.video.id} className="next__row" data-testid={`next-${f.video.id}`}>
            <span className="next__main">
              <span className="next__num mono">{String(i + 1).padStart(2, '0')}</span>
              <VideoIcon name={f.video.icon} size={16} className="next__icon" />
              <span className="next__title" title={f.video.title}>
                {f.video.title}
              </span>
            </span>
            {f.exploration ? (
              <span className="badge-discovery badge-discovery--light">
                <Compass size={12} aria-hidden="true" /> Découverte
              </span>
            ) : (
              <span className="next__score mono">{f.score} pts</span>
            )}
          </li>
        ))}
      </ol>
      <p className="muted small">
        Score = somme de tes tags · étoile +5 · regard de plus de 3 s +2 · 1 fiche sur 4 en Découverte.
      </p>
    </div>
  );
}
