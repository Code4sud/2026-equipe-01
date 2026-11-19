# Stratégie de tests

Trois niveaux, tous lancés en CI (`.github/workflows/ci.yml`) à chaque push et pull request.

| Niveau | Outil | Dossier | Commande |
| --- | --- | --- | --- |
| Unitaires | Vitest | `tests/unit/` | `npm test` |
| Intégration (store + composants React) | Vitest, Testing Library, jsdom | `tests/integration/` | `npm test` |
| Garde-fous sécurité et RGPD | Vitest (analyse statique) | `tests/security/` | `npm test` |
| Bout en bout | Playwright (Chromium) | `tests/e2e/` | `npm run test:e2e` |

La couverture est mesurée sur `src/engine`, `src/domain`, `src/data`, `src/store` et `src/lib`, avec un seuil minimal de 80 % (`npm run test:coverage`).

## Unitaires

- `recommend.test.ts` : score, tri non vues puis vues, stabilité, exploration après chaque bloc de 4, catalogue vide ou réduit.
- `signals.test.ts` : étoile +5/-5, plancher à 0, regard compté une seule fois, ajout de tag à 10, bornes 0 à 100, refus des tags hors catalogue.
- `generate.test.ts` : longueur du débrief, tutoiement, 2 pistes issues du catalogue, absence de jargon, structure et avertissement du rapport parents, aucun chiffre inventé.
- `validation.test.ts` : localStorage falsifié (tags injectés, nombres absurdes, champs ajoutés, pollution de prototype).
- `data.test.ts` : cohérence du catalogue (au moins 20 fiches, 2 ou 3 tags connus, accroche de 140 caractères maximum, chaque tag de profil couvert par 2 fiches), des 5 profils et des comptes de démo.
- `v2-engine.test.ts` : radar vivant borné, estimation RIASEC, pourcentage de match, connexion de démo, validation de l’inscription (noms, âge 16-25, email unique, 2 ou 3 centres d’intérêt), minimisation (le nom de famille n’est pas gardé), validation et nettoyage des PDF.
- `lib.test.ts`, `banner.test.ts` : géométrie du radar, lecture vocale, mesure du bandeau.

## Intégration

- `store.test.ts` : connexion et erreurs, inscription jamais persistée, actions pro refusées sans session pro, import et retrait de PDF, étoile, réorientation pro visible dans le feed, persistance, réhydratation d'un état falsifié ou corrompu, synchro entre onglets sans boucle.
- `ui.test.tsx` : accroche et métriques, mockup interactif, connexion avec « Remplir », inscription, radar qui bouge en direct, panneau « Pourquoi », import PDF avec progression, landing, toast de l'étoile, débrief, rapport parents, fiche métier, espace Pro (recherche, éditeur de tags sans champ texte).

## Garde-fous (`tests/security/guards.test.ts`)

Ils échouent si quelqu'un réintroduit un risque : bandeau Code4Sud absent, `projet.json` invalide, `<textarea>` ou `contentEditable`, `dangerouslySetInnerHTML`, `innerHTML`, `eval`, appel réseau, lien `target="_blank"` sans `noopener`, CSP affaiblie, clé d'API ou fichier `.env` suivi par git, fichier de consignes pour agents IA poussé dans le dépôt.

## Bout en bout

`tests/e2e/journeys.spec.ts` tourne sur deux projets Playwright : **mobile** (390 x 844, tactile) et **desktop** (1440 x 900). Il construit l'app puis la sert avec `vite preview`.

Parcours couverts : connexion et inscription (le compte apparaît chez le pro puis disparaît au rechargement), radar qui bouge après une étoile et après une action du pro dans un autre onglet, panneau « Pourquoi » sur la fiche, import et refus de fichiers, bandeau et CSP sans violation, absence de défilement horizontal sur chaque écran, localStorage piégé sans exécution de script, étoile, regard de 3 s (horloge simulée), scroll vertical aimanté, swipe vers la fiche, débrief puis rapport parents, espace Pro sans zone de texte, réorientation visible dans le feed, synchro en direct entre deux onglets.

Première exécution en local :

```bash
npx playwright install chromium
npm run test:e2e
```
