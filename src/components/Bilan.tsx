import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Compass, GraduationCap, House, Printer, Sparkles, UserRound } from 'lucide-react';
import type { YouthProfile } from '../domain/types';
import { VIDEOS, getVideoById } from '../data/videos';
import { ONET_JOBS, ZONE_FILTERS, matchesZoneFilter, rankOnetJobs, type ZoneFilter } from '../data/onet';
import { zoneLabel, type AiResult, type ParentReportData } from '../engine/ai';
import { topTags } from '../engine/signals';
import { generateParentReport } from '../services/aiService';
import { AiProgress, AiSourceBadge } from './AiStatus';
import { VideoIcon } from './icons';
import { Logo, RadarChart, TagBars } from './ui';

function ParentReport({ result, name }: { result: AiResult<ParentReportData>; name: string }) {
  const r = result.data;
  return (
    <article className="parent-report print-area" data-testid="parent-report">
      <header className="parent-report__head">
        <span className="report__brand">
          <Logo />
        </span>
        <AiSourceBadge source={result.source} />
      </header>
      <h3 className="display">Analyse pour les parents de {name}</h3>

      <section className="parent-report__card" data-testid="report-summary">
        <h4>
          <UserRound size={17} aria-hidden="true" /> Ses forces
        </h4>
        <p>{r.profileSummary}</p>
      </section>
      <section className="parent-report__card" data-testid="report-dynamics">
        <h4>
          <Sparkles size={17} aria-hidden="true" /> Ce que révèle son exploration
        </h4>
        <p>{r.explorationDynamics}</p>
      </section>
      <section className="parent-report__card" data-testid="report-tracks">
        <h4>
          <GraduationCap size={17} aria-hidden="true" /> 3 pistes, 3 horizons d’études
        </h4>
        <ul className="tracks">
          {r.careerTracks.map((t) => (
            <li key={t.jobTitle} data-testid="report-track">
              <span className="tracks__zone">{t.zoneLabel}</span>
              <strong>{t.jobTitle}</strong>
              <span>{t.whyItFits}</span>
              <small>Formations : {t.formations}</small>
            </li>
          ))}
        </ul>
      </section>
      <section className="parent-report__card" data-testid="report-advice">
        <h4>
          <House size={17} aria-hidden="true" /> À la maison
        </h4>
        <ul>
          {r.homeAdvice.map((a) => (
            <li key={a}>{a}</li>
          ))}
        </ul>
      </section>
      <p className="parent-report__disclaimer" data-testid="report-disclaimer">
        {r.disclaimer}
      </p>
      <button type="button" className="btn btn--glass no-print" onClick={() => window.print()} data-testid="print-report">
        <Printer size={16} aria-hidden="true" /> Imprimer / Exporter en PDF
      </button>
    </article>
  );
}

export function ZoneFilterBar({ value, onChange, testId }: { value: ZoneFilter; onChange: (f: ZoneFilter) => void; testId: string }) {
  return (
    <div className="zone-filter" role="group" aria-label="Filtrer par durée d’études" data-testid={testId}>
      {ZONE_FILTERS.map((f) => (
        <button key={f.id} type="button" aria-pressed={value === f.id} onClick={() => onChange(f.id)} data-testid={`${testId}-${f.id}`}>
          {f.label}
        </button>
      ))}
    </div>
  );
}

export function Bilan({ profile }: { profile: YouthProfile }) {
  const [report, setReport] = useState<AiResult<ParentReportData> | null>(null);
  const [pending, setPending] = useState(false);
  const [zone, setZone] = useState<ZoneFilter>('all');
  const starred = profile.starredVideoIds.map(getVideoById).filter((v) => v !== undefined);
  const onet = useMemo(() => rankOnetJobs(profile.tagScores, zone).slice(0, 6), [profile.tagScores, zone]);
  const feedJobs = VIDEOS.filter((v) => v.category === 'Métier' && matchesZoneFilter(v.zone, zone)).length;

  const generate = async () => {
    setPending(true);
    try {
      setReport(await generateParentReport(profile, VIDEOS));
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="bilan" data-testid="bilan">
      <div className="bilan__intro glass no-print">
        <h2 className="display">Le bilan de {profile.name}</h2>
        <p className="muted small">
          {profile.age} ans · {profile.hasBilan ? profile.rdvRef : 'pas encore de bilan'} · Espace à partager avec ta famille
        </p>
        <button type="button" className="btn btn--primary btn--block" onClick={generate} disabled={pending} data-testid="generate-report">
          <Sparkles size={16} aria-hidden="true" /> Générer l’analyse pour mes parents
        </button>
        {pending && <AiProgress light />}
      </div>

      <section className="glass card no-print">
        <h3 className="card__title">Profil d’intérêts (RIASEC)</h3>
        <RadarChart profile={profile} />
        {!profile.hasBilan && (
          <p className="muted small">
            Estimation à partir de tes centres d’intérêt. Ton bilan au Centre des Possibles la remplacera.
          </p>
        )}
        <p className="muted small">Le radar bouge en direct avec tes étoiles et ton temps de visionnage.</p>
      </section>

      {report && <ParentReport result={report} name={profile.name} />}

      <section className="glass card no-print">
        <h3 className="card__title">Ce qui l’attire sur PolarIA</h3>
        <TagBars scores={topTags(profile)} />
      </section>

      <section className="glass card no-print" data-testid="bilan-onet">
        <h3 className="card__title">
          <Compass size={17} aria-hidden="true" /> Métiers du référentiel O*NET pour toi
        </h3>
        <ZoneFilterBar value={zone} onChange={setZone} testId="bilan-zone" />
        <ul className="onet-list">
          {onet.map((j) => (
            <li key={j.code} data-testid="bilan-onet-job" data-zone={j.zone}>
              <span className="onet-list__title">
                <strong>{j.title}</strong>
                <small>{j.tags.map((t) => `#${t}`).join(' ')}</small>
              </span>
              <span className="onet-list__zone">{zoneLabel(j.zone)}</span>
            </li>
          ))}
        </ul>
        <p className="muted small">
          {ONET_JOBS.length} métiers classés en 5 zones de qualification · {feedJobs} fiches dans ton feed pour ce filtre.
        </p>
      </section>

      <section className="glass card no-print">
        <h3 className="card__title">Fiches étoilées ({starred.length})</h3>
        {starred.length ? (
          <ul className="chips">
            {starred.map((v) => (
              <li key={v.id}>
                <Link to={`/app/details/${v.id}`}>
                  <VideoIcon name={v.icon} size={15} /> {v.title}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted small">Pas encore d’étoile : explore le feed « Pour toi ».</p>
        )}
      </section>
    </div>
  );
}
