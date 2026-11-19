/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Content Security Policy injectée uniquement au build (le serveur de dev de
 * Vite a besoin de scripts inline pour le rechargement à chaud).
 * - script-src : notre bundle + le bandeau obligatoire Code4Sud.
 * - style-src 'unsafe-inline' : requis par le bandeau (attributs style) et Framer Motion.
 */
export const CSP = [
  "default-src 'self'",
  "script-src 'self' https://orientation.code4sud.fr",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self'",
  "img-src 'self' data:",
  "connect-src 'self'",
  "media-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
].join('; ');

function cspPlugin(): Plugin {
  return {
    name: 'polaria-csp',
    apply: 'build',
    transformIndexHtml(html) {
      return html.replace(
        '<!-- CSP -->',
        `<meta http-equiv="Content-Security-Policy" content="${CSP}" />`,
      );
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [react(), cspPlugin()],
  build: {
    sourcemap: false,
    // Jamais de data: URI : la CSP (font-src/img-src) n’autorise que les fichiers servis par le site.
    assetsInlineLimit: 0,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/unit/**/*.test.{ts,tsx}', 'tests/integration/**/*.test.{ts,tsx}', 'tests/security/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      include: ['src/engine/**', 'src/domain/**', 'src/data/**', 'src/store/**', 'src/lib/**'],
      thresholds: { lines: 80, functions: 80, branches: 75, statements: 80 },
    },
  },
});
