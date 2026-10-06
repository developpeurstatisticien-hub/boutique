# Noma Atelier — boutique en ligne

Application Next.js en français pour une boutique composée d’un accueil vidéo et d’un espace boutique.

## Démarrer le projet

```bash
npm install
npm run local:setup
npm run dev
```

Ouvrir ensuite [http://localhost:3000](http://localhost:3000). La première commande démarre PostgreSQL sur votre ordinateur avec Docker, configure des secrets locaux dans `.env` (et sauvegarde l’ancienne version), installe le schéma, ajoute des produits de démonstration et crée un compte administrateur avec un mot de passe aléatoire affiché une seule fois dans le terminal. Les images, vidéos et preuves de paiement de test sont conservées dans `local-media/`. Docker Desktop doit être démarré et une connexion internet est nécessaire au premier démarrage pour télécharger l’image PostgreSQL. La base reste dans un volume Docker lorsque vous arrêtez le site ; `npm run local:stop` arrête PostgreSQL sans effacer les données. Une deuxième exécution de `npm run local:setup` réinitialise et réaffiche le mot de passe administrateur.

L’environnement local utilise Bankily, Masrvi et Sedad avec le numéro destinataire configuré. Les transferts restent manuels : utilisez uniquement des essais sans transfert d’argent réel, et n’indiquez une commande comme payée qu’après avoir vérifié son justificatif. Les médias sont stockés sur l’ordinateur uniquement en développement ; le stockage S3 documenté plus bas reste nécessaire pour le déploiement.

## Déploiement sur Netlify

Le projet est configuré pour Netlify avec `netlify.toml` et le plugin officiel `@netlify/plugin-nextjs`. Le répertoire de base y est fixé à `.` (la racine du projet) : cette racine contient `app/`, `package.json`, `next.config.ts`, `schema.prisma` et `prisma/`. L’App Router complet, y compris `app/page.tsx` et `app/layout.tsx`, est conservé. Les composants réutilisables restent séparés dans `src/components/admin/` et `src/components/store/`, et les bibliothèques dans `src/lib/`. À l’importation, sélectionnez le dossier qui contient `app/`, `package.json`, `schema.prisma`, `netlify.toml` et `prisma/`. Le schéma Prisma utilisé par Netlify est explicitement `./schema.prisma` à la racine et le build le transmet avec `--schema`. Si vous déployez l’archive ZIP, extrayez tout son contenu et envoyez la version mise à jour, sans déposer seulement `netlify.toml` et `package.json`. La commande de build génère Prisma avant de compiler Next.js, puis le runtime Netlify gère les pages et fonctions ; ne remplacez pas le projet par un export HTML statique.

Dans **Netlify → Site configuration → Environment variables**, configurez au minimum `DATABASE_URL`, `DIRECT_URL` et `SESSION_SECRET` avant d’utiliser le site. Ajoutez aussi `S3_BUCKET`, `S3_REGION`, `S3_ENDPOINT` si nécessaire, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` et `MEDIA_PUBLIC_BASE_URL` pour les fichiers médias. Pour recevoir les paiements sur le même numéro avec les trois opérateurs, définissez `PAYMENT_BANKILY_NUMBER`, `PAYMENT_MASRVI_NUMBER` et `PAYMENT_SEDAD_NUMBER` à `+222 41 64 99 04`, puis redéployez le site. Cette configuration est déjà indiquée dans `.env.example` ; Netlify ne récupère pas automatiquement les valeurs du fichier `.env` local.

Déployez le SQL Supabase et créez le compte administrateur une seule fois depuis le terminal du projet local configuré. Les déploiements Netlify ne lancent pas les migrations ni la création de compte automatiquement.

Le navigateur envoie les images/vidéos d’administration vers un URL S3 temporaire : dans la configuration CORS de votre stockage, autorisez `PUT` depuis l’URL de votre site Netlify et depuis votre domaine final, et autorisez les en-têtes `Content-Type` et `Cache-Control`. Les preuves de paiement sont téléversées côté serveur dans le préfixe privé `payment-proofs/` (10 Mo maximum) et ne doivent pas être rendues publiques. Limitez les images à 8 Mo et les vidéos à 100 Mo.

Si la construction échoue encore, copiez le premier bloc `Error` des journaux de déploiement Netlify (sans secrets) : les erreurs propres à un compte, un secret ou une connexion à la base ne peuvent pas être déterminées sans ce journal.

Pour contrôler et compiler le projet :

```bash
npm run lint
npm run build
```

## Espaces

- `/` — présentation vidéo et lien d’entrée dans la boutique, définis dans `app/`.
- `/boutique` — catalogue responsive, recherche, filtres par catégorie et panier avec modification des quantités et suppression d’articles.
- `/commande` — formulaire de coordonnées, livraison, choix de paiement et sélection obligatoire d’une preuve.
- `/commande/suivi/<jeton>` — suivi privé de l’état d’une commande après son enregistrement.
- `/admin` — tableau de bord derrière authentification.

Les produits et catégories visibles sont des données de démonstration à remplacer par le catalogue réel. Les prix sont présentés en MRU, conformément à la devise indiquée, mais les montants d’exemple, le nom et les textes restent provisoires. Le formulaire propose Bankily, Masrvi et Sedad, tous configurés pour afficher le numéro de paiement `+222 41 64 99 04`.

Lorsque PostgreSQL est configuré, l’accueil charge les vidéos actives depuis la base et le catalogue public affiche les produits actifs gérés dans l’administration. Sans `DATABASE_URL`, les pages publiques restent en mode démonstration.

## Base de données et premier administrateur

Le schéma PostgreSQL est défini dans `prisma/schema.prisma`. L’adresse Supabase `/rest/v1/` est l’API REST et la clé `sb_publishable_…` est une clé publique : ni l’une ni l’autre ne remplace les URI de connexion PostgreSQL attendues ici.

Dans PowerShell, créez votre fichier d’environnement local non publié :

```powershell
Copy-Item .env.example .env
```

L’archive de livraison contient `.env.example`, mais jamais `.env`, les dépendances installées ou les fichiers de build. Après extraction, installez les dépendances avec `npm install`, puis copiez `.env.example` vers `.env` et renseignez vos propres paramètres privés.

Dans `.env`, copiez `DATABASE_URL` depuis **Supabase → Connect → Session pooler** et `DIRECT_URL` depuis **Supabase → Connect → Direct connection**. Si l’accès direct n’est pas disponible depuis votre réseau, utilisez l’URI pooler de session de Supabase également pour `DIRECT_URL`. Remplacez les valeurs d’exemple et définissez un `SESSION_SECRET` aléatoire d’au moins 32 caractères. Conservez les mots de passe dans `.env` et ne les envoyez pas dans le chat ou dans Git.

### Installer la base dans Supabase

Méthode recommandée depuis le projet, après avoir renseigné `.env` :

```bash
npm run db:generate
npm run db:deploy
```

Vous pouvez aussi ouvrir `supabase/schema.sql` dans un éditeur SQL, copier tout son contenu dans **Supabase → SQL Editor → New query**, puis exécuter la requête. Le SQL crée les 11 tables, les relations, les index et active Row Level Security sans ouvrir d’accès public ; il ne crée ni compte administrateur, ni produit.

**Choisissez une seule méthode pour le premier déploiement.** Si vous utilisez l’éditeur SQL, indiquez ensuite les migrations déjà présentes dans la base avant d’utiliser `db:deploy` :

```bash
npx prisma migrate resolve --applied 20261002000000_init
npx prisma migrate resolve --applied 20261002003000_media_urls
```

```bash
npm run admin:create -- administrateur@example.com "un-mot-de-passe-long-et-unique"
```

En développement, utiliser `npm run db:migrate` après une modification du schéma pour créer une migration.

La connexion utilise un mot de passe haché et un cookie de session HTTP-only, SameSite Strict et signé ; sans session valide, `/admin` redirige vers `/admin/connexion`. Le compte initial se crée par la commande d’administration, jamais depuis la page publique.

Pour utiliser l’adresse e-mail et le mot de passe que vous possédez, créez ou réinitialisez le compte dans votre base avec `npm run admin:create -- votre-email "votre-mot-de-passe"` après avoir configuré `.env`, puis connectez-vous à `/admin/connexion`. Gardez le mot de passe privé et ne le mettez jamais dans le code ou dans Git.

La gestion des vidéos et des photos nécessite un stockage objet compatible S3. Configurez `S3_BUCKET`, `S3_REGION`, `S3_ENDPOINT` si nécessaire, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` et `MEDIA_PUBLIC_BASE_URL` dans `.env`. Rendez publiquement lisibles uniquement les préfixes `images/` et `videos/`; gardez tout préfixe contenant des preuves de paiement privé.

## État actuel et mise en production

Le panier est conservé dans le stockage local du navigateur. La création de commande vérifie à nouveau côté serveur les produits, prix et stocks, réserve le stock dans une transaction PostgreSQL, enregistre les coordonnées, les lignes et l’historique, puis conserve la preuve dans le stockage privé. Le client reçoit un lien de suivi contenant un jeton aléatoire ; cette page n’affiche pas son adresse ni son téléphone. Lorsqu’une commande est refusée, le stock réservé est restitué ; lors d’une réactivation, la disponibilité est revérifiée.

Les commandes sont désactivées tant que la base PostgreSQL, le stockage objet et au moins un numéro destinataire de paiement ne sont pas configurés. Les numéros affichés doivent être les vrais comptes de réception de la boutique. Configurez et testez ces services en environnement de préproduction avant d’accepter des paiements réels.

Avant la mise en production, configurez aussi les sauvegardes de la base et du stockage, puis testez la restauration. La limitation persistante des tentatives de connexion et les tests de bout en bout sur un vrai déploiement doivent être ajoutés/validés avec les services d’hébergement choisis ; ils ne sont pas remplacés par la compilation locale.
