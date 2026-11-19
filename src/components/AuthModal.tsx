import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { DEMO_PERSONAS, SEED_ACCOUNTS } from '../data/accounts';
import { SEED_PROFILES } from '../data/profiles';
import { ALL_TAGS } from '../data/tags';
import type { RegistrationErrors, RegistrationInput } from '../engine/auth';
import { useStore } from '../store/useStore';

export type AuthTab = 'login' | 'register';

const EMPTY: RegistrationInput = { firstName: '', lastName: '', age: '', email: '', password: '', interests: [] };

function Field({
  label,
  error,
  testId,
  ...input
}: { label: string; error?: string; testId: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="field">
      <span className="field__label">{label}</span>
      <input {...input} data-testid={testId} aria-invalid={!!error} className="field__input" />
      {error && (
        <span className="field__error" role="alert">
          {error}
        </span>
      )}
    </label>
  );
}

const youthAccounts = SEED_ACCOUNTS.filter((a) => a.role === 'jeune');
const proAccount = SEED_ACCOUNTS.find((a) => a.role === 'pro');

function FillButton({ id, dark = false, onFill }: { id: string; dark?: boolean; onFill: () => void }) {
  return (
    <button type="button" className={`btn btn--sm ${dark ? 'btn--on-dark' : 'btn--ghost'}`} data-testid={`fill-${id}`} onClick={onFill}>
      Remplir
    </button>
  );
}

function LoginForm() {
  const login = useStore((s) => s.login);
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const fill = (e: string, p: string) => {
    setEmail(e);
    setPassword(p);
    setError(null);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const r = login(email, password);
    if (!r.ok) return setError(r.error);
    navigate(r.role === 'pro' ? '/pro' : '/app');
  };

  return (
    <form className="auth__form" onSubmit={submit} noValidate data-testid="login-form">
      <Field label="Identifiant / Email" type="email" autoComplete="username" value={email} maxLength={80} onChange={(e) => setEmail(e.target.value)} testId="login-email" />
      <Field label="Mot de passe" type="password" autoComplete="current-password" value={password} maxLength={64} onChange={(e) => setPassword(e.target.value)} testId="login-password" />
      {error && (
        <p className="auth__error" role="alert" data-testid="login-error">
          {error}
        </p>
      )}
      <button type="submit" className="btn btn--primary btn--block" data-testid="login-submit">
        Se connecter
      </button>

      <details className="demo-accounts" data-testid="demo-accounts">
        <summary>Comptes de démo (Hackathon)</summary>
        <div className="demo-accounts__youth" data-testid="demo-youth">
          <p className="demo-accounts__label">Comptes jeunes</p>
          <ul>
            {youthAccounts.map((a) => {
              const profile = SEED_PROFILES.find((p) => p.id === a.id);
              return (
                <li key={a.id}>
                  <span>
                    <strong>
                      {a.displayName}
                      {profile ? `, ${profile.age} ans` : ''}
                    </strong>
                    <small>{DEMO_PERSONAS[a.id]}</small>
                    <small className="mono">
                      {a.email} · {a.password}
                    </small>
                  </span>
                  <FillButton id={a.id} onFill={() => fill(a.email, a.password)} />
                </li>
              );
            })}
          </ul>
        </div>
        {proAccount && (
          <div className="demo-accounts__pro" data-testid="demo-pro">
            <p className="demo-accounts__badge">
              <ShieldCheck size={15} aria-hidden="true" /> Psychologue du travail
            </p>
            <div className="demo-accounts__pro-row">
              <span>
                <strong>{proAccount.displayName}</strong>
                <small className="mono">
                  {proAccount.email} · {proAccount.password}
                </small>
              </span>
              <FillButton id={proAccount.id} dark onFill={() => fill(proAccount.email, proAccount.password)} />
            </div>
          </div>
        )}
        <p className="muted small">Comptes fictifs et publics, pour la démo uniquement.</p>
      </details>
    </form>
  );
}

