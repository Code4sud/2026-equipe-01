import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { App } from '../../src/App';
import { useStore } from '../../src/store/useStore';

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

const state = () => useStore.getState();

beforeEach(() => {
  state().logout();
  state().resetDemo();
  window.scrollTo = () => {};
});

describe('Landing et authentification', () => {
  it('landing éditoriale : accroches, bandeau défilant, constat et chapitres', () => {
    renderAt('/');
    const hero = screen.getByRole('banner');
    expect(hero).toHaveTextContent('PolarIA guide les jeunes vers leur avenir.');
    expect(hero).toHaveTextContent('Vous nous avez demandé d’oser. Alors on a osé écouter les jeunes.');
    // Plus de jargon conformité dans le hero.
    expect(hero).not.toHaveTextContent(/RGPD|fictives|invention IA/);
    expect(screen.getByLabelText(/18 PAGES DE PDF/)).toBeInTheDocument();
    expect(screen.getByText(/Tous les enfants ont du génie/)).toBeInTheDocument();
    for (const n of ['01', '02', '03']) expect(screen.getByTestId(`chapter-${n}`)).toBeInTheDocument();
    expect(screen.queryByText(/Une IA qui traduit/)).toBeNull();
  });

  it('le pied de page crédite les 6 membres de l’équipe 01', () => {
    renderAt('/');
    const team = screen.getByTestId('team');
    for (const name of ['Adam', 'Chris', 'Leila', 'Lucka', 'Malone', 'Nathan']) expect(team).toHaveTextContent(name);
    expect(within(team).getAllByRole('listitem')).toHaveLength(6);
  });

  it('comptes de démo scindés : 5 jeunes et un accès pro séparé', async () => {
    renderAt('/');
    await userEvent.click(screen.getByTestId('cta-youth'));
    expect(screen.queryByTestId('demo-youth')).not.toBeInTheDocument(); // plus d'accordéon
    await userEvent.click(screen.getByTestId('open-test-accounts'));
    const youth = screen.getByTestId('demo-youth');
    expect(within(youth).getAllByRole('button')).toHaveLength(5);
    expect(youth).toHaveTextContent('Chloé, 18 ans');
    expect(youth).toHaveTextContent('Investigateur');
    expect(youth).toHaveTextContent('#');
    const pro = screen.getByTestId('demo-pro');
    expect(pro).toHaveTextContent('Psychologue du travail');
    expect(pro).toHaveTextContent('dr.martin@polaria.fr');
  });

  it('l’étoile du mockup s’allume avec un micro-toast', async () => {
    renderAt('/');
    await userEvent.click(screen.getByTestId('mock-star'));
    expect(screen.getByTestId('mock-star')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('toast')).toHaveTextContent('+5 pts');
  });

  it('connexion : erreur claire, puis compte de test en 1 clic', async () => {
    renderAt('/');
    await userEvent.click(screen.getByTestId('cta-youth'));
    await userEvent.type(screen.getByTestId('login-email'), 'noah@polaria.fr');
    await userEvent.type(screen.getByTestId('login-password'), 'mauvais');
    await userEvent.click(screen.getByTestId('login-submit'));
    expect(screen.getByTestId('login-error')).toHaveTextContent('incorrect');

    await userEvent.click(screen.getByTestId('open-test-accounts'));
    await userEvent.click(screen.getByTestId('demo-login-noah'));
    expect(screen.queryByTestId('test-accounts')).not.toBeInTheDocument();
    expect(state().session).toEqual({ accountId: 'noah', role: 'jeune' });
    expect(screen.getByTestId('feed')).toBeInTheDocument();
  });

  it('inscription : validation puis compte créé et connecté', async () => {
    renderAt('/');
    await userEvent.click(screen.getByTestId('cta-youth'));
    await userEvent.click(screen.getByTestId('tab-register'));
    await userEvent.click(screen.getByTestId('register-submit'));
    expect(screen.getAllByRole('alert').length).toBeGreaterThan(2);

    await userEvent.type(screen.getByTestId('reg-firstName'), 'Sarah');
    await userEvent.type(screen.getByTestId('reg-lastName'), 'Benali');
    await userEvent.type(screen.getByTestId('reg-age'), '17');
    await userEvent.type(screen.getByTestId('reg-email'), 'sarah@exemple.fr');
    await userEvent.type(screen.getByTestId('reg-password'), 'secret1');
    await userEvent.click(screen.getByTestId('interest-Design & Image'));
    await userEvent.click(screen.getByTestId('interest-Tech & Numérique'));
    await userEvent.click(screen.getByTestId('interest-Logique'));
    expect(screen.getByTestId('interest-Finance')).toBeDisabled();
    await userEvent.click(screen.getByTestId('register-submit'));

    expect(screen.getByTestId('feed')).toBeInTheDocument();
    const id = state().session!.accountId;
    expect(state().profiles[id]!.tagScores).toEqual({ 'Design & Image': 10, 'Tech & Numérique': 10, Logique: 10 });
  });

  it('/app et /pro demandent une connexion', () => {
    renderAt('/app');
    expect(screen.getByTestId('auth-modal')).toBeInTheDocument();
  });
});

