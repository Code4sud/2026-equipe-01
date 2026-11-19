# Algorithme de recommandation, mini-IA et référentiel O*NET

Code : `src/engine/`. Toutes les fonctions sont pures, déterministes et testées (`tests/unit/`).

## 1. Score d'une vidéo

```
Score(vidéo) = somme, pour chaque tag t de la vidéo, de user.tagScores[t]
```

Un tag absent du profil compte pour 0. Les scores de tags sont toujours bornés entre 0 et 100.

## 2. Construction du feed « Pour toi » : Exploitation + Découverte

`buildFeed(videos, profile, startPosition)` :

1. **Exploitation (3 fiches sur 4)** : les fiches les mieux scorées, non vues d'abord, à score égal dans l'ordre du catalogue.
2. **Découverte (1 fiche sur 4)** : aux positions **4, 8, 12…**, une fiche d'un domaine encore **peu scoré** (score inférieur ou égal au quart du meilleur score), en priorité compatible avec la 2e dimension RIASEC du jeune. Elle porte le badge « Découverte » (icône boussole) dans le feed et dans « Prochain feed ».
3. Chaque fiche apparaît exactement une fois.

**Feed vivant** (`buildLiveFeed`) : les fiches que le jeune a déjà atteintes restent à leur place ; toute la suite est recalculée à chaque changement de score, en gardant le rythme 3 + 1. Une étoile sur une carte Découverte fait donc remonter son domaine immédiatement dans la suite du feed.

Sur desktop, le panneau « Algo en direct » montre la boussole des tags et les 8 prochaines fiches, en temps réel.

## 3. Signaux et mises à jour

| Signal | Effet | Fonction |
| --- | --- | --- |
| Étoile ✦ | +5 sur chaque tag de la vidéo, ou -5 si on retire l'étoile | `toggleStar` |
| Regard de plus de 3 s | +2 sur chaque tag, **une seule fois** par vidéo | `recordWatch` (le minuteur est dans `Feed.tsx`, via `IntersectionObserver`) |
| Pro : ajouter un tag | Le tag (choisi dans le catalogue fermé) démarre à 10 | `addTag` |
| Pro : boutons + et - | +5 ou -5, borné entre 0 et 100 | `adjustTag` |
| Pro : supprimer | Retire le tag du profil | `removeTag` |
| Jeune (Mon Profil) : voir plus / voir moins | +3 ou -3, minimum 0 | `adjustTag` via `youthTune` |
| Jeune (Mon Profil) : explorer un domaine | Le tag démarre à 6 | `addTag` via `youthExplore` |

