import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Logo, RadarChart, RgpdBadge, StarIcon, TagBadge, TagBars } from '../components/ui';
import { ALL_TAGS } from '../data/tags';
import { getVideoById } from '../data/videos';
import { RIASEC_KEYS, type YouthProfile } from '../domain/types';
import { topTags } from '../engine/signals';
import { useCurrentAccount, useStore } from '../store/useStore';
import { AuthModal } from '../components/AuthModal';
import { DocumentsSection } from '../components/Documents';

const COUNSELOR = 'Dr. Martin';
const STEP = 5;

function dominant(p: YouthProfile) {
  return [...RIASEC_KEYS].sort((a, b) => p.riasec[b] - p.riasec[a])[0]!;
}

function lastActivity(p: YouthProfile): string {
  const n = p.watchedVideoIds.length + p.starredVideoIds.length;
  return n === 0 ? 'Pas encore active' : `${n} interaction(s) sur l’app`;
}

/**
 * Éditeur de tags RGPD : uniquement des actions bornées sur un catalogue fermé
 * (ajout par liste déroulante, +/-, suppression). Aucun champ texte.
 */
function TagEditor({ profile }: { profile: YouthProfile }) {
  const { proAddTag, proAdjustTag, proRemoveTag } = useStore();
  const available = ALL_TAGS.filter((t) => !(t in profile.tagScores));
  const [toAdd, setToAdd] = useState<string>('');

  return (
    <div className="editor" data-testid="tag-editor">
      <ul className="editor__list">
        {topTags(profile).map(([tag, score]) => (
          <li key={tag} className="editor__row">
            <span className="editor__tag">#{tag}</span>
            <button type="button" className="icon-btn icon-btn--sm" aria-label={`Diminuer ${tag}`} onClick={() => proAdjustTag(profile.id, tag, -STEP)} data-testid={`dec-${tag}`}>
              −
            </button>
            <span className="editor__score" data-testid={`pro-score-${tag}`}>
              {score}
            </span>
            <button type="button" className="icon-btn icon-btn--sm" aria-label={`Augmenter ${tag}`} onClick={() => proAdjustTag(profile.id, tag, STEP)} data-testid={`inc-${tag}`}>
              +
            </button>
            <button type="button" className="icon-btn icon-btn--sm icon-btn--danger" aria-label={`Supprimer ${tag}`} onClick={() => proRemoveTag(profile.id, tag)} data-testid={`remove-${tag}`}>
              ✕
            </button>
          </li>
        ))}
      </ul>
      {available.length > 0 && (
        <div className="editor__add">
          <label htmlFor="add-tag" className="sr-only">
            Ajouter un tag
          </label>
          <select id="add-tag" value={toAdd} onChange={(e) => setToAdd(e.target.value)} data-testid="add-tag-select">
            <option value="">Ajouter un tag…</option>
            {available.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="btn btn--primary btn--sm"
            disabled={!toAdd}
            onClick={() => {
              proAddTag(profile.id, toAdd);
              setToAdd('');
            }}
            data-testid="add-tag-btn"
          >
            Ajouter (+10)
          </button>
        </div>
      )}
    </div>
  );
}

function YouthPanel({ profile, onClose }: { profile: YouthProfile; onClose: () => void }) {
  const previewYouth = useStore((s) => s.previewYouth);
  const navigate = useNavigate();
  const starred = profile.starredVideoIds.map(getVideoById).filter((v) => v !== undefined);

  return (
    <aside className="panel glass" aria-label={`Orientation de ${profile.name}`} data-testid="youth-panel">
      <header className="panel__head">
        <div>
          <h2 className="display">{profile.name}</h2>
          <p className="muted small">
            {profile.age} ans · {profile.hasBilan ? profile.rdvRef : 'Sans bilan (compte créé sur l’app)'}
          </p>
        </div>
        <button type="button" className="icon-btn" onClick={onClose} aria-label="Fermer">
          ✕
        </button>
      </header>
      <RgpdBadge />
      <section>
        <h3 className="card__title">Radar RIASEC</h3>
        <RadarChart profile={profile} size={240} />
      </section>
      <section>
        <h3 className="card__title">Réorientation par tags</h3>
        <TagEditor profile={profile} />
      </section>
      <section>
        <h3 className="card__title">Évolution des tags</h3>
        <TagBars scores={topTags(profile)} limit={8} />
      </section>
      <section>
        <h3 className="card__title">Documents · Rapport des Possibles (PDF)</h3>
        <DocumentsSection profile={profile} />
      </section>
      <section>
        <h3 className="card__title">Dernières vidéos étoilées</h3>
        {starred.length ? (
          <ul className="chips">
            {starred.slice(-5).reverse().map((v) => (
              <li key={v.id}>
                {v.icon} {v.title}
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted small">Aucune étoile pour l’instant.</p>
        )}
      </section>
      <button
        type="button"
        className="btn btn--glass btn--block"
        onClick={() => {
          previewYouth(profile.id);
          navigate('/app');
        }}
        data-testid="open-youth-app"
      >
        Voir le feed de {profile.name} →
      </button>
    </aside>
  );
}

export function Pro() {
  const session = useStore((s) => s.session);
  const profiles = useStore((s) => s.profiles);
  const resetDemo = useStore((s) => s.resetDemo);
  const logout = useStore((s) => s.logout);
  const account = useCurrentAccount();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string | null>(null);

  if (session?.role !== 'pro') return <AuthModal />;
  const counselor = account?.displayName ?? COUNSELOR;

  const q = query.trim().toLocaleLowerCase('fr');
  const list = Object.values(profiles).filter((p) => !q || p.name.toLocaleLowerCase('fr').includes(q));
  const current = selected ? profiles[selected] : undefined;

  return (
    <div className="pro" data-testid="pro">
      <nav className="pro__side glass" aria-label="Navigation Pro">
        <Logo />
        <ul>
          <li>
            <span className="pro__nav is-active">👥 Jeunes suivis</span>
          </li>
          <li>
            <Link to="/" className="pro__nav">
              🏠 Accueil
            </Link>
          </li>
          <li>
            <Link to="/app" className="pro__nav">
              📱 Application jeune
            </Link>
          </li>
        </ul>
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          onClick={() => {
            logout();
            navigate('/');
          }}
          data-testid="pro-logout"
        >
          Se déconnecter
        </button>
        <button type="button" className="btn btn--ghost btn--sm" onClick={resetDemo} data-testid="reset-demo">
          ↺ Réinitialiser la démo
        </button>
      </nav>

      <main className="pro__main">
        <header className="pro__header">
          <div>
            <p className="eyebrow">Tableau de bord</p>
            <h1 className="display">Bonjour {counselor}</h1>
          </div>
          <label className="search">
            <span className="sr-only">Rechercher un jeune par prénom</span>
            <input
              type="search"
              value={query}
              maxLength={30}
              autoComplete="off"
              placeholder="Rechercher un prénom…"
              onChange={(e) => setQuery(e.target.value)}
              data-testid="pro-search"
            />
          </label>
        </header>

        <RgpdBadge />

        <div className="table-wrap glass">
          <table className="table" data-testid="youth-table">
            <thead>
              <tr>
                <th scope="col">Prénom &amp; âge</th>
                <th scope="col">RIASEC dominant</th>
                <th scope="col">Top 3 tags</th>
                <th scope="col">
                  <StarIcon size={14} className="accent-star" /> Étoilées
                </th>
                <th scope="col">📄 Docs</th>
                <th scope="col">Dernière activité</th>
                <th scope="col">
                  <span className="sr-only">Action</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {list.map((p) => (
                <tr key={p.id} data-testid={`row-${p.id}`}>
                  <td>
                    <strong>{p.name}</strong>
                    <span className="muted"> · {p.age} ans</span>
                    {!p.hasBilan && <span className="badge-new">Nouveau</span>}
                  </td>
                  <td>
                    {dominant(p)} <span className="muted">({p.riasec[dominant(p)]})</span>
                  </td>
                  <td className="table__tags">
                    {topTags(p, 3).map(([t]) => (
                      <TagBadge key={t} tag={t} />
                    ))}
                  </td>
                  <td>{p.starredVideoIds.length}</td>
                  <td>{p.documents.length}</td>
                  <td className="muted">{lastActivity(p)}</td>
                  <td>
                    <button type="button" className="btn btn--primary btn--sm" onClick={() => setSelected(p.id)} data-testid={`manage-${p.id}`}>
                      Gérer l’orientation
                    </button>
                  </td>
                </tr>
              ))}
              {list.length === 0 && (
                <tr>
                  <td colSpan={7} className="muted">
                    Aucun jeune ne correspond.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>

      {current && <YouthPanel profile={current} onClose={() => setSelected(null)} />}
    </div>
  );
}
