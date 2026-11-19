# Algorithme de recommandation et moteur de restitution

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

## 5. Moteur « zéro hallucination »

Aucun modèle de langage n'est appelé : la démo fonctionne hors-ligne et sans clé. Chaque phrase est un **gabarit fixe** dont les trous sont remplis uniquement avec :

- les valeurs du profil (prénom, âge, scores RIASEC, aptitudes, traits, tags) ;
- les titres du catalogue `data/videos.ts`.

### Débrief jeune : « Générer mon avenir »

`generateDebrief(profile, videos)` produit un script de **40 à 60 mots**, au tutoiement, découpé en sous-titres :

1. salutation avec le prénom ;
2. les 2 dimensions RIASEC dominantes, traduites en langage simple (« Réaliste » devient « aimer le concret et bouger ») ;
3. la 1re aptitude, traduite (« Flexibilité des catégories » devient « savoir t'adapter vite ») ;
4. le tag le plus actif sur PolarIA ;
5. en dernier, **2 pistes concrètes** : les 2 vidéos les mieux scorées.

Des phrases optionnelles (2e aptitude, invitation à utiliser l'étoile) sont ajoutées seulement si le texte est sous 40 mots. Le texte est lu à voix haute par la Web Speech API du navigateur quand elle existe.

### Rapport parents : « Générer le rapport d'accompagnement »

`generateParentReport(profile, videos)` suit la structure demandée :

1. **Points forts observés** : 3 dimensions RIASEC dominantes avec leur score, aptitudes et traits du bilan ;
2. **Dynamique d'exploration** : tags les plus actifs, fiches mises en favori, fiches regardées ;
3. **Pistes par durée de formation** : les 6 métiers les mieux scorés, regroupés par zone (0-6 mois à 4-10 ans) ;
4. **Conseils pour accompagner** : textes fixes et bienveillants ;
5. pied de page : « Ces résultats constituent des pistes de réflexion et non une évaluation définitive. »

Il s'imprime proprement (`window.print()` avec une feuille de style dédiée) ou s'enregistre en PDF depuis le navigateur.

### Ce que vérifient les tests

`tests/unit/generate.test.ts` contrôle notamment que le débrief fait entre 40 et 60 mots pour chaque profil, qu'il cite exactement 2 métiers **présents dans le catalogue**, qu'il ne contient aucun terme psychométrique brut, et que chaque nombre du rapport parents est un score réel du profil.

## 6. Brancher un LLM plus tard

Si l'équipe ajoute un modèle de langage, il devra passer par un **backend** (jamais de clé dans le front, le dépôt est public), avec `temperature` à 0, une entrée JSON limitée au profil et au catalogue, et une sortie JSON structurée. Les gabarits actuels restent le repli hors-ligne, et les tests « zéro hallucination » doivent s'appliquer aussi à la sortie du modèle.
