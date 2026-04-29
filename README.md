# ProPlomb

**Application SaaS de gestion de devis et factures pour plombiers.**

ProPlomb permet à un artisan plombier de créer, envoyer et suivre ses devis et factures depuis son téléphone ou son ordinateur, sans avoir besoin de compétences comptables.

---

## Aperçu

ProPlomb existe en deux versions adaptées à l'usage terrain :

### Version mobile
Pensée pour le plombier sur chantier. Interface épurée, boutons larges, navigation rapide. Le plombier peut créer un devis en quelques secondes depuis son téléphone, directement chez le client.

### Version desktop
Pensée pour la gestion administrative depuis le bureau. Tableau des prestations, vue d'ensemble des devis et factures, accès aux statistiques, gestion du profil professionnel.

---

## Fonctionnalités disponibles

### Devis
- Création de devis avec sélection rapide de prestations pré-enregistrées
- Calcul automatique HT / TVA / TTC avec taux configurables (5.5%, 10%, 20%)
- Numérotation séquentielle automatique
- Statuts : Brouillon, Envoyé, Accepté, Refusé
- Aperçu et téléchargement PDF
- Portail client pour signature électronique du devis

### Factures
- Génération fonctionnelle de la facture
- Numérotation séquentielle automatique (format FACT-AAAA-XXXXX)
- Statuts : Non payée, Payée
- Aperçu et téléchargement PDF
- Marquage comme payée en un clic

### Prestations
- Catalogue de prestations personnalisables (nom, prix unitaire, unité)
- Sélection rapide depuis la création de devis
- Gestion complète : ajout, modification, suppression

### Profil plombier
- Informations de l'entreprise (nom, adresse, téléphone, email)
- Informations légales : numéro SIRET, forme juridique, N° TVA, N° RCS/RNE
- Conditions de règlement : délai de paiement, taux de pénalités, IBAN
- Ces informations s'intègrent automatiquement sur chaque devis et facture

### Authentification
- Inscription et connexion sécurisées via Supabase Auth
- Isolation complète des données par utilisateur (Row Level Security)
- Politique de confidentialité & RGPD

### Statistiques
- Tableau de bord avec chiffre d'affaires, nombre de devis et de factures

---

## Fonctionnalités à venir (V2)

- Vérification d'un domaine personnalisé pour l'envoi d'e-mails (actuellement limité par Resend en mode sandbox)
- Relances automatiques pour les factures impayées
- Export comptable (CSV)
- Multi-utilisateurs / gestion d'équipe
- Gallerie photos
- Fonctionnalités vocales

---

## Stack technique

| Couche | Technologie |
|---|---|
| Frontend | React, TypeScript, Vite, Tailwind CSS |
| Backend / BDD | Supabase (PostgreSQL, Auth, Edge Functions, RLS) |
| Déploiement | Vercel (CI/CD automatisé via GitHub) |
| Emails | Resend via Supabase Edge Functions (Deno/TypeScript) |
| Éditeur | Cursor |

---


## Démo en ligne

[https://mvp-devis-plombier.vercel.app](https://mvp-devis-plombier.vercel.app)

---

## À propos

Projet personnel développé en autonomie dans le cadre d'un apprentissage du développement web full-stack.  
Développé avec l'assistance de l'IA générative (Claude) et l'éditeur Cursor.

> Projet en cours de développement actif - certaines fonctionnalités sont encore en cours de finalisation.
