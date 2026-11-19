import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { App } from './App';
import { enableCrossTabSync } from './store/useStore';
import { trackBannerHeight } from './lib/banner';
// Polices auto-hébergées : aucun appel à Google Fonts (RGPD, CSP plus stricte).
import '@fontsource-variable/inter';
import '@fontsource-variable/outfit';
import './styles/global.css';

enableCrossTabSync();
trackBannerHeight();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* HashRouter : GitHub Pages ne sait pas réécrire les URL vers index.html. */}
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>,
);
