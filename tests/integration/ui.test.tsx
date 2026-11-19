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
  it('affiche la nouvelle accroche et les métriques', () => {
    renderAt('/');
    expect(screen.getByRole('banner')).toHaveTextContent('PolarIA guide les jeunes vers leur avenir.');
    for (const m of ['45 sec', '0 %', '100 %']) expect(screen.getByText(m)).toBeInTheDocument();
  });

  it('l’étoile du mockup s’allume avec un micro-toast', async () => {
    renderAt('/');
    await userEvent.click(screen.getByTestId('mock-star'));
    expect(screen.getByTestId('mock-star')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('toast')).toHaveTextContent('+5 pts');
  });

  it('connexion : erreur claire puis succès via « Remplir »', async () => {
    renderAt('/');
    await userEvent.click(screen.getByTestId('cta-youth'));
    await userEvent.type(screen.getByTestId('login-email'), 'noah@polaria.fr');
    await userEvent.type(screen.getByTestId('login-password'), 'mauvais');
    await userEvent.click(screen.getByTestId('login-submit'));
    expect(screen.getByTestId('login-error')).toHaveTextContent('incorrect');

    await userEvent.click(screen.getByText(/Comptes de démo/));
    await userEvent.click(screen.getByTestId('fill-noah'));
    await userEvent.click(screen.getByTestId('login-submit'));
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
    expect(screen.getByTestId('toast')).toHaveTextContent('✦ +5 pts #Créatif & Scène');
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
    expect(screen.getByTestId('parent-report')).toHaveTextContent('non une évaluation définitive');
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
