import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Compass, FileText, Headphones, Minus, Plus, ShieldCheck, SlidersHorizontal } from 'lucide-react';
import { Logo, RadarChart, StarIcon, TagBadge, TagBars, Toast, useToast } from '../components/ui';
import { AuthModal, type AuthTab } from '../components/AuthModal';
import { SEED_PROFILES } from '../data/profiles';
import { topTags } from '../engine/signals';

const MARQUEE = [
  '18 PAGES DE PDF',
  'OUBLIÉ EN 7 JOURS',
  'TROP DE GRAPHIQUES',
  'PAS ASSEZ CONCRET',
  'L’ORIENTATION EN SCROLLANT',
  'UNE ÉTOILE POUR GUIDER',
];

const DEMO_PROFILE = SEED_PROFILES.find((p) => p.id === 'noah') ?? SEED_PROFILES[0]!;

function Constellation() {
  const stars = [
    [40, 60], [120, 30], [210, 80], [300, 40], [360, 130], [330, 230], [250, 300], [140, 330], [60, 260], [20, 160],
  ] as const;
  return (
    <svg className="constellation" viewBox="0 0 380 360" aria-hidden="true">
      <polyline points={stars.map(([x, y]) => `${x},${y}`).join(' ')} className="constellation__line" />
      {stars.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i % 3 === 0 ? 3 : 2} className="constellation__star" />
      ))}
    </svg>
  );
}

/** Mockup interactif : l'étoile s'allume et affiche le micro-toast, comme dans l'app. */
function PhoneMockup() {
  const [on, setOn] = useState(false);
  const { toast, show } = useToast();
  return (
    <div className="hero__visual">
      <Constellation />
      <div className="hero__cards" aria-hidden="true">
        <div className="float-card glass">
          <FileText size={16} /> Bilan Parents prêt
        </div>
        <div className="float-card glass">
          <SlidersHorizontal size={16} /> Boussole de tags
          <div className="float-card__bars">
            <span style={{ width: '82%' }} />
            <span style={{ width: '64%' }} />
            <span style={{ width: '41%' }} />
          </div>
        </div>
      </div>
      <div className="mock-phone">
        <div className="mock-phone__screen" style={{ background: 'linear-gradient(155deg, #1e1b4b 0%, #3730a3 44%, #6366f1 74%, #ec4899 108%)' }}>
          <div className="mock-phone__tabs" aria-hidden="true">
            <span className="is-active">Pour toi</span>
            <span>Mon Bilan</span>
          </div>
          <Headphones className="mock-phone__icon" size={64} strokeWidth={1.4} aria-hidden="true" />
          <div className="mock-phone__title">Technicien du son</div>
          <div className="mock-phone__tags">
            <TagBadge tag="Son & Média" tone="dark" />
            <TagBadge tag="Technique & Énergie" tone="dark" />
          </div>
          <button
            type="button"
            className={`mock-phone__star${on ? ' is-on' : ''}`}
            aria-pressed={on}
            aria-label="Essayer l’étoile"
            data-testid="mock-star"
            onClick={() => {
              setOn(!on);
              show(on ? '-5 pts #Son & Média' : '+5 pts #Son & Média');
            }}
          >
            <StarIcon size={26} />
          </button>
          <Toast toast={toast} />
        </div>
      </div>
    </div>
  );
}

function FeedPreview() {
  return (
    <div className="preview preview--feed" aria-hidden="true">
      <div className="preview__reel" style={{ background: 'linear-gradient(155deg, #312e81 0%, #7c3aed 40%, #e12d8b 80%, #fda4af 115%)' }}>
        <span className="badge-discovery">
          <Compass size={13} /> Découverte
        </span>
        <strong className="display">Graphiste</strong>
        <span className="mono small">Zone 3 · 1 à 4 ans</span>
      </div>
      <div className="preview__reel preview__reel--back" />
      <p className="preview__caption mono">3 affinités · 1 découverte</p>
    </div>
  );
}

function BilanPreview() {
  return (
    <div className="preview preview--bilan" aria-hidden="true">
      <RadarChart profile={DEMO_PROFILE} size={250} />
      <TagBars scores={topTags(DEMO_PROFILE)} limit={3} />
    </div>
  );
}

