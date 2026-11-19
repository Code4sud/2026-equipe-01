import { useEffect, useRef, useState } from 'react';
import type { YouthProfile } from '../domain/types';
import { formatSize } from '../engine/documents';
import { useStore } from '../store/useStore';

const FAKE_UPLOAD_MS = 1000;

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

/**
 * Import FACTICE du « Rapport des Possibles » : on simule un envoi (barre de
 * progression ~1 s) puis on garde uniquement le nom, la taille et la date.
 * Le contenu du fichier n'est jamais lu ni envoyé nulle part.
 */
export function DocumentsSection({ profile }: { profile: YouthProfile }) {
  const addDocument = useStore((s) => s.proAddDocument);
  const removeDocument = useStore((s) => s.proRemoveDocument);
  const input = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const timers = useRef<number[]>([]);

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  const handle = (file: File | undefined) => {
    if (!file || progress !== null) return;
    setError(null);
    setProgress(0);
    const steps = 10;
    for (let i = 1; i <= steps; i++) {
      timers.current.push(window.setTimeout(() => setProgress(i / steps), (FAKE_UPLOAD_MS / steps) * i));
    }
    timers.current.push(
      window.setTimeout(() => {
        const err = addDocument(profile.id, { name: file.name, size: file.size, type: file.type });
        setError(err);
        setProgress(null);
        if (input.current) input.current.value = '';
      }, FAKE_UPLOAD_MS + 50),
    );
  };

  return (
    <div className="docs" data-testid="documents">
      <label
        className={`dropzone${drag ? ' is-drag' : ''}${progress !== null ? ' is-busy' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          handle(e.dataTransfer.files[0]);
        }}
      >
        <input
          ref={input}
          type="file"
          accept="application/pdf,.pdf"
          className="sr-only"
          onChange={(e) => handle(e.target.files?.[0])}
          data-testid="pdf-input"
        />
        <span className="dropzone__icon" aria-hidden="true">
          📄
        </span>
        <span>
          <strong>Glisser-déposer</strong> ou cliquer pour choisir un PDF
        </span>
        <span className="muted small">15 Mo maximum · le fichier reste sur cet appareil</span>
        {progress !== null && (
          <span className="progress" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100} data-testid="upload-progress">
            <span style={{ width: `${progress * 100}%` }} />
          </span>
        )}
      </label>
      {error && (
        <p className="field__error" role="alert" data-testid="upload-error">
          {error}
        </p>
      )}

      {profile.documents.length > 0 ? (
        <ul className="docs__list">
          {profile.documents.map((d) => (
            <li key={d.id} className="docs__item" data-testid={`doc-${d.name}`}>
              <span className="docs__name" title={d.name}>
                📄 {d.name}
              </span>
              <span className="muted small">
                {formatDate(d.date)} · {formatSize(d.size)}
              </span>
              <span className="badge-ok">Importé</span>
              <button
                type="button"
                className="icon-btn icon-btn--sm icon-btn--danger"
                aria-label={`Retirer ${d.name}`}
                onClick={() => removeDocument(profile.id, d.id)}
                data-testid={`remove-doc-${d.id}`}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted small">Aucun document pour l’instant.</p>
      )}
    </div>
  );
}
