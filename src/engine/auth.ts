import type { Account, YouthProfile } from '../domain/types';
import { isKnownTag } from '../data/tags';
import { estimateRiasec } from './riasec';
import { PRO_NEW_TAG_POINTS } from './signals';

/**
 * Authentification de DÉMONSTRATION, 100 % côté navigateur : les comptes et
 * mots de passe sont factices. Un vrai produit exigerait un serveur, des mots
 * de passe hachés et une limitation des tentatives.
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function authenticate(accounts: readonly Account[], email: string, password: string): Account | null {
  const e = normalizeEmail(email);
  if (!e || !password) return null;
  return accounts.find((a) => a.email === e && a.password === password) ?? null;
}

export interface RegistrationInput {
  firstName: string;
  lastName: string;
  age: string;
  email: string;
  password: string;
  interests: string[];
}

export interface Registration {
  firstName: string;
  lastInitial: string;
  age: number;
  email: string;
  password: string;
  interests: string[];
}

export type RegistrationErrors = Partial<Record<keyof RegistrationInput, string>>;

export type RegistrationResult = { ok: true; value: Registration } | { ok: false; errors: RegistrationErrors };

export const MIN_AGE = 16;
export const MAX_AGE = 25;
const NAME_RE = /^\p{L}[\p{L}' -]{0,39}$/u;
const EMAIL_RE = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]{2,}$/;

export function validateRegistration(input: RegistrationInput, existingEmails: readonly string[]): RegistrationResult {
  const errors: RegistrationErrors = {};
  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  const email = normalizeEmail(input.email);
  const age = Number(input.age);
  const interests = [...new Set(input.interests)];

  if (!NAME_RE.test(firstName)) errors.firstName = 'Prénom : lettres uniquement, 40 caractères maximum.';
  if (!NAME_RE.test(lastName)) errors.lastName = 'Nom : lettres uniquement, 40 caractères maximum.';
  if (!Number.isInteger(age) || age < MIN_AGE || age > MAX_AGE) errors.age = `Âge entre ${MIN_AGE} et ${MAX_AGE} ans.`;
  if (email.length > 80 || !EMAIL_RE.test(email)) errors.email = 'Adresse email invalide.';
  else if (existingEmails.some((e) => normalizeEmail(e) === email)) errors.email = 'Un compte existe déjà avec cet email.';
  if (input.password.length < 6 || input.password.length > 64) errors.password = 'Mot de passe : 6 caractères minimum.';
  if (interests.length < 2 || interests.length > 3 || !interests.every(isKnownTag)) {
    errors.interests = 'Choisis 2 ou 3 centres d’intérêt.';
  }

  if (Object.keys(errors).length) return { ok: false, errors };
  return {
    ok: true,
    value: { firstName, lastInitial: lastName.charAt(0).toUpperCase(), age, email, password: input.password, interests },
  };
}

/**
 * Crée le compte et le profil. Minimisation des données : seul le prénom et
 * l'initiale du nom sont conservés, en mémoire uniquement (jamais persistés).
 */
export function createYouthAccount(reg: Registration, id: string): { account: Account; profile: YouthProfile } {
  return {
    account: { id, email: reg.email, password: reg.password, role: 'jeune', displayName: `${reg.firstName} ${reg.lastInitial}.` },
    profile: {
      id,
      role: 'jeune',
      name: reg.firstName,
      age: reg.age,
      rdvRef: 'Sans bilan',
      hasBilan: false,
      riasec: estimateRiasec(reg.interests),
      topCognitive: [],
      topPersonality: [],
      tagScores: Object.fromEntries(reg.interests.map((t) => [t, PRO_NEW_TAG_POINTS])),
      starredVideoIds: [],
      watchedVideoIds: [],
      documents: [],
    },
  };
}