function ProPreview() {
  return (
    <div className="preview preview--pro" aria-hidden="true">
      <p className="preview__badge">
        <ShieldCheck size={14} /> Suivi par tags, sans notes médicales
      </p>
      {topTags(DEMO_PROFILE, 3).map(([tag, score]) => (
        <div key={tag} className="preview__row">
          <span>#{tag}</span>
          <span className="preview__ctrl">
            <Minus size={13} />
            <span className="mono">{score}</span>
            <Plus size={13} />
          </span>
        </div>
      ))}
      <div className="preview__row preview__row--doc">
        <FileText size={14} /> rapport-des-possibles.pdf <span className="badge-ok">Importé</span>
      </div>
    </div>
  );
}

const CHAPTERS = [
  {
    n: '01',
    who: 'Pour le jeune',
    title: 'Le Feed Étoilé',
    text: 'Un scroll vertical, des formats courts, et une étoile qui remplace le like. L’algorithme alterne ce qui te plaît déjà et des découvertes choisies pour t’ouvrir de nouvelles voies.',
    preview: <FeedPreview />,
  },
  {
    n: '02',
    who: 'Pour le jeune et ses parents',
    title: 'La Boussole & Mon Bilan',
    text: 'Transparence totale sur tes tags : tu vois pourquoi chaque fiche t’est proposée. Un onglet clair pour les parents, avec un radar qui bouge et des pistes rangées par durée d’études.',
    preview: <BilanPreview />,
  },
  {
    n: '03',
    who: 'Pour les pros',
    title: 'Le Suivi Conseiller',
    text: 'Entre deux rendez-vous, le psychologue voit ce qui attire vraiment le jeune et ajuste ses tags en un clic. Aucune note médicale n’est jamais stockée.',
    preview: <ProPreview />,
  },
];

