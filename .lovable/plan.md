
# Refonte de l'authentification et des rôles

## Avertissement sécurité (à valider)

Vous avez choisi l'auth 100% custom via la table `associations`. Conséquences acceptées :
- Les mots de passe seront stockés (hachés bcrypt côté serveur — je n'accepte pas le clair même en custom)
- Les RLS Supabase actuelles basées sur `auth.uid()` ne s'appliqueront plus aux utilisateurs custom : tous les accès passeront par des **edge functions** qui filtrent côté serveur selon la session custom
- Le SuperAdmin reste sur Supabase Auth standard (pour le reset email)

## 1. Schéma base de données

**Table `associations`** — ajouter :
- `password_hash` (text, bcrypt) — remplace `password` en clair
- `autorisation_modif` (boolean, défaut false) — coché par superadmin
- `email_contact` (text, optionnel pour mailto)

**Nouvelle table `access_alerts`** :
- `assoc_id`, `type` ('forgot_password'), `message`, `resolved` (bool), `created_at`
- Visible uniquement par superadmin (RLS)

**Nouveau rôle dans associations** : colonne `role_type` ('admin_asso' | 'utilisateur' | 'partenaire_local')
- Le compte global "Partenaires" reste géré comme actuellement (rôle `partenaire` sur Supabase Auth)
- Chaque association peut avoir ses comptes locaux : 1 admin + N utilisateurs + 1 partenaire local

→ Pour simplifier, je propose : **table dédiée `assoc_users`** (assoc_id, login, password_hash, role_type, autorisation_modif, email_contact) — chaque association peut avoir plusieurs comptes. La table `associations` actuelle garde son login/MDP comme compte "admin_asso" par défaut migré automatiquement.

## 2. Edge functions

- `custom-login` : vérifie ID/MDP via bcrypt, renvoie un JWT custom (HS256, secret en env), stocké en cookie httpOnly
- `custom-session` : valide le JWT, renvoie le contexte utilisateur (assoc_id, role_type)
- `custom-logout` : efface le cookie
- `request-access-help` : crée une ligne dans `access_alerts`
- Toutes les opérations CRUD existantes (actions, documents, référentiel) passeront par des helpers qui vérifient le JWT custom OU `auth.uid()` superadmin

## 3. Page de login `/login`

- Supprimer le champ Email, garder **Identifiant + MDP**
- Le superadmin se connecte avec son ID custom (`Superadmin`) — en interne on mappe vers son email Supabase pour `signInWithPassword`
- Bouton "Mot de passe oublié" :
  - Si l'ID saisi = superadmin → flow email Supabase classique
  - Sinon → modale "Une alerte a été envoyée à votre Super Administrateur" + appel à `request-access-help`

## 4. Suppression double connexion

Identifier et retirer le second login (dashboard iframe). Une seule entrée `/login`.

## 5. Page Associations (superadmin)

- Icône d'alerte 🔔 sur la ligne quand `access_alerts` non résolue
- Bouton **"Renvoyer les accès"** par ligne :
  - `window.location.href = "mailto:..."` pré-rempli avec ID + MDP temporaire
  - Le superadmin peut régénérer un MDP avant envoi (modale)
  - Au clic, marque les alertes de cette assoc comme `resolved`
- Checkbox `autorisation_modif` éditable inline
- Sous-table dépliable : liste des `assoc_users` (admin/utilisateur/partenaire local) avec création/suppression

## 6. Tableau de bord superadmin

Ajout d'un widget "Activité" affichant les `access_alerts` récentes (chronologie).

## 7. Permissions par rôle (côté UI + serveur)

| Rôle | Associations | Documents | Actions | Réf. Qualité | Évaluer bénéf. |
|---|---|---|---|---|---|
| Superadmin | Total | Total | Total | Total | Oui |
| admin_asso (Administrateur) | Total | Total | Total | Oui | Oui |
| utilisateur | Sa propre asso, lecture | Sa propre asso | Lecture + modif via modale **si** `autorisation_modif`, pas de suppression | **Inactif** | Oui |
| partenaire_local + global | Lecture seule toutes assos | Lecture | Modale : édite **uniquement Montant** | Remplit | **Inactif** |

Filtrage systématique par `assoc_id` du contexte custom.

## 8. Migration des données existantes

- Hasher les `password` actuels dans `associations` → `password_hash`
- Créer une entrée `assoc_users` par association existante (rôle admin_asso)
- Garder l'ancien compte global Partenaires intact

---

## Détails techniques

- bcrypt via `bcrypt-ts` (compatible edge runtime)
- JWT via `jose`
- Cookie : `httpOnly, secure, sameSite=lax, maxAge=7j`
- Hook `useCustomAuth()` côté React qui appelle `custom-session` au mount + stocke en context
- Toutes les requêtes Supabase actuelles côté front continuent de marcher pour le superadmin ; pour les utilisateurs custom, on les remplace par des appels à des edge functions `list-actions`, `update-action`, etc. qui filtrent par `assoc_id` du JWT
- ⚠️ Ce dernier point représente la majeure partie du travail : refactor de **toutes** les pages qui appellent `supabase.from('actions')`, `documents`, `referentiel_qualite`, `evaluations`

---

## Ampleur

C'est un chantier de **plusieurs heures de travail** qui touche : DB (migration), 6+ edge functions, page login, page associations, dashboard, et refactor de toutes les pages CRUD. Je le ferai en une seule passe mais le diff sera très large.

**Confirmez le plan** (notamment l'usage de `assoc_users`, le hashing bcrypt obligatoire, et le refactor complet des fetches) et je lance.
