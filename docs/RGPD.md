# RGPD et secret professionnel

PolarIA est une démonstration de hackathon dans un dépôt **public**. Ces règles sont appliquées par le code et vérifiées par des tests automatiques.

## Données fictives uniquement

- Les trois profils (Lucas, Emma, Yanis) sont **inventés**. Ils reprennent la structure des rapports du Centre des Possibles, pas le contenu d'un rapport réel.
- Aucune donnée personnelle réelle ne doit être ajoutée au dépôt, ni dans le code, ni dans les captures, ni dans les tests.

## Aucune note libre côté professionnel

Les psychologues et conseillers ne saisissent **jamais** de notes ou de comptes rendus sur la plateforme. Le suivi repose uniquement sur des **tags d'intérêts** et des **scores numériques** :

- les tags viennent d'un **catalogue fermé** (`src/data/tags.ts`) et s'ajoutent par une liste déroulante ;
- les poids se règlent avec des boutons + et -, bornés entre 0 et 100 ;
- le seul champ texte de l'espace Pro est la recherche par prénom : elle filtre l'affichage et n'est jamais enregistrée.

Contrôles automatiques : la règle ESLint `no-restricted-syntax` interdit `<textarea>`, le test `tests/security/guards.test.ts` refuse `textarea`, `contentEditable` et tout champ de type notes dans les types, et les tests d'intégration et E2E vérifient qu'aucune zone de texte n'existe dans le panneau Pro.

Le badge « Mode RGPD actif » est affiché en permanence dans l'espace Pro.

## Où vont les données ?

Nulle part. L'application n'a pas de serveur et ne fait aucun appel réseau (vérifié par test). L'état de la démo (tags, étoiles, vidéos vues) est stocké dans le `localStorage` du navigateur et peut être effacé avec « Réinitialiser la démo ».

Seule ressource externe chargée : le bandeau obligatoire du hackathon (`orientation.code4sud.fr`). Les polices Outfit et Inter sont auto-hébergées, aucune requête ne part vers Google.

## Restitution prudente

Le rapport parents se termine toujours par : « Ces résultats constituent des pistes de réflexion et non une évaluation définitive. » Le moteur ne produit aucun texte qui ne soit pas tiré du profil ou du catalogue (voir [ALGORITHME.md](ALGORITHME.md)).
