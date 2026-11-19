# Architecture de PolarIA

**Dernière mise à jour :** 19 novembre 2026
**Point d'entrée :** `index.html` puis `src/main.tsx`

## Vue d'ensemble

Application web 100 % statique (SPA), sans serveur ni appel réseau. Elle est construite par Vite dans `dist/` et publiée par le workflow GitHub Pages fourni par Code4Sud (`.github/workflows/pages.yml`).

```
index.html (bandeau Code4Sud, CSP au build)
   └─ src/main.tsx  HashRouter + synchro inter-onglets + hauteur du bandeau
        └─ src/App.tsx  routes
             ├─ /                       routes/Landing.tsx
             ├─ /app                    routes/YouthApp.tsx
             │    ├─ components/Feed.tsx          feed vertical, étoile, watch time, swipe
             │    ├─ components/DebriefStory.tsx  « Générer mon avenir » + voix
             │    └─ components/Bilan.tsx         radar, tags, rapport parents
             ├─ /app/details/:videoId   routes/Details.tsx
             └─ /pro                    routes/Pro.tsx  tableau + éditeur de tags

          UI ──lit/écrit──▶ store/useStore.ts (Zustand + localStorage)
                                 │ appelle
                                 ▼
          engine/signals.ts    (étoile, regard, édition pro : fonctions pures)
          engine/recommend.ts  (score, tri, exploration)
          engine/generate.ts   (débrief jeune, rapport parents)
                                 │ s'appuie sur
                                 ▼
          data/profiles.ts  data/videos.ts  data/tags.ts   (catalogues fermés)
          domain/types.ts   domain/validation.ts           (contrats + assainissement)
```

Les URL utilisent un `#` (`/#/app`) car GitHub Pages ne sait pas renvoyer `index.html` pour une route inconnue.

## Modules

| Module | Rôle | Exports principaux |
| --- | --- | --- |
| `src/domain/types.ts` | Types du domaine | `YouthProfile`, `ReelVideo`, `RiasecKey`, `JobZone`, `ZONE_LABELS`, bornes des scores |
| `src/domain/validation.ts` | Revalide tout ce qui sort du localStorage | `sanitizeProfile`, `sanitizeProfiles` |
| `src/data/tags.ts` | Catalogue fermé des 12 tags et leur lien RIASEC | `TAG_RIASEC`, `ALL_TAGS`, `isKnownTag`, `riasecOfTag` |
| `src/data/profiles.ts` | 3 profils fictifs (Lucas, Emma, Yanis) | `SEED_PROFILES`, `DEFAULT_PROFILE_ID` |
| `src/data/videos.ts` | 15 « fake vidéos » de métiers | `VIDEOS`, `getVideoById` |
| `src/engine/recommend.ts` | Classement du feed | `scoreVideo`, `rankVideos`, `buildFeed`, `secondaryRiasec` |
| `src/engine/signals.ts` | Mises à jour des scores | `toggleStar`, `recordWatch`, `addTag`, `adjustTag`, `removeTag`, `topTags` |
| `src/engine/generate.ts` | Restitution déterministe | `generateDebrief`, `generateParentReport`, `plainRiasec`, `plainCognitive` |
| `src/store/useStore.ts` | État global persistant | `useStore`, `useCurrentYouth`, `enableCrossTabSync`, `syncProfilesFromStorage` |
| `src/lib/radar.ts` | Géométrie du radar SVG | `radarPoints`, `toPath` |
| `src/lib/speech.ts` | Lecture vocale (Web Speech API) | `speak`, `stopSpeaking`, `canSpeak` |
| `src/lib/banner.ts` | Mesure du bandeau Code4Sud | `trackBannerHeight` |
| `src/components/ui.tsx` | Composants partagés | `Logo`, `StarIcon`, `RadarChart`, `TagBars`, `RgpdBadge`, `Toast` |

## Flux de données

1. Au démarrage, le store lit `localStorage["polaria-demo-v1"]` et **revalide** chaque champ (`domain/validation.ts`). L'identité et les résultats du bilan viennent toujours de `data/profiles.ts` ; seuls les tags, étoiles et vidéos vues sont repris.
2. Une action (étoile, regard de plus de 3 s, bouton +/- du pro) appelle une fonction pure de `engine/signals.ts` qui renvoie un nouveau profil. Le store le persiste.
3. Les vues recalculent le feed (`buildFeed`) et les textes (`generateDebrief`, `generateParentReport`) à partir du profil.
4. Si `/app` et `/pro` sont ouverts dans deux onglets, l'événement `storage` propage les profils (pas la session) à l'autre onglet.

## Design system « Horizon Azur »

Tout est dans `src/styles/global.css` : jetons de couleur (`--indigo #5b5ff6`, `--azur #0ea5e9`, `--rose #e12d8b`, fond `#eef3ff`), cartes `.glass`, polices Outfit (titres) et Inter (texte). Le feed jeune utilise des dégradés sombres immersifs ; le bilan, les fiches et l'espace Pro restent clairs.

## Dépendances d'exécution

| Paquet | Usage |
| --- | --- |
| `react`, `react-dom` | Interface |
| `react-router-dom` | Routage (HashRouter) |
| `zustand` | Store global et persistance |
| `framer-motion` | Geste de swipe horizontal |

## Voir aussi

[ALGORITHME.md](ALGORITHME.md) · [TESTS.md](TESTS.md) · [RGPD.md](RGPD.md) · [../SECURITY.md](../SECURITY.md)
