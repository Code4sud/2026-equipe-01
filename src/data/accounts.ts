import type { Account } from '../domain/types';

/**
 * Comptes de DÉMONSTRATION, volontairement publics : ils sont affichés dans
 * l'encart « Comptes de démo » de la connexion pour le jury. Il n'y a ni
 * serveur ni vraie authentification ; ne jamais réutiliser ce modèle en prod.
 */
export const DEMO_PASSWORD_YOUTH = 'jeune123';
export const DEMO_PASSWORD_PRO = 'pro123';

export const PRO_ACCOUNT_ID = 'dr-martin';

/** Dominante affichée dans l'encart « Comptes de démo » (profils fictifs). */
export const DEMO_PERSONAS: Record<string, string> = {
  lucas: 'Réaliste / Terrain',
  ines: 'Entreprenant / Social',
  noah: 'Artistique / Créatif',
  chloe: 'Investigateur / Logique',
  yanis: 'Social / Soin',
};

export const SEED_ACCOUNTS: Account[] = [
  { id: PRO_ACCOUNT_ID, email: 'dr.martin@polaria.fr', password: DEMO_PASSWORD_PRO, role: 'pro', displayName: 'Dr. Martin' },
  { id: 'lucas', email: 'lucas@polaria.fr', password: DEMO_PASSWORD_YOUTH, role: 'jeune', displayName: 'Lucas' },
  { id: 'ines', email: 'ines@polaria.fr', password: DEMO_PASSWORD_YOUTH, role: 'jeune', displayName: 'Inès' },
  { id: 'noah', email: 'noah@polaria.fr', password: DEMO_PASSWORD_YOUTH, role: 'jeune', displayName: 'Noah' },
  { id: 'chloe', email: 'chloe@polaria.fr', password: DEMO_PASSWORD_YOUTH, role: 'jeune', displayName: 'Chloé' },
  { id: 'yanis', email: 'yanis@polaria.fr', password: DEMO_PASSWORD_YOUTH, role: 'jeune', displayName: 'Yanis' },
];
