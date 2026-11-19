# RGPD et secret professionnel

PolarIA est une démonstration de hackathon dans un dépôt **public**. Ces règles sont appliquées par le code et vérifiées par des tests automatiques.

## Données fictives uniquement

- Les cinq profils (Lucas, Inès, Noah, Chloé, Yanis) sont **inventés**. Ils reprennent la structure des rapports du Centre des Possibles, pas le contenu d'un rapport réel.
- Aucune donnée personnelle réelle ne doit être ajoutée au dépôt, ni dans le code, ni dans les captures, ni dans les tests.

## Aucune note libre côté professionnel

Les psychologues et conseillers ne saisissent **jamais** de notes ou de comptes rendus sur la plateforme. Le suivi repose uniquement sur des **tags d'intérêts** et des **scores numériques** :

- les tags viennent d'un **catalogue fermé** (`src/data/tags.ts`) et s'ajoutent par une liste déroulante ;
- les poids se règlent avec des boutons + et -, bornés entre 0 et 100 ;
- le seul champ texte de l'espace Pro est la recherche par prénom : elle filtre l'affichage et n'est jamais enregistrée.

Les deux seuls champs de l’espace Pro sont la recherche (non enregistrée) et l’import PDF.

Contrôles automatiques : la règle ESLint `no-restricted-syntax` interdit `<textarea>`, le test `tests/security/guards.test.ts` refuse `textarea`, `contentEditable` et tout champ de type notes dans les types, et les tests d'intégration et E2E vérifient qu'aucune zone de texte n'existe dans le panneau Pro.

Le badge « Mode RGPD actif » est affiché en permanence dans l'espace Pro.

## Inscription : minimisation et mémoire seule

Le formulaire « Créer un compte (Jeune) » demande prénom, nom, âge, email et mot de passe pour la démonstration, mais **seuls le prénom et l’initiale du nom** sont conservés, **en mémoire uniquement** : rien n’est écrit dans le localStorage (vérifié par test), tout disparaît au rechargement.

## Import du Rapport des Possibles

L’import PDF de l’espace Pro est **simulé** : le contenu du fichier n’est jamais lu ni envoyé (aucun `FileReader`, vérifié par test). Seuls le nom (nettoyé), la taille et la date sont gardés. Le Rapport des Possibles réel ne doit pas être importé sur cette démo publique.

## Où vont les données ?

Nulle part. L'application n'a pas de serveur et notre code ne fait aucun appel réseau (vérifié par test). L'état de la démo (tags, étoiles, vidéos vues) est stocké dans le `localStorage` du navigateur et peut être effacé avec « Réinitialiser la démo ».

Ressources externes : le bandeau obligatoire du hackathon (`orientation.code4sud.fr`) et, uniquement quand la mini-IA locale démarre sur un ordinateur compatible WebGPU, les fichiers publics du modèle (Hugging Face, GitHub). Ces requêtes ne contiennent aucune donnée du jeune : le modèle s'exécute ensuite dans le navigateur, et le JSON qu'il reçoit (prénom, âge, scores, tags, métiers du catalogue) ne sort jamais de l'appareil. Le « Mode instantané » évite tout téléchargement. Les polices Outfit et Inter sont auto-hébergées, aucune requête ne part vers Google.

## Restitution prudente

L'analyse pour les parents se termine toujours par : « Ces éléments sont des pistes de réflexion et non un verdict. » Ce rappel est imposé par le code, même quand le texte vient du modèle d'IA. Les métiers, zones et formations cités viennent toujours du catalogue, et toute phrase qui contient un chiffre ou un diplôme absent des données est remplacée (voir [ALGORITHME.md](ALGORITHME.md)).
