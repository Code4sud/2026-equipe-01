import type { DocumentMeta } from '../domain/types';

/**
 * Import FACTICE du « Rapport des Possibles » : seul le nom, la taille et la
 * date sont gardés. Le contenu du PDF n'est jamais lu, envoyé ni stocké.
 */
export const MAX_PDF_BYTES = 15 * 1024 * 1024;

export interface FileLike {
  name: string;
  size: number;
  type: string;
}

export function validatePdf(file: FileLike): string | null {
  if (!/\.pdf$/i.test(file.name)) return 'Seuls les fichiers PDF sont acceptés.';
  if (file.type && file.type !== 'application/pdf') return 'Ce fichier n’est pas un PDF.';
  if (!(file.size > 0)) return 'Le fichier est vide.';
  if (file.size > MAX_PDF_BYTES) return 'Fichier trop lourd (15 Mo maximum).';
  return null;
}

export function sanitizeFileName(raw: string): string {
  const base = raw.split(/[\\/]/).pop() ?? '';
  const stem = base
    .replace(/\.pdf$/i, '')
    .replace(/[^\p{L}\p{N} ._()-]/gu, '')
    .trim()
    .slice(0, 76);
  return `${stem || 'document'}.pdf`;
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  const fmt = (n: number) => n.toLocaleString('fr-FR', { maximumFractionDigits: 1 });
  if (bytes < 1024 * 1024) return `${fmt(bytes / 1024)} Ko`;
  return `${fmt(bytes / (1024 * 1024))} Mo`;
}

export function makeDocument(file: FileLike, now: Date, id: string): DocumentMeta {
  return { id, name: sanitizeFileName(file.name), size: file.size, date: now.toISOString().slice(0, 10) };
}