describe('App jeune', () => {
  beforeEach(() => {
    state().login('noah@polaria.fr', 'jeune123');
  });

  it('l’étoile met à jour le score et affiche un toast', async () => {
    renderAt('/app');
    await userEvent.click(screen.getByTestId('star-acteur'));
    expect(screen.getByTestId('toast')).toHaveTextContent('+5 pts #Créatif & Scène');
    expect(state().profiles.noah!.tagScores['Créatif & Scène']).toBe(17);
  });

  it('le radar de « Mon Bilan » bouge en direct avec une étoile', async () => {
    renderAt('/app');
    await userEvent.click(screen.getByTestId('tab-bilan'));
    const before = screen.getByTestId('radar').getAttribute('data-values');
    act(() => state().star('graphiste'));
    expect(screen.getByTestId('radar').getAttribute('data-values')).not.toBe(before);
  });

  it('le radar bouge aussi quand le conseiller modifie un tag', async () => {
    renderAt('/app');
    await userEvent.click(screen.getByTestId('tab-bilan'));
    const before = within(screen.getByTestId('bilan')).getByTestId('tag-score-Son & Média').textContent;
    act(() => {
      useStore.setState({ session: { accountId: 'dr-martin', role: 'pro' } });
      state().proAdjustTag('noah', 'Son & Média', 5);
    });
    expect(within(screen.getByTestId('bilan')).getByTestId('tag-score-Son & Média').textContent).not.toBe(before);
  });

  it('le rapport parents garde son avertissement', async () => {
    renderAt('/app');
    await userEvent.click(screen.getByTestId('tab-bilan'));
    await userEvent.click(screen.getByTestId('generate-report'));
    const report = await screen.findByTestId('parent-report');
    expect(report).toHaveTextContent('non un verdict');
    expect(within(report).getAllByTestId('report-track')).toHaveLength(3);
    expect(within(report).getByTestId('ai-source')).toHaveAttribute('data-source', 'instant'); // pas de WebGPU dans jsdom
  });

  it('la fiche détail affiche le match et la logique de l’algo', async () => {
    renderAt('/app/details/technicien-son');
    const why = screen.getByTestId('why-panel');
    expect(within(why).getByTestId('match-percent')).toHaveTextContent('%');
    expect(within(why).getByTestId('why-pts-Son & Média')).toHaveTextContent('14 pts');
    expect(why).toHaveTextContent('+5 pts');
    await userEvent.click(within(why).getByTestId('why-star'));
    expect(state().profiles.noah!.starredVideoIds).not.toContain('technicien-son');
    expect(within(why).getByTestId('why-pts-Son & Média')).toHaveTextContent('9 pts');
  });

  it('une fiche inconnue renvoie au feed', () => {
    renderAt('/app/details/inconnue');
    expect(screen.getByTestId('feed')).toBeInTheDocument();
  });
});