function RegisterForm() {
  const register = useStore((s) => s.register);
  const navigate = useNavigate();
  const [form, setForm] = useState<RegistrationInput>(EMPTY);
  const [errors, setErrors] = useState<RegistrationErrors>({});
  const set = (k: keyof RegistrationInput) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const toggleInterest = (tag: string) =>
    setForm((f) => ({
      ...f,
      interests: f.interests.includes(tag)
        ? f.interests.filter((t) => t !== tag)
        : f.interests.length < 3
          ? [...f.interests, tag]
          : f.interests,
    }));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const r = register(form);
    if (!r.ok) return setErrors(r.errors);
    navigate('/app');
  };

  return (
    <form className="auth__form" onSubmit={submit} noValidate data-testid="register-form">
      <div className="auth__row">
        <Field label="Prénom" autoComplete="given-name" value={form.firstName} maxLength={40} onChange={set('firstName')} error={errors.firstName} testId="reg-firstName" />
        <Field label="Nom" autoComplete="family-name" value={form.lastName} maxLength={40} onChange={set('lastName')} error={errors.lastName} testId="reg-lastName" />
      </div>
      <div className="auth__row">
        <Field label="Âge" type="number" inputMode="numeric" min={16} max={25} value={form.age} onChange={set('age')} error={errors.age} testId="reg-age" />
        <Field label="Email" type="email" autoComplete="email" value={form.email} maxLength={80} onChange={set('email')} error={errors.email} testId="reg-email" />
      </div>
      <Field label="Mot de passe" type="password" autoComplete="new-password" value={form.password} maxLength={64} onChange={set('password')} error={errors.password} testId="reg-password" />

      <fieldset className="interests">
        <legend className="field__label">Tes centres d’intérêt de départ (2 ou 3)</legend>
        <div className="interests__chips">
          {ALL_TAGS.map((tag) => {
            const on = form.interests.includes(tag);
            return (
              <button
                key={tag}
                type="button"
                className={`chip-toggle${on ? ' is-on' : ''}`}
                aria-pressed={on}
                disabled={!on && form.interests.length >= 3}
                onClick={() => toggleInterest(tag)}
                data-testid={`interest-${tag}`}
              >
                {tag}
              </button>
            );
          })}
        </div>
        {errors.interests && (
          <span className="field__error" role="alert">
            {errors.interests}
          </span>
        )}
      </fieldset>

      <button type="submit" className="btn btn--primary btn--block" data-testid="register-submit">
        Créer mon compte
      </button>
      <p className="muted small">
        Compte de démo gardé en mémoire uniquement : il disparaît si tu recharges la page. Seuls ton prénom et l’initiale de
        ton nom sont conservés.
      </p>
    </form>
  );
}

export function AuthModal({ initialTab = 'login', onClose }: { initialTab?: AuthTab; onClose?: () => void }) {
  const [tab, setTab] = useState<AuthTab>(initialTab);
  const card = useRef<HTMLDivElement>(null);

  useEffect(() => {
    card.current?.querySelector<HTMLInputElement>('input')?.focus();
  }, [tab]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-labelledby="auth-title" data-testid="auth-modal">
      <div className="modal__backdrop" onClick={onClose} />
      <div className="modal__card modal__card--wide glass" ref={card}>
        <h2 id="auth-title" className="display auth__title">
          Bienvenue sur PolarIA
        </h2>
        <div className="seg" role="tablist">
          <button type="button" role="tab" aria-selected={tab === 'login'} onClick={() => setTab('login')} data-testid="tab-login">
            Se connecter
          </button>
          <button type="button" role="tab" aria-selected={tab === 'register'} onClick={() => setTab('register')} data-testid="tab-register">
            Créer un compte (Jeune)
          </button>
        </div>
        {tab === 'login' ? <LoginForm /> : <RegisterForm />}
        {onClose ? (
          <button type="button" className="btn btn--ghost btn--sm" onClick={onClose}>
            Annuler
          </button>
        ) : (
          <Link to="/" className="btn btn--ghost btn--sm">
            <ArrowLeft size={15} aria-hidden="true" /> Retour à l’accueil
          </Link>
        )}
      </div>
    </div>
  );
}
