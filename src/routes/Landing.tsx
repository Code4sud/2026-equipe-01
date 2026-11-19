import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Logo, StarIcon, TagBadge } from '../components/ui';
import { ProfilePicker } from '../components/ProfilePicker';
import { useStore } from '../store/useStore';

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

function PhoneMockup() {
  return (
    <div className="hero__visual" aria-hidden="true">
      <Constellation />
      <div className="mock-phone">
        <div className="mock-phone__screen" style={{ background: 'linear-gradient(155deg, #1e1b4b 0%, #3730a3 44%, #6366f1 74%, #ec4899 108%)' }}>
          <div className="mock-phone__tabs">
            <span className="is-active">Pour toi</span>
            <span>Mon Bilan</span>
          </div>
          <div className="mock-phone__icon">🎧</div>
          <div className="mock-phone__title">Technicien du son</div>
          <div className="mock-phone__tags">
            <TagBadge tag="Son & Média" tone="dark" />
            <TagBadge tag="Technique" tone="dark" />
          </div>
          <div className="mock-phone__star">
            <StarIcon size={26} />
          </div>
        </div>
      </div>
      <div className="float-card float-card--top glass">
        <span className="float-card__dot" /> Bilan Parents prêt
      </div>
      <div className="float-card float-card--bottom glass">
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
  const [picker, setPicker] = useState(false);
  const loginPro = useStore((s) => s.loginPro);
  const navigate = useNavigate();
  const goPro = () => {
    loginPro();
    navigate('/pro');
  };

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
          <button type="button" className="btn btn--ghost btn--sm" onClick={goPro}>
            Espace Pro
          </button>
          <button type="button" className="btn btn--primary btn--sm" onClick={() => setPicker(true)} data-testid="nav-launch">
            ✦ Lancer l’app
          </button>
        </div>
      </nav>

      <header className="hero">
        <div className="hero__text">
          <p className="eyebrow">Hackathon Azuréen #3 · Centre des Possibles</p>
          <h1 className="hero__title display">
            <StarIcon size={56} className="hero__emblem" />
            <span>
              Polar<span className="logo__ia">IA</span>
            </span>
          </h1>
          <p className="hero__tagline">
            L’étoile qui guide ton avenir, sans jamais te perdre dans 18 pages de graphiques.
          </p>
          <div className="hero__ctas">
            <button type="button" className="btn btn--primary btn--lg" onClick={() => setPicker(true)} data-testid="cta-youth">
              ✦ Je suis un jeune
            </button>
            <button type="button" className="btn btn--glass btn--lg" onClick={goPro} data-testid="cta-pro">
              Espace Pro &amp; Parents →
            </button>
          </div>
          <p className="muted small">Démo sans compte, données 100 % fictives.</p>
        </div>
        <PhoneMockup />
      </header>

      <section id="constat" className="section">
        <h2 className="section__title display">Le constat</h2>
        <div className="compare">
          <div className="compare__card glass">
            <span className="compare__big">18</span>
            <p>pages de PDF, radars et histogrammes… oubliées en 7 jours.</p>
          </div>
          <span className="compare__arrow" aria-hidden="true">→</span>
          <div className="compare__card compare__card--live">
            <span className="compare__big">1</span>
            <p>feed vivant qui parle comme toi et évolue avec tes envies.</p>
          </div>
        </div>
        <div className="partner glass">
          <div>
            <h3 className="display">Le Centre des Possibles</h3>
            <p>
              À Nice Méridia, porté par la Métropole Nice Côte d’Azur, l’Université Côte d’Azur et l’Académie de Nice : une
              demi-journée ludique pour les 16-25 ans (jeux cognitifs, questionnaires, réalité virtuelle, entretien avec un
              psychologue du travail).
            </p>
          </div>
          <blockquote>
            « Vous ne trouverez jamais d’arc-en-ciel si vous regardez vers le bas. »<cite>Charlie Chaplin</cite>
          </blockquote>
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
            <p>Radar RIASEC, tags explorés et pistes par durée d’études, imprimables en un clic.</p>
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
        <Logo />
        <nav aria-label="Liens utiles">
          <Link to="/app">Application</Link>
          <Link to="/pro">Espace Pro</Link>
          <a href="https://github.com/Code4sud/2026-equipe-01" rel="noopener noreferrer" target="_blank">
            Code source
          </a>
        </nav>
        <p className="muted small">
          Toutes les données affichées sont fictives. Aucune donnée personnelle ni médicale n’est collectée : tout reste dans
          votre navigateur (localStorage).
        </p>
      </footer>

      {picker && <ProfilePicker onClose={() => setPicker(false)} />}
    </div>
  );
}

function scrollTo(e: React.MouseEvent, id: string) {
  // Avec HashRouter, une ancre classique changerait de route : on scrolle à la main.
  e.preventDefault();
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
}