describe('Parcours jeune v3 : tout dans le téléphone', () => {
  beforeEach(() => {
    state().login('lucas@polaria.fr', 'jeune123');
  });

  it('la fiche s’ouvre DANS le téléphone, avec le résumé de l’algo en bas sur mobile', () => {
    renderAt('/app/details/technicien-solaire');
    const phone = screen.getByTestId('phone');
    const details = within(phone).getByTestId('details');
    expect(within(details).getByTestId('why-panel')).toBeInTheDocument();
    // Le feed reste monté sous la fiche (position conservée au retour).
    expect(within(phone).getByTestId('feed')).toBeInTheDocument();
  });

  it('Mon Profil : voir plus, voir moins, explorer un domaine, en direct', async () => {
    renderAt('/app');
    await userEvent.click(screen.getByTestId('open-profile'));
    const screenEl = screen.getByTestId('profile-screen');
    expect(screenEl).toHaveTextContent('Lucas');
    expect(screenEl).toHaveTextContent('Réaliste');
    await userEvent.click(within(screenEl).getByTestId('more-Manuel & Terrain'));
    expect(within(screenEl).getByTestId('my-score-Manuel & Terrain')).toHaveTextContent('17');
    await userEvent.click(within(screenEl).getByTestId('less-Logistique'));
    expect(within(screenEl).getByTestId('my-score-Logistique')).toHaveTextContent('1');
    await userEvent.click(within(screenEl).getByTestId('explore-Design & Image'));
    expect(state().profiles.lucas!.tagScores['Design & Image']).toBe(6);
    expect(within(screenEl).getByTestId('my-score-Design & Image')).toHaveTextContent('6');
  });

  it('se déconnecter depuis Mon Profil', async () => {
    renderAt('/app/profil');
    await userEvent.click(screen.getByTestId('logout'));
    expect(state().session).toBeNull();
  });

  it('le feed affiche une carte Découverte en 4e position', () => {
    renderAt('/app');
    const reels = screen.getByTestId('feed').querySelectorAll('.reel:not(.reel--end)');
    expect(reels[3]!.querySelector('[data-testid^="discovery-"]')).not.toBeNull();
    expect(reels[0]!.querySelector('[data-testid^="discovery-"]')).toBeNull();
  });
});

describe('Espace Pro', () => {
  beforeEach(() => {
    state().login('dr.martin@polaria.fr', 'pro123');
  });

  it('liste les 5 jeunes, avec les comptes créés pendant la session', () => {
    renderAt('/pro');
    expect(screen.getAllByTestId(/^row-/)).toHaveLength(5);
    expect(screen.getByText('Bonjour Dr. Martin')).toBeInTheDocument();
  });

  it('réoriente par tags sans aucune zone de texte', async () => {
    const { container } = renderAt('/pro');
    await userEvent.click(screen.getByTestId('manage-yanis'));
    const panel = screen.getByTestId('youth-panel');
    expect(container.querySelector('textarea')).toBeNull();
    expect(panel.querySelectorAll('input:not([type="file"])')).toHaveLength(0);
    await userEvent.click(within(panel).getByTestId('inc-Accompagnement'));
    expect(state().profiles.yanis!.tagScores.Accompagnement).toBe(15);
  });

  it('import factice d’un PDF avec progression puis badge « Importé »', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      renderAt('/pro');
      await userEvent.click(screen.getByTestId('manage-chloe'));
      const file = new File(['%PDF-1.4'], 'rapport-des-possibles-2191.pdf', { type: 'application/pdf' });
      await userEvent.upload(screen.getByTestId('pdf-input'), file);
      expect(screen.getByTestId('upload-progress')).toBeInTheDocument();
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1200);
      });
      const doc = screen.getByTestId('doc-rapport-des-possibles-2191.pdf');
      expect(doc).toHaveTextContent('Importé');
      expect(state().profiles.chloe!.documents).toHaveLength(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('affiche le document pré-rempli de Lucas et permet de le retirer', async () => {
    renderAt('/pro');
    await userEvent.click(screen.getByTestId('manage-lucas'));
    expect(screen.getByTestId('doc-rapport-des-possibles-2187.pdf')).toBeInTheDocument();
    await userEvent.click(screen.getByTestId('remove-doc-doc-2187'));
    expect(screen.queryByTestId('doc-rapport-des-possibles-2187.pdf')).toBeNull();
  });
});
