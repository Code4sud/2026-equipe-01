# ✦ PolarIA

> Dans un ciel de possibilités, PolarIA guide les jeunes vers leur avenir.

Projet de l'équipe 01 au **Hackathon Azuréen #3** (Nice, 18 au 20 novembre 2026), sur le thème « L'orientation et l'employabilité grâce à l'IA », organisé par [Code4Sud](https://code4sud.fr). Sujet 1 : transformer un rapport en restitution personnelle, sans rien inventer.

## Le projet

Au Centre des Possibles (Nice Méridia), les 16-25 ans repartent de leur bilan d'orientation avec un PDF de 16 à 18 pages que presque personne ne relit. **PolarIA** le transforme en trois expériences :

| Pour qui | Quoi |
| --- | --- |
| **Le jeune** | Un feed vertical façon Reels de fiches métiers, formations et écoles. Une étoile, un swipe : l'algorithme apprend ce qui l'attire, et 1 fiche sur 4 est une « Découverte » pour sortir de la bulle. Dans « Mon Profil », il règle lui-même ses tags (voir plus, voir moins, nouveaux domaines). Chaque fiche explique « Pourquoi PolarIA te propose ça ? » (pourcentage de match, tags, règles). Le bouton « Générer mon avenir » lance une story immersive de 4 scènes écrite par une mini-IA, avec lecture vocale. |
| **Les parents** | L'onglet « Mon Bilan » : radar RIASEC qui évolue en direct, « Générer l'analyse pour mes parents » (forces, dynamique d'exploration, 3 pistes sur 3 horizons d'études, conseils pour la maison), imprimable en PDF, et les métiers du référentiel O*NET filtrés par durée d'études. |
| **Les pros** | Un tableau de bord où le conseiller réoriente le feed avec des tags et des poids, et rattache le Rapport des Possibles en PDF (import simulé). Aucune note libre, aucune donnée médicale. |

Principe central : **une IA qui traduit, jamais une IA qui invente**. Toute la restitution est générée de façon déterministe, uniquement à partir des données du profil et du catalogue de métiers (voir [docs/ALGORITHME.md](docs/ALGORITHME.md)).

## Démo en ligne

https://code4sud.github.io/2026-equipe-01/

Toutes les données sont **fictives**. Aucune donnée n'est envoyée sur Internet : l'état de la démo reste dans le navigateur (localStorage). Seule exception, sur ordinateur compatible : le téléchargement des poids publics du modèle d'IA locale (aucune donnée du jeune dans la requête). Le bouton « Réinitialiser la démo » de l'espace Pro remet tout à zéro.

### Comptes de démo

Le plus simple : bouton « Utiliser un compte de test » dans la fenêtre de connexion. Une modale montre les 5 jeunes à gauche et le psychologue du travail à droite ; un clic sur une carte connecte directement.

| Profil | Identifiant | Mot de passe |
| --- | --- | --- |
| Conseiller (Pro) | `dr.martin@polaria.fr` | `pro123` |
| Lucas, 16 ans, Réaliste / Terrain | `lucas@polaria.fr` | `jeune123` |
| Inès, 17 ans, Entreprenant / Social | `ines@polaria.fr` | `jeune123` |
| Noah, 16 ans, Artistique / Créatif | `noah@polaria.fr` | `jeune123` |
| Chloé, 18 ans, Investigateur / Logique | `chloe@polaria.fr` | `jeune123` |
| Yanis, 17 ans, Social / Soin | `yanis@polaria.fr` | `jeune123` |

L'onglet « Créer un compte (Jeune) » crée un profil gardé **en mémoire uniquement** : il apparaît tout de suite chez le conseiller et disparaît au rechargement. Ce sont des identifiants de démonstration publics, pas une authentification réelle.

## Les 2 mini-IA, 100 % dans le navigateur

- **« Générer mon avenir »** (jeune) : un scénario de story en 4 scènes (métier, forces, ce que disent ses étoiles, piste Découverte), lu à voix haute en français.
- **« Générer l'analyse pour mes parents »** (Mon Bilan) : une synthèse structurée et rassurante, avec un badge qui indique qui l'a écrite.

Sur un ordinateur compatible WebGPU, le texte est écrit par un **modèle open-weight exécuté localement** (WebLLM, Qwen2.5 1.5B quantifié, température 0, sortie JSON). Le modèle est téléchargé une seule fois puis gardé en cache ; le profil du jeune ne quitte jamais l'appareil et aucune clé d'API n'existe. Le bouton « Mode instantané » bascule à tout moment sur le générateur local déterministe (même format), qui prend aussi le relais automatiquement sur mobile, sans WebGPU ou en cas d'erreur. Toute réponse du modèle passe par des garde-fous qui rejettent un métier, un diplôme ou un chiffre absent des données (voir [docs/ALGORITHME.md](docs/ALGORITHME.md)).

## Référentiel O*NET

Les fiches du feed (42, dont 41 métiers) sont reliées au référentiel O*NET FR du Centre des Possibles : 721 métiers classés en 5 zones de qualification, importés depuis `data/table-metiers-onet-fr-jobzones.xlsx` par `npm run import:onet`. Un filtre « Court (0 à 2 ans) / Supérieur (1 à 10 ans) » est disponible dans Mon Bilan et dans l'explorateur de l'espace Pro.

## Lancer le projet

Prérequis : Node.js 20 ou plus.

```bash
npm install
npm run dev        # http://localhost:5173
```

Aucune clé d'API ni variable d'environnement n'est nécessaire.

## Scripts

| Commande | Rôle |
| --- | --- |
| `npm run dev` | Serveur de développement avec rechargement à chaud |
| `npm run build` | Vérification des types puis build de production dans `dist/` |
| `npm run preview` | Sert le build de production en local |
| `npm run lint` | ESLint (TypeScript, hooks React, règles de sécurité) |
| `npm run typecheck` | Vérification TypeScript stricte |
| `npm test` | Tests unitaires, d'intégration et garde-fous de sécurité (Vitest) |
| `npm run test:coverage` | Idem avec rapport de couverture (seuil 80 %) |
| `npm run import:onet` | Régénère `src/data/onet.json` depuis le classeur O*NET |
| `npm run test:e2e` | Parcours utilisateurs dans Chromium, mobile et desktop (Playwright) |
| `npm run check` | Lint, types, tests et build : à lancer avant chaque push |
| `npm run audit` | Vulnérabilités connues des dépendances |

Première exécution des tests E2E : `npx playwright install chromium`.

## Documentation

- [Architecture et carte du code](docs/ARCHITECTURE.md)
- [Algorithme de recommandation et moteur « zéro hallucination »](docs/ALGORITHME.md)
- [Stratégie de tests](docs/TESTS.md)
- [RGPD et secret professionnel](docs/RGPD.md)
- [Politique de sécurité](SECURITY.md)

## Stack

React 19, TypeScript, Vite, Zustand, React Router, Framer Motion, Recharts (radar), lucide-react (icônes, aucun emoji), WebLLM (IA locale via WebGPU, chargée à la demande). Polices auto-hébergées (Fontsource) : Outfit (titres), Inter (texte), Instrument Serif (citations), JetBrains Mono (scores et chapitres). Tests : Vitest, Testing Library, Playwright. CI GitHub Actions : lint, types, tests, E2E, recherche de secrets (gitleaks) et audit des dépendances.

## Publier sur le site du hackathon

1. Complétez `projet.json` (nom, pitch, description, écoles, technologies, liens).
2. Ajoutez vos captures dans `captures/` et listez-les dans `projet.json`.
3. Poussez sur `main` : la fiche apparaît sur https://orientation.code4sud.fr/projets/equipe-01 en moins d'une minute.

Toute la doc du hackathon : https://orientation.code4sud.fr/doc/

## Licence

MIT, voir `LICENSE`.