export function Landing() {
  const [auth, setAuth] = useState<AuthTab | null>(null);
  const open = () => setAuth('login');

  return (
    <div className="landing">
      <nav className="navbar glass" aria-label="Navigation principale">
        <Logo />
        <div className="navbar__links">
          <a href="#constat" onClick={(e) => scrollTo(e, 'constat')}>Le constat</a>
          <a href="#solution" onClick={(e) => scrollTo(e, 'solution')}>La solution</a>
          <a href="#hackathon" onClick={(e) => scrollTo(e, 'hackathon')}>Le hackathon</a>
        </div>
        <div className="navbar__actions">
          <button type="button" className="btn btn--ghost btn--sm" onClick={open} data-testid="nav-pro">
            Espace Pro
          </button>
          <button type="button" className="btn btn--primary btn--sm" onClick={open} data-testid="nav-launch">
            Lancer l’app
          </button>
        </div>
      </nav>

      {/* Bande 1 : Hero clair */}
      <header className="band band--hero">
        <div className="band__inner hero">
          <div className="hero__text">
            <p className="overline mono">Centre des Possibles · Nice</p>
            <h1 className="hero__title display">
              <StarIcon size={56} className="hero__emblem" />
              <span>
                Polar<span className="logo__ia">IA</span>
              </span>
            </h1>
            <p className="hero__tagline">
              Dans un ciel de possibilités, <span className="text-gradient">PolarIA guide les jeunes vers leur avenir.</span>
            </p>
            <p className="hero__dare serif">Vous nous avez demandé d’oser. Alors on a osé écouter les jeunes.</p>
            <div className="hero__ctas">
              <button type="button" className="btn btn--primary btn--lg" onClick={open} data-testid="cta-youth">
                Je suis un jeune
              </button>
              <button type="button" className="btn btn--glass btn--lg" onClick={open} data-testid="cta-pro">
                Espace Pro &amp; Parents <ArrowRight size={18} aria-hidden="true" />
              </button>
            </div>
          </div>
          <PhoneMockup />
        </div>
      </header>

      {/* Bandeau défilant */}
      <div className="marquee" aria-label={MARQUEE.join(' · ')}>
        <div className="marquee__track mono" aria-hidden="true">
          {[0, 1].map((copy) => (
            <span key={copy} className="marquee__group">
              {MARQUEE.map((m) => (
                <span key={m} className="marquee__item">
                  {m}
                  <span className="marquee__dot">·</span>
                </span>
              ))}
            </span>
          ))}
        </div>
      </div>

      {/* Bande 2 : Le constat, fond nuit */}
      <section id="constat" className="band band--night">
        <div className="band__inner constat">
          <div className="constat__voices">
            <p className="overline mono overline--light">Le constat</p>
            <figure className="verbatim">
              <blockquote className="serif">
                « Je viens de passer une demi-journée à écouter des psys, j’ai zéro envie de me taper 18 pages de PDF en
                rentrant chez moi. »
              </blockquote>
              <figcaption className="mono">Lucas, 16 ans</figcaption>
            </figure>
            <figure className="verbatim verbatim--offset">
              <blockquote className="serif">
                « Les graphiques RIASEC c’est joli, mais concrètement je fais quoi lundi matin ? »
              </blockquote>
              <figcaption className="mono">Inès, 17 ans</figcaption>
            </figure>
          </div>
          <aside className="constat__field">
            <p className="overline mono">Regard terrain</p>
            <h2 className="display">Le Centre des Possibles</h2>
            <p>
              À Nice Méridia, les 16-25 ans vivent une demi-journée de jeux cognitifs, de réalité virtuelle et un entretien
              de 15 minutes avec un psychologue du travail.
            </p>
            <p>
              Le constat des conseillers : une semaine après la visite, le lien retombe et le rapport finit au fond d’un
              tiroir.
            </p>
            <figure className="field-quote">
              <blockquote className="serif">« Tous les enfants ont du génie, le tout est de le faire apparaître. »</blockquote>
              <figcaption className="mono">Charlie Chaplin</figcaption>
            </figure>
          </aside>
        </div>
      </section>

      {/* Bande 3 : La solution en chapitres */}
      <section id="solution" className="band band--paper">
        <div className="band__inner">
          <p className="overline mono">La solution</p>
          <h2 className="section__title display">Trois chapitres, un même fil.</h2>
          <div className="chapters">
            {CHAPTERS.map((c, i) => (
              <article key={c.n} className={`chapter${i % 2 ? ' chapter--reverse' : ''}`} data-testid={`chapter-${c.n}`}>
                <div className="chapter__text">
                  <span className="chapter__num mono">{c.n}</span>
                  <p className="chapter__who mono">{c.who}</p>
                  <h3 className="display">{c.title}</h3>
                  <p>{c.text}</p>
                </div>
                <div className="chapter__preview">{c.preview}</div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Bande 4 : Hackathon + footer */}
      <section id="hackathon" className="band band--light">
        <div className="band__inner hackathon">
          <div>
            <p className="overline mono">Code4Sud · Nice · 18-20 novembre 2026</p>
            <h2 className="display">Hackathon Azuréen #3</h2>
          </div>
          <p>
            « L’orientation et l’employabilité grâce à l’IA ». Sujet 1 : transformer un rapport en restitution personnelle,
            sans rien inventer. Code ouvert sous licence MIT.
          </p>
          <ul className="facts mono">
            <li>48 h</li>
            <li>Sujet 1</li>
            <li>Licence MIT</li>
          </ul>
        </div>
      </section>

      <footer className="band band--night footer">
        <div className="band__inner footer__grid">
          <div>
            <Logo light />
            <p className="small footer__muted">Dans un ciel de possibilités, PolarIA guide les jeunes vers leur avenir.</p>
          </div>
          <nav aria-label="Navigation du pied de page">
            <p className="footer__title">Produit</p>
            <a href="#constat" onClick={(e) => scrollTo(e, 'constat')}>Le constat</a>
            <a href="#solution" onClick={(e) => scrollTo(e, 'solution')}>La solution</a>
            <Link to="/app">Application</Link>
            <Link to="/pro">Espace Pro</Link>
          </nav>
          <nav aria-label="Liens externes">
            <p className="footer__title">Liens</p>
            <a href="https://centredespossibles.org" rel="noopener noreferrer" target="_blank">centredespossibles.org</a>
            <a href="https://code4sud.fr" rel="noopener noreferrer" target="_blank">code4sud.fr</a>
            <a href="https://github.com/Code4sud/2026-equipe-01" rel="noopener noreferrer" target="_blank">Code source</a>
          </nav>
        </div>
        <p className="band__inner small footer__muted">
          Démo de hackathon : personnages, citations et profils sont fictifs.
        </p>
      </footer>

      {auth && <AuthModal initialTab={auth} onClose={() => setAuth(null)} />}
    </div>
  );
}

function scrollTo(e: React.MouseEvent, id: string) {
  // Avec HashRouter, une ancre classique changerait de route : on scrolle à la main.
  e.preventDefault();
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
}
