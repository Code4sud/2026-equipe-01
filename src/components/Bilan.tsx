import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { YouthProfile } from '../domain/types';
import { VIDEOS, getVideoById } from '../data/videos';
import { generateParentReport, type ParentReport } from '../engine/generate';
import { topTags } from '../engine/signals';
import { Printer } from 'lucide-react';
import { Logo, RadarChart, TagBars } from './ui';

function Report({ report }: { report: ParentReport }) {
  return (
    <article className="report glass print-area" data-testid="parent-report">
      <header className="report__head">
        <p className="report__brand">
          <Logo />
        </p>
        <h3 className="display">{report.title}</h3>
        <p className="muted small">{report.subtitle}</p>
      </header>
      {report.sections.map((s, i) => (
        <section key={s.id} className="report__section">
          <h4>
            {i + 1}. {s.title}
          </h4>
          {s.groups ? (
            <ul className="zones">
              {s.groups.map((g) => (
                <li key={g.zone}>
                  <span className="zones__badge">Zone {g.zone} · {g.label}</span>
                  <span>{g.titles.join(', ')}</span>
                </li>
              ))}
            </ul>
          ) : (
            <ul>
              {s.items.map((it) => (
                <li key={it}>{it}</li>
              ))}
            </ul>
          )}
        </section>
      ))}
      <p className="report__disclaimer">{report.disclaimer}</p>
      <button type="button" className="btn btn--glass no-print" onClick={() => window.print()} data-testid="print-report">
        <Printer size={16} aria-hidden="true" /> Imprimer / PDF
      </button>
    </article>
  );
}

export function Bilan({ profile }: { profile: YouthProfile }) {
  const [report, setReport] = useState<ParentReport | null>(null);
  const starred = profile.starredVideoIds.map(getVideoById).filter((v) => v !== undefined);

  return (
    <div className="bilan" data-testid="bilan">
      <div className="bilan__intro glass no-print">
        <h2 className="display">Le bilan de {profile.name}</h2>
        <p className="muted small">
          {profile.age} ans · {profile.hasBilan ? profile.rdvRef : 'pas encore de bilan'} · Espace à partager avec ta famille
        </p>
        <button
          type="button"
          className="btn btn--primary btn--block"
          onClick={() => setReport(generateParentReport(profile, VIDEOS))}
          data-testid="generate-report"
        >
          Générer le rapport d’accompagnement
        </button>
      </div>

      {report && <Report report={report} />}

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

      <section className="glass card no-print">
        <h3 className="card__title">Ce qui l’attire sur PolarIA</h3>
        <TagBars scores={topTags(profile)} />
      </section>

      <section className="glass card no-print">
        <h3 className="card__title">Fiches étoilées ({starred.length})</h3>
        {starred.length ? (
          <ul className="chips">
            {starred.map((v) => (
              <li key={v.id}>
                <Link to={`/app/details/${v.id}`}>
                  {v.icon} {v.title}
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
