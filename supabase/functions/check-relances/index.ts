const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
  
  Deno.serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders });
    }
  
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const resendKey = Deno.env.get('RESEND_API_KEY')!;
  
      // Récupère toutes les factures non payées
      const facturesRes = await fetch(`${supabaseUrl}/rest/v1/factures?statut=eq.non_payée&select=*,clients(nom,email,adresse),plombiers(nom,prenom,nom_entreprise,siret,adresse,delai_paiement,taux_penalite)`, {
        headers: {
          'apikey': serviceKey,
          'Authorization': `Bearer ${serviceKey}`,
        },
      });
      const factures = await facturesRes.json();
  
      const now = new Date();
      let envoyes = 0;
      let ignores = 0;
  
      for (const f of factures) {
        // Max 3 relances
        if (f.nb_relances >= 3) { ignores++; continue; }
  
        // Pas d'email client → skip
        const emailClient = f.clients?.email;
        if (!emailClient) { ignores++; continue; }
  
        const delai = f.plombiers?.delai_paiement ?? 30;
        const dateEmission = new Date(f.date_emission || f.created_at);
        const dateEcheance = new Date(dateEmission);
        dateEcheance.setDate(dateEcheance.getDate() + delai);
  
        // Pas encore échu → skip
        if (now < dateEcheance) { ignores++; continue; }
  
        // Délai minimum entre deux relances : 15 jours
        if (f.derniere_relance) {
          const derniereRelance = new Date(f.derniere_relance);
          const diffJours = (now.getTime() - derniereRelance.getTime()) / (1000 * 60 * 60 * 24);
          if (diffJours < 15) { ignores++; continue; }
        }
  
        const joursRetard = Math.floor((now.getTime() - dateEcheance.getTime()) / (1000 * 60 * 60 * 24));
        const numeroRelance = f.nb_relances + 1;
        const plombier = f.plombiers;
        const client = f.clients;
  
        const html = `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
            <h2 style="color:#d97706">⚠️ Rappel de paiement — Facture ${f.numero_facture}</h2>
            <p style="color:#6b7280">Relance n°${numeroRelance} — ${joursRetard} jour${joursRetard > 1 ? 's' : ''} de retard</p>
  
            ${plombier ? `
            <div style="margin:20px 0;padding:15px;background:#fffbeb;border-left:4px solid #f59e0b;border-radius:4px">
              <strong>${plombier.nom_entreprise || `${plombier.prenom} ${plombier.nom}`}</strong><br/>
              <span style="color:#6b7280">${plombier.adresse || ''}<br/>SIRET : ${plombier.siret || ''}</span>
            </div>` : ''}
  
            <p>Bonjour <strong>${client?.nom || ''}</strong>,</p>
            <p>Sauf erreur de notre part, la facture <strong>${f.numero_facture}</strong> d'un montant de <strong>${Number(f.montant_ttc).toFixed(2)} €</strong> est toujours en attente de règlement.</p>
            <p>Date d'échéance : <strong>${dateEcheance.toLocaleDateString('fr-FR')}</strong></p>
  
            <div style="margin:24px 0;padding:16px;background:#f9fafb;border-radius:8px;text-align:center">
              <p style="font-size:24px;font-weight:bold;color:#d97706;margin:0">${Number(f.montant_ttc).toFixed(2)} €</p>
              <p style="color:#6b7280;margin:4px 0 0">à régler dès que possible</p>
            </div>
  
            <p style="font-size:12px;color:#9ca3af;margin-top:24px">
              En cas de retard de paiement, des pénalités au taux de ${plombier?.taux_penalite || '3 fois le taux légal'} sont applicables, ainsi qu'une indemnité forfaitaire de recouvrement de 40 € (art. L441-10 Code de Commerce).
            </p>
          </div>`;
  
        // Envoie l'email
        const emailRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: Deno.env.get('RESEND_FROM_EMAIL') ?? 'Relance <onboarding@resend.dev>',
            to: [emailClient],
            subject: `Rappel de paiement — Facture ${f.numero_facture} (${joursRetard}j de retard)`,
            html,
          }),
        });
  
        if (emailRes.ok) {
          // Met à jour le compteur de relances
          await fetch(`${supabaseUrl}/rest/v1/factures?id=eq.${f.id}`, {
            method: 'PATCH',
            headers: {
              'apikey': serviceKey,
              'Authorization': `Bearer ${serviceKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              nb_relances: f.nb_relances + 1,
              derniere_relance: now.toISOString(),
            }),
          });
          envoyes++;
        }
      }
  
      return new Response(
        JSON.stringify({ ok: true, envoyes, ignores }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (error) {
      console.error('check-relances error:', error);
      return new Response(
        JSON.stringify({ error: error instanceof Error ? error.message : 'Erreur interne' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }
  });