/**
 * Garde-fous automatiques de la checklist du hackathon et de la sécurité :
 * ils échouent en CI si quelqu'un réintroduit un risque.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CSP } from '../../vite.config';

const ROOT = join(__dirname, '..', '..');
const read = (p: string) => readFileSync(join(ROOT, p), 'utf8');

function walk(dir: string, exts: string[]): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walk(full, exts));
    else if (exts.some((e) => name.endsWith(e))) out.push(full);
  }
  return out;
}

const SOURCES = walk(join(ROOT, 'src'), ['.ts', '.tsx', '.css']).map((f) => ({
  file: relative(ROOT, f),
  text: readFileSync(f, 'utf8'),
}));

function trackedFiles(): string[] {
  try {
    return execFileSync('git', ['ls-files'], { cwd: ROOT, encoding: 'utf8' }).split('\n').filter(Boolean);
  } catch {
    return [];
  }
}

describe('checklist hackathon', () => {
  it('index.html contient le bandeau Code4Sud de l’équipe 01', () => {
    expect(read('index.html')).toContain(
      '<script src="https://orientation.code4sud.fr/bandeau.js" data-equipe="01"></script>',
    );
  });

  it('projet.json est un JSON valide et à jour', () => {
    const projet = JSON.parse(read('projet.json'));
    expect(projet.nom).toBe('PolarIA');
    for (const key of ['pitch', 'description', 'ecoles', 'stack', 'demo', 'captures']) {
      expect(projet).toHaveProperty(key);
    }
  });
});

describe('RGPD : aucun champ de texte libre', () => {
  it('aucun <textarea> ni contentEditable dans le code', () => {
    for (const { file, text } of SOURCES) {
      expect(text, file).not.toMatch(/<textarea|contentEditable/i);
    }
  });

  it('l’espace Pro n’a que deux inputs : recherche (non stockée) et import PDF', () => {
    const pro = read('src/routes/Pro.tsx') + read('src/components/Documents.tsx');
    const inputs = pro.match(/<input[\s\S]*?\/>/g) ?? [];
    expect(inputs).toHaveLength(2);
    expect(inputs.some((i) => i.includes('type="search"') && i.includes('maxLength'))).toBe(true);
    expect(inputs.some((i) => i.includes('type="file"') && i.includes('accept="application/pdf'))).toBe(true);
  });

  it('le contenu des PDF importés n’est jamais lu', () => {
    const docs = read('src/components/Documents.tsx') + read('src/engine/documents.ts');
    expect(docs).not.toMatch(/FileReader|arrayBuffer\(|\.text\(\)|\.stream\(\)/);
  });

  it('le store ne contient aucun champ de notes', () => {
    const types = read('src/domain/types.ts');
    expect(types).not.toMatch(/\b(notes?|comment(aire)?s?|diagnostic|medical)\s*[?:]/i);
  });
});

describe('Direction artistique v3', () => {
  it('aucun emoji système dans l’interface (100 % lucide-react)', () => {
    for (const { file, text } of SOURCES) {
      expect(text, file).not.toMatch(/\p{Extended_Pictographic}/u);
    }
  });

  it('le caractère ✦ n’est plus utilisé en décoration', () => {
    for (const { file, text } of SOURCES) {
      expect(text, file).not.toContain('✦');
    }
  });

  it('l’étoile est réservée au logo et au bouton Étoile', () => {
    const allowed = new Set([
      'src/components/ui.tsx', // définition + logo
      'src/components/Feed.tsx', // bouton Étoile du feed
      'src/components/DetailsScreen.tsx', // bouton Étoile de la fiche
      'src/components/WhyPanel.tsx', // bouton Étoile du panneau « Pourquoi »
      'src/routes/YouthApp.tsx', // logo du téléphone
      'src/routes/Landing.tsx', // emblème du logo + bouton Étoile du mockup
    ]);
    const users = SOURCES.filter(({ file, text }) => file.endsWith('.tsx') && /<StarIcon\b/.test(text)).map((s) =>
      s.file.replace(/\\/g, '/'),
    );
    for (const f of users) expect(allowed.has(f), f).toBe(true);
  });

  it('chaque fiche utilise une icône Lucide du catalogue', async () => {
    const { VIDEOS } = await import('../../src/data/videos');
    const { isVideoIcon } = await import('../../src/components/icons');
    for (const v of VIDEOS) expect(isVideoIcon(v.icon), v.id).toBe(true);
  });
});

describe('XSS et code dangereux', () => {
  it('pas de dangerouslySetInnerHTML, innerHTML, eval ni new Function', () => {
    for (const { file, text } of SOURCES) {
      expect(text, file).not.toMatch(/dangerouslySetInnerHTML|\.innerHTML\s*=|\beval\(|new Function\(/);
    }
  });

  it('les liens target=_blank ont rel="noopener noreferrer"', () => {
    for (const { file, text } of SOURCES) {
      for (const m of text.matchAll(/<a\b[^>]*target="_blank"[^>]*>/g)) {
        expect(m[0], file).toContain('noopener');
      }
    }
  });

  it('aucun appel réseau dans l’app (100 % hors-ligne)', () => {
    for (const { file, text } of SOURCES) {
      expect(text, file).not.toMatch(/\bfetch\(|XMLHttpRequest|WebSocket\(/);
    }
  });
});

describe('Content Security Policy', () => {
  it('interdit eval et les scripts inline, limite les origines', () => {
    expect(CSP).toContain("default-src 'self'");
    expect(CSP).toContain("object-src 'none'");
    expect(CSP).toContain("base-uri 'self'");
    expect(CSP).not.toContain('unsafe-eval');
    const scriptSrc = CSP.split(';').find((d) => d.trim().startsWith('script-src'))!;
    expect(scriptSrc).not.toContain('unsafe-inline');
    expect(scriptSrc).not.toContain('*');
  });

  it('n’autorise aucun autre domaine externe que le bandeau', () => {
    const hosts = CSP.match(/https:\/\/[^\s;]+/g) ?? [];
    expect([...new Set(hosts)]).toEqual(['https://orientation.code4sud.fr']);
  });

  it('autorise le bandeau obligatoire', () => {
    expect(CSP).toContain('https://orientation.code4sud.fr');
  });
});

describe('secrets et fichiers sensibles', () => {
  const SECRET_PATTERNS: Array<[string, RegExp]> = [
    ['clé OpenAI / Anthropic', /\bsk-(ant-)?[A-Za-z0-9_-]{20,}/],
    ['clé AWS', /\bAKIA[0-9A-Z]{16}\b/],
    ['token GitHub', /\bgh[pousr]_[A-Za-z0-9]{30,}/],
    ['clé Google', /\bAIza[0-9A-Za-z_-]{35}\b/],
    ['clé privée', /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
    ['affectation de secret', /\b(api[_-]?key|secret|password|token)\s*[:=]\s*['"][^'"\s]{12,}['"]/i],
  ];

  const files = trackedFiles().filter((f) => !/package-lock\.json$|\.(png|jpe?g|gif|ico|woff2?)$/.test(f));

  it.each(SECRET_PATTERNS)('aucun(e) %s dans les fichiers suivis', (_label, pattern) => {
    for (const f of [...files, ...SOURCES.map((s) => s.file)]) {
      if (f.startsWith('tests/security/')) continue;
      let text: string;
      try {
        text = read(f);
      } catch {
        continue; // fichier supprimé localement mais encore suivi
      }
      expect(pattern.test(text), f).toBe(false);
    }
  });

  it('aucun fichier .env suivi par git', () => {
    expect(trackedFiles().filter((f) => /(^|\/)\.env(\.|$)/.test(f) && !f.endsWith('.env.example'))).toEqual([]);
  });

  it('aucune consigne pour agents IA n’est suivie par git', () => {
    const forbidden = trackedFiles().filter((f) =>
      /(specification_pour_agents|^PLAN\.md$|^CLAUDE\.md$|^\.claude\/)/i.test(f),
    );
    expect(forbidden).toEqual([]);
  });
});
