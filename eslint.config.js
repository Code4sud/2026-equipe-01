import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import security from 'eslint-plugin-security';
import globals from 'globals';

export default tseslint.config(
  { ignores: ['dist', 'coverage', 'playwright-report', 'test-results', 'node_modules'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  security.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // Les accès par clé sur des Record typés sont la norme ici (tags, RIASEC).
      'security/detect-object-injection': 'off',
      'no-restricted-syntax': [
        'error',
        { selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']", message: 'Interdit : rendu HTML brut (risque XSS).' },
        { selector: "JSXOpeningElement[name.name='textarea']", message: 'Interdit (RGPD) : aucune zone de texte libre.' },
        { selector: "MemberExpression[property.name='innerHTML']", message: 'Interdit : utiliser textContent.' },
        { selector: "CallExpression[callee.name='eval']", message: 'Interdit : eval.' },
      ],
    },
  },
  {
    // Outillage de test : lectures de fichiers et RegExp construites à partir de constantes du dépôt.
    files: ['tests/**/*.{ts,tsx}', '*.config.ts'],
    rules: {
      'security/detect-non-literal-fs-filename': 'off',
      'security/detect-non-literal-regexp': 'off',
    },
  },
);
