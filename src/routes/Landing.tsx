import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Logo, StarIcon, TagBadge, Toast, useToast } from '../components/ui';
import { AuthModal, type AuthTab } from '../components/AuthModal';

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
      <div className="mock-phone">
        <div className="mock-phone__screen" style={{ background: 'linear-gradient(155deg, #1e1b4b 0%, #3730a3 44%, #6366f1 74%, #ec4899 108%)' }}>
          <div className="mock-phone__tabs" aria-hidden="true">
            <span className="is-active">Pour toi</span>
            <span>Mon Bilan</span>
          </div>
          <div className="mock-phone__icon" aria-hidden="true">
            🎧
          </div>
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
              show(on ? '✦ -5 pts #Son & Média' : '✦ +5 pts #Son & Média');
            }}
          >
            <StarIcon size={26} />
          </button>
          <Toast toast={toast} />
        </div>
      </div>
      <div className="float-card float-card--top glass" aria-hidden="true">
        <span className="float-card__dot" /> Bilan Parents prêt
      </div>
      <div className="float-card float-card--bottom glass" aria-hidden="true">
        <StarIcon size={14} className="accent-star" /> Boussole de tags
        <div className="float-card__bars">
          <span style={{ width: '82%' }} />
          <span style={{ width: '64%' }} />
          <span style={{ width: '41%' }} />
        </div>
      </div>
    </div>
  );
}

export function Landing() {
  const [auth, setAuth] = useState<AuthTab | null>(null);

  return (
    <div className="page landing">
      <nav className="navbar glass" aria-label="Navigation principale">
        <Logo />
        <div className="navbar__links">
          <a href="#constat" onClick={(e) => scrollTo(e, 'constat')}>Le constat</a>
          <a href="#solution" onClick={(e) => scrollTo(e, 'solution')}>La solution</a>
          <a href="#hackathon" onClick={(e) => scrollTo(e, 'hackathon')}>Le hackathon</a>
        </div>
        <div className="navbar__actions">
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => setAuth('login')} data-testid="nav-pro">
            Espace Pro
          </button>
          <button type="button" className="btn btn--primary btn--sm" onClick={() => setAuth('login')} data-testid="nav-launch">
            ✦ Lancer l’app
          </button>
        </div>
      </nav>

      <header className="hero">
        <div className="hero__text">
          <p className="badge-soft">✦ Inspiré de l’étoile du Centre des Possibles · Nice</p>
          <h1 className="hero__title display">
            <StarIcon size={56} className="hero__emblem" />
            <span>
              Polar<span className="logo__ia">IA</span>
            </span>
          </h1>
          <p className="hero__tagline">
            Dans un ciel de possibilités, <span className="text-gradient">PolarIA guide les jeunes vers leur avenir.</span>
          </p>
          <p className="hero__sub">
            Le prolongement du <em>Rapport des Possibles</em> : un feed vidéo sur-mesure pour le jeune, un bilan clair pour
            ses parents et un suivi par tags pour son conseiller.
          </p>
          <div className="hero__ctas">
            <button type="button" className="btn btn--primary btn--lg" onClick={() => setAuth('login')} data-testid="cta-youth">
              ✦ Je suis un jeune
            </button>
            <button type="button" className="btn btn--glass btn--lg" onClick={() => setAuth('login')} data-testid="cta-pro">
              Espace Pro &amp; Parents →
            </button>
          </div>
          <dl className="metrics">
            <div>
              <dt>45 sec</dt>
              <dd>pour un débrief à l’oral</dd>
            </div>
            <div>
              <dt>0 %</dt>
              <dd>d’invention IA</dd>
            </div>
            <div>
              <dt>100 %</dt>
              <dd>RGPD, données fictives</dd>
            </div>
          </dl>
        </div>
        <PhoneMockup />
      </header>

      <section id="constat" className="section">
        <h2 className="section__title display">Le constat</h2>
        <div className="duo">
          <article className="glass duo__card">
            <p className="eyebrow">Le défi</p>
            <div className="compare">
              <div>
                <span className="compare__big">18</span>
                <p>pages de PDF, radars et histogrammes, oubliées en 7 jours.</p>
              </div>
              <span className="compare__arrow" aria-hidden="true">→</span>
              <div className="compare__live">
                <span className="compare__big">1</span>
                <p>feed vivant qui parle comme toi et évolue avec tes envies.</p>
              </div>
            </div>
          </article>
          <article className="glass duo__card">
            <p className="eyebrow">Le partenaire</p>
            <h3 className="display">Le Centre des Possibles</h3>
            <p>
              À Nice Méridia, une demi-journée ludique pour les 16-25 ans : jeux cognitifs, questionnaires d’intérêts et de
              personnalité, réalité virtuelle et entretien avec un psychologue du travail.
            </p>
            <blockquote>
              « Vous ne trouverez jamais d’arc-en-ciel si vous regardez vers le bas. »<cite>Charlie Chaplin</cite>
            </blockquote>
            <ul className="partners">
              <li>Métropole Nice Côte d’Azur</li>
              <li>Université Côte d’Azur</li>
              <li>Académie de Nice</li>
            </ul>
          </article>
        </div>
      </section>

      <section id="solution" className="section">
        <h2 className="section__title display">La solution</h2>
        <div className="cards3">
          <article className="feature glass">
            <span className="feature__icon">✦</span>
            <h3 className="display">Feed Étoilé Jeune</h3>
            <p>Des fiches métiers façon Reels. Une étoile, un swipe : l’algo apprend ce qui t’attire.</p>
          </article>
          <article className="feature glass">
            <span className="feature__icon">📘</span>
            <h3 className="display">Bilan de Réassurance Parents</h3>
            <p>Radar RIASEC vivant, tags explorés et pistes par durée d’études, imprimables en un clic.</p>
          </article>
          <article className="feature glass">
            <span className="feature__icon">🧭</span>
            <h3 className="display">Dashboard par Tags Pro</h3>
            <p>Le conseiller réoriente le feed avec des tags et des poids. Aucune note libre, aucune donnée médicale.</p>
          </article>
        </div>
        <p className="banner-ai">
          <StarIcon size={18} /> Une IA qui traduit, jamais une IA qui invente
        </p>
      </section>

      <section id="hackathon" className="section">
        <div className="dark-card">
          <p className="eyebrow eyebrow--light">Code4Sud · 18-20 novembre 2026 · Nice</p>
          <h2 className="display">Hackathon Azuréen #3</h2>
          <p>« L’orientation et l’employabilité grâce à l’IA ». Sujet 1 : transformer un rapport en restitution personnelle, sans rien inventer.</p>
          <ul className="pills">
            <li>48 h</li>
            <li>Sujet 1</li>
            <li>Licence MIT</li>
            <li>Open source</li>
          </ul>
        </div>
      </section>

      <footer className="footer">
        <div className="footer__grid">
          <div>
            <Logo />
            <p className="muted small">Dans un ciel de possibilités, PolarIA guide les jeunes vers leur avenir.</p>
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
            <a href="https://github.com/Code4sud/2026-equipe-01" rel="noopener noreferrer" target="_blank">Code source (MIT)</a>
          </nav>
        </div>
        <p className="muted small">
          Toutes les données affichées sont fictives. Aucune donnée médicale n’est collectée ; la démo fonctionne dans votre
          navigateur, sans serveur.
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
