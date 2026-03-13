# Fonction send-email

Cette Edge Function envoie des emails via l'API Resend.

## Configuration des secrets

Configurez la clé API Resend dans Supabase :

```bash
supabase secrets set RESEND_API_KEY=re_xxxxxxxxx
```

Optionnel - adresse d'expéditeur (domaine vérifié dans Resend) :

```bash
supabase secrets set RESEND_FROM_EMAIL="Mon entreprise <devis@mondomaine.com>"
```

Sans `RESEND_FROM_EMAIL`, l'adresse par défaut est `Devis <onboarding@resend.dev>` (domaine de test Resend).

## Déploiement

```bash
supabase functions deploy send-email
```
