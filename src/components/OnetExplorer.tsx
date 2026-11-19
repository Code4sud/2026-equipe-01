import { useMemo, useState } from 'react';
import { Compass } from 'lucide-react';
import type { YouthProfile } from '../domain/types';
import { ONET_JOBS, rankOnetJobs, type ZoneFilter } from '../data/onet';
import { zoneLabel } from '../engine/ai';
import { ZoneFilterBar } from './Bilan';

const PAGE = 10;

/**
 * Explorateur du référentiel O*NET FR dans l'espace Pro : métiers triés par
 * affinité avec les tags du jeune choisi, filtrables par durée d'études.
 * Aucune saisie libre : uniquement des boutons (règle RGPD de /pro).
 */
export function OnetExplorer({ profiles }: { profiles: YouthProfile[] }) {
  const [youthId, setYouthId] = useState(profiles[0]?.id ?? '');
  const [zone, setZone] = useState<ZoneFilter>('all');
  const [shown, setShown] = useState(PAGE);
  const youth = profiles.find((p) => p.id === youthId) ?? profiles[0];
  const ranked = useMemo(() => rankOnetJobs(youth?.tagScores ?? {}, zone), [youth, zone]);

  const pickZone = (z: ZoneFilter) => {
    setZone(z);
    setShown(PAGE);
  };

  return (
    <section className="glass card onet-explorer" data-testid="onet-explorer" aria-labelledby="onet-title">
      <div className="onet-explorer__head">
        <div>
          <p className="eyebrow">Référentiel O*NET FR</p>
          <h2 id="onet-title" className="card__title">
            <Compass size={18} aria-hidden="true" /> Explorateur métiers ({ONET_JOBS.length} métiers, 5 zones)
          </h2>
        </div>
        <ZoneFilterBar value={zone} onChange={pickZone} testId="pro-zone" />
      </div>

      <div className="zone-filter" role="group" aria-label="Trier pour le jeune">
        {profiles.map((p) => (
          <button key={p.id} type="button" aria-pressed={p.id === youth?.id} onClick={() => setYouthId(p.id)} data-testid={`onet-for-${p.id}`}>
            Pour {p.name}
          </button>
        ))}
      </div>

      <ul className="onet-list" data-testid="onet-list">
        {ranked.slice(0, shown).map((j) => (
          <li key={j.code} data-testid="onet-job" data-zone={j.zone}>
            <span className="onet-list__title">
              <strong>{j.title}</strong>
              <small>
                <span className="mono">{j.code}</span> · {j.tags.map((t) => `#${t}`).join(' ')}
              </small>
            </span>
            <span className="onet-list__zone">
              {zoneLabel(j.zone)}
              <br />
              <span className="muted">{j.score} pts</span>
            </span>
          </li>
        ))}
      </ul>
      <p className="muted small" data-testid="onet-count">
        {ranked.length} métiers pour ce filtre.
        {shown < ranked.length && (
          <>
            {' '}
            <button type="button" className="link-btn" onClick={() => setShown((n) => n + PAGE)} data-testid="onet-more">
              Voir plus
            </button>
          </>
        )}
      </p>
    </section>
  );
}
