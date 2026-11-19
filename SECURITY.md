# Politique de sécurité

## Signaler une vulnérabilité

Merci de **ne pas ouvrir d'issue publique**. Utilisez l'onglet « Security » puis « Report a vulnerability » du dépôt GitHub (signalement privé). Nous répondons pendant la durée du hackathon et de sa démonstration.

## Modèle de menace

PolarIA est un site statique publié sur GitHub Pages, sans serveur, sans compte réel et sans donnée personnelle (profils fictifs). Les risques principaux sont donc :

| Risque | Mesure en place |
| --- | --- |
| Fuite de clé d'API dans un dépôt public | Aucune clé n'est nécessaire. `.env` ignoré par git. Recherche de secrets dans tout l'historique par gitleaks en CI, et test de garde qui cherche les formats de clés courants. |
| Injection de script (XSS) | Rendu React uniquement en texte. `dangerouslySetInnerHTML`, `innerHTML` et `eval` interdits par ESLint et par test. Content Security Policy stricte sur les scripts (pas d'`unsafe-inline` ni d'`unsafe-eval`). Les textes produits par l'IA locale sont validés puis rendus en texte, balises retirées. |
| Données falsifiées dans le localStorage | Tout ce qui est relu est revalidé contre des catalogues fermés (`src/domain/validation.ts`) : tags inconnus ignorés, scores bornés, identité jamais reprise du stockage, pollution de prototype neutralisée. Testé en unitaire et en E2E. |
| Saisie de données sensibles par un pro | Aucune zone de texte libre (voir [docs/RGPD.md](docs/RGPD.md)). |
| Authentification de démo | Les comptes et mots de passe sont **factices et publics** (affichés à l’écran pour le jury). La vérification se fait dans le navigateur : n’importe qui peut ouvrir l’espace Pro, ce qui est acceptable uniquement parce que les données sont fictives. Les actions pro sont tout de même refusées par le store sans session pro, et une session relue du stockage n’est acceptée que pour un compte de démo existant avec le bon rôle. Un vrai produit exige un serveur, des mots de passe hachés (Argon2 ou bcrypt) et une limitation des tentatives. |
| Fichier importé malveillant | Le PDF n’est jamais ouvert ni lu : seules ses métadonnées sont gardées. Extension et type MIME vérifiés, 15 Mo maximum, nom de fichier nettoyé (pas de chemin ni de balise). |
| Dépendance vulnérable | `npm audit` en CI (échec au niveau « high »), revue des dépendances sur les pull requests, mises à jour Dependabot hebdomadaires. |
| Script tiers | Seul le bandeau obligatoire `orientation.code4sud.fr` est autorisé par la CSP, en plus de notre propre bundle. Il ne peut pas avoir de hash SRI (script fourni et modifiable par l'organisateur) : risque accepté, limité par une liste fermée d'hôtes dans `connect-src` et des données fictives. Les polices sont auto-hébergées. |
| IA locale (WebLLM) | Le modèle open-weight tourne dans un Web Worker via WebGPU : aucune clé, aucun serveur, aucune donnée du jeune envoyée. Seuls ses poids publics sont téléchargés depuis Hugging Face et le binaire WebAssembly depuis GitHub (hôtes listés un par un dans `connect-src`, `wasm-unsafe-eval` pour compiler le WebAssembly, jamais `unsafe-eval`). La bibliothèque n'est chargée qu'à la demande, version épinglée exactement. La sortie du modèle est un texte non fiable : JSON parsé puis assaini (`src/engine/ai.ts`), métiers, formations, zones et rappel légal toujours repris du store. |

## Content Security Policy

Injectée dans `index.html` au moment du build (`vite.config.ts`) :

```
default-src 'self';
script-src 'self' 'wasm-unsafe-eval' https://orientation.code4sud.fr;
style-src 'self' 'unsafe-inline';
font-src 'self';
img-src 'self' data:;
connect-src 'self' https://huggingface.co https://*.huggingface.co https://*.hf.co https://raw.githubusercontent.com;
worker-src 'self'; media-src 'self';
object-src 'none'; base-uri 'self'; form-action 'none'
```

Vite est configuré pour ne jamais intégrer de fichiers en `data:` (`assetsInlineLimit: 0`) : les polices restent servies par le site et respectent `font-src 'self'`. Un test E2E échoue en cas de violation CSP, y compris pendant la génération de la story (worker et WebAssembly). Les tests de garde vérifient directive par directive les hôtes autorisés.

`style-src 'unsafe-inline'` reste nécessaire : le bandeau Code4Sud et l'animation de swipe posent des styles en ligne. Ce n'est pas un vecteur d'exécution de script.

GitHub Pages ne permet pas d'envoyer d'en-têtes HTTP personnalisés : `X-Frame-Options`, `frame-ancestors` et HSTS ne sont donc pas configurables ici. Si l'application passe sur un hébergeur avec backend (Vercel, Render), ajouter ces en-têtes côté serveur.

## Si un backend est ajouté

- Les clés d'API vivent **uniquement** dans les variables d'environnement du serveur, jamais dans une variable `VITE_*` (elles seraient publiées dans le bundle).
- Limiter le débit des appels au LLM et valider la forme de ses réponses.
- Mettre à jour cette page et la CSP (`connect-src`).

## Avant chaque push

```bash
npm run check   # lint, types, tests (dont garde-fous), build
npm run audit
```