Un tag hors catalogue ou une valeur non numérique est **refusé** (exception attrapée par le store, l'action est ignorée).

## 4. Radar RIASEC vivant et pourcentage de match

**Radar vivant** (`engine/riasec.ts`, `dynamicRiasec`) : on part des scores du bilan, puis chaque tag actif ajoute des points à ses dimensions RIASEC (dimension principale : 1 point pour 4 points de tag ; dimension secondaire : moitié moins). Le décalage est **plafonné à 15 points** par dimension pour ne jamais trahir le bilan. Le radar affiche les deux : pointillés pour le bilan, trait rose pour « aujourd’hui ». Il s’anime à chaque étoile, regard de plus de 3 s ou action du conseiller, y compris depuis un autre onglet.

**Comptes créés sans bilan** (`estimateRiasec`) : base 35 partout, +20 sur la dimension principale et +10 sur la secondaire de chaque centre d’intérêt choisi, plafond 85. Ce profil est toujours présenté comme une **estimation** (radar, bilan et rapport parents le disent explicitement).

**Pourcentage de match** (`engine/match.ts`) : score de la fiche divisé par le meilleur score possible pour une fiche ayant autant de tags (somme des N meilleurs tags du jeune). 100 % signifie que la fiche porte exactement ses tags les plus forts.

## 5. Mini-IA « zéro hallucination » (`engine/ai.ts`, `services/aiService.ts`)

### Ce que reçoit l'IA

`buildAiContext(profile, videos)` produit le **seul** JSON transmis au modèle : prénom, âge, scores RIASEC, aptitudes, 6 tags les plus actifs, titres des fiches étoilées, nombre de fiches regardées, les 8 métiers du store les plus proches (zone, tags, formations, 1re tâche) et la fiche Découverte proposée par l'algorithme. Jamais de nom, de référence de rendez-vous ni de document.

### Deux moteurs, un même format

| Moteur | Quand | Comment |
| --- | --- | --- |
| **IA locale WebLLM** | Ordinateur avec WebGPU matériel, hors mode économie de données | Qwen2.5 1.5B Instruct (q4f16, open-weight) dans un Web Worker, `temperature: 0`, `response_format: json_object` avec schéma JSON imposé, délai maximal de 60 s |
| **Mode instantané** | Mobile, pas de WebGPU, erreur, délai dépassé, ou bouton « Mode instantané » | Gabarits fixes remplis uniquement avec le JSON ci-dessus, résultat immédiat |

Le premier chargement du modèle affiche une barre de progression non bloquante ; le bouton « Mode instantané » l'interrompt (le worker est arrêté, le téléchargement aussi) et le choix est mémorisé. Un badge indique toujours qui a écrit le texte.

### Mini-IA n°1 : « Reel d'Immersion »

Scénario `ImmersiveReelScenario` de 4 scènes de 25 mots maximum, au tutoiement, sans jargon : 1. accroche dans l'ambiance de son premier métier ; 2. ses 2 forces RIASEC traduites (« Réaliste » devient « aimer le concret et bouger ») ; 3. ce que confirment ses étoiles et ses fiches regardées ; 4. la piste Découverte. Le lecteur, dans le téléphone, affiche des barres de progression façon Stories, une grande icône Lucide animée, les sous-titres en gros, des zones tactiles gauche et droite, et lit chaque scène en `fr-FR` (Web Speech API) quand la voix est activée.

### Mini-IA n°2 : analyse pour les parents

`ParentReportData` : forces (3 à 4 lignes), dynamique d'exploration, **3 pistes sur des horizons d'études variés** (une courte, zones 1 à 2 ; une moyenne, zone 3 ; une longue, zones 4 à 5, quand le store le permet), 2 ou 3 conseils pour la maison et le rappel officiel. Rendu en cartes éditoriales sous le radar, imprimable (`window.print()`).

### Garde-fous appliqués à toute réponse du modèle

- JSON invalide ou incomplet : on bascule sur le mode instantané.
- `inventsFacts` : une phrase qui contient un **chiffre** ou un **diplôme** (BTS, CAP, Master…) absent du JSON transmis est rejetée et remplacée par la phrase instantanée correspondante.
- Story : 4 scènes exactement, icône prise dans une liste fermée, durée bornée entre 4 et 8 s, 25 mots par scène, balises et caractères de contrôle retirés.
- Analyse parents : un métier n'est gardé que s'il existe dans le JSON ; sa **zone et ses formations viennent toujours du store**, jamais du modèle ; il y a toujours 3 pistes ; le rappel « pistes de réflexion et non un verdict » est imposé.

### Ce que vérifient les tests

`tests/unit/ai.test.ts` : contenu exact du JSON envoyé, 4 scènes de 25 mots maximum pour chaque profil, absence de jargon, 3 pistes issues du store avec leurs vraies zones et formations, et des réponses de modèle piégées (métier inventé, salaire, doctorat, HTML, icône inconnue, rappel réécrit) qui doivent toutes être neutralisées. En E2E, le téléchargement du modèle est bloqué : on vérifie que le repli instantané fonctionne et qu'aucune violation CSP n'apparaît.

## 6. Référentiel O*NET et zones de qualification

`scripts/import-onet.mjs` lit `data/table-metiers-onet-fr-jobzones.xlsx` sans dépendance (un .xlsx est un zip de XML) et écrit `src/data/onet.json` : 721 métiers avec code O*NET-SOC, intitulé, zone (colonne « Zone réelle » si renseignée, sinon « jobZone ») et 2 à 3 tags PolarIA attribués par famille SOC puis par mots-clés. Un test vérifie que le JSON est à jour avec le classeur.

Les 41 fiches métier du feed portent leur code O*NET, et leur zone est **celle du référentiel** (test). Quand la consigne et le référentiel divergent (par exemple Esthéticien : zone 2 dans le classeur), c'est le classeur du Centre des Possibles qui fait foi.

| Zone | Durée de préparation |
| --- | --- |
| 1 | 0 à 6 mois |
| 2 | 3 mois à 2 ans |
| 3 | 1 à 4 ans |
| 4 | 2 à 6 ans |
| 5 | 4 à 10 ans |

Filtre « Court (0 à 2 ans) » = zones 1 et 2 ; « Supérieur (1 à 10 ans) » = zones 3 à 5. `rankOnetJobs` trie les métiers par affinité (somme des scores de tags du jeune).
