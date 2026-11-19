import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
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

beforeEach(() => {
  useStore.getState().resetDemo();
  window.scrollTo = () => {};
});

describe('Landing', () => {
  it('ouvre le sélecteur de profils fictifs et connecte un jeune', async () => {
    renderAt('/');
    await userEvent.click(screen.getByTestId('cta-youth'));
    await userEvent.click(screen.getByTestId('pick-emma'));
    expect(useStore.getState().session).toBe('jeune');
    expect(useStore.getState().currentYouthId).toBe('emma');
    expect(screen.getByTestId('feed')).toBeInTheDocument();
  });
});

describe('App jeune', () => {
  beforeEach(() => useStore.getState().loginYouth('lucas'));

  it('l’étoile met à jour le score et affiche un toast', async () => {
    renderAt('/app');
    await userEvent.click(screen.getByTestId('star-technicien-son'));
    expect(screen.getByTestId('toast')).toHaveTextContent('✦ +5 pts #Son & Média');
    expect(useStore.getState().profiles.lucas!.tagScores['Son & Média']).toBe(17);
    expect(screen.getByTestId('star-technicien-son')).toHaveAttribute('aria-pressed', 'true');
  });

  it('le débrief affiche des sous-titres issus du profil', async () => {
    renderAt('/app');
    await userEvent.click(screen.getByTestId('open-debrief'));
    expect(screen.getByTestId('debrief-line')).toHaveTextContent('Salut Lucas');
    await userEvent.click(screen.getByTestId('close-debrief'));
    expect(screen.queryByTestId('debrief')).not.toBeInTheDocument();
  });

  it('l’onglet Mon Bilan génère le rapport parents avec son avertissement', async () => {
    renderAt('/app');
    await userEvent.click(screen.getByTestId('tab-bilan'));
    expect(screen.getByTestId('radar')).toBeInTheDocument();
    await userEvent.click(screen.getByTestId('generate-report'));
    const report = screen.getByTestId('parent-report');
    expect(report).toHaveTextContent('Points forts observés');
    expect(report).toHaveTextContent('non une évaluation définitive');
  });

  it('la fiche détail affiche les blocs attendus', () => {
    renderAt('/app/details/acteur');
    const details = screen.getByTestId('details');
    for (const t of ['C’est quoi au quotidien ?', 'Formations & écoles possibles', 'Évolutions possibles']) {
      expect(within(details).getByText(t)).toBeInTheDocument();
    }
    expect(details).toHaveTextContent('Zone 3 · Accessible en 1 à 4 ans');
  });

  it('une fiche inconnue renvoie au feed', () => {
    renderAt('/app/details/inconnue');
    expect(screen.getByTestId('feed')).toBeInTheDocument();
  });
});

describe('Espace Pro', () => {
  it('demande la connexion simulée', async () => {
    renderAt('/pro');
    await userEvent.click(screen.getByTestId('pro-login'));
    expect(screen.getByTestId('youth-table')).toBeInTheDocument();
  });

  it('liste les jeunes et filtre par prénom', async () => {
    useStore.getState().loginPro();
    renderAt('/pro');
    expect(screen.getAllByTestId(/^row-/)).toHaveLength(3);
    await userEvent.type(screen.getByTestId('pro-search'), 'emm');
    expect(screen.getAllByTestId(/^row-/)).toHaveLength(1);
  });

  it('réoriente par tags sans aucun champ texte', async () => {
    useStore.getState().loginPro();
    const { container } = renderAt('/pro');
    await userEvent.click(screen.getByTestId('manage-yanis'));
    const panel = screen.getByTestId('youth-panel');
    expect(within(panel).getByTestId('rgpd-badge')).toBeInTheDocument();
    expect(container.querySelector('textarea')).toBeNull();
    expect(panel.querySelector('input')).toBeNull();

    await userEvent.click(within(panel).getByTestId('inc-Logistique'));
    expect(useStore.getState().profiles.yanis!.tagScores.Logistique).toBe(10);
    await userEvent.click(within(panel).getByTestId('remove-Logistique'));
    expect(useStore.getState().profiles.yanis!.tagScores).not.toHaveProperty('Logistique');

    await userEvent.selectOptions(within(panel).getByTestId('add-tag-select'), 'Finance');
    await userEvent.click(within(panel).getByTestId('add-tag-btn'));
    expect(useStore.getState().profiles.yanis!.tagScores.Finance).toBe(10);
  });
});
