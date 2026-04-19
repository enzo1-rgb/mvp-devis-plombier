import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Quote, QuoteItem, Plombier } from '../lib/types';
import { ArrowLeft, FileText, Mail, Link, Download } from 'lucide-react';
import { pdf } from '@react-pdf/renderer';
import DevisPDF from './DevisPDF';

interface QuotePreviewProps {
  quote: Quote;
  onBack: () => void;
}

interface LigneDevisRow {
  id: string;
  description: string;
  quantite: number;
  prix_unitaire: number;
  montant_ht: number;
}

export default function QuotePreview({ quote, onBack }: QuotePreviewProps) {
  const [items, setItems] = useState<QuoteItem[]>([]);
  const [plombier, setPlombier] = useState<Plombier | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState(quote.status);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [clientEmail, setClientEmail] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showStatusEdit, setShowStatusEdit] = useState(false);
  const [toast, setToast] = useState<{ message: string; ok: boolean } | null>(null);
  const [acceptLoading, setAcceptLoading] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);

  const tvaTaux = quote.tva_rate ?? 0.10;
  const tvaPct = (tvaTaux * 100).toFixed(1);

  useEffect(() => {
    loadData();
  }, [quote.id]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const loadData = async () => {
    setLoading(true);
    await Promise.all([loadLignes(), loadPlombier()]);
    setLoading(false);
  };

  const loadPlombier = async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user?.id;
      if (!userId) return;
      const { data, error } = await supabase
        .from('plombiers')
        .select('*')
        .eq('id', userId)
        .single();
      if (error) throw error;
      setPlombier(data as Plombier);
    } catch (error) {
      console.error('Erreur lors du chargement du plombier:', error);
    }
  };

  const loadLignes = async () => {
    if (!quote.id) return;
    try {
      const { data, error } = await supabase
        .from('lignes_devis')
        .select('id, description, quantite, prix_unitaire, montant_ht')
        .eq('devis_id', quote.id);
      if (error) throw error;
      setItems(
        (data || []).map((r: LigneDevisRow) => ({
          id: r.id,
          description: r.description,
          quantite: Number(r.quantite) || 0,
          prix_unitaire: Number(r.prix_unitaire) || 0,
          montant_ht: Number(r.montant_ht) || 0,
        }))
      );
    } catch (error) {
      console.error('Erreur lors du chargement des lignes:', error);
    }
  };

  const updateStatus = async (newStatus: Quote['status']) => {
    if (!quote.id) return;
    try {
      const { error } = await supabase
        .from('devis')
        .update({ statut: newStatus })
        .eq('id', quote.id);
      if (error) throw error;
      setStatus(newStatus);
    } catch (error) {
      console.error('Erreur lors de la mise à jour du statut:', error);
    }
  };

  const handleAcceptQuote = async () => {
    setAcceptLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user?.id;
      if (!userId) throw new Error('Non authentifié');

      const { data: existing } = await supabase
        .from('factures')
        .select('id')
        .eq('devis_id', quote.id)
        .maybeSingle();

      await updateStatus('accepté');
      setShowStatusEdit(false);

      if (existing) {
        setToast({ message: 'Devis accepté (facture déjà existante).', ok: true });
        return;
      }

      const { data: numData, error: numError } = await supabase.rpc('generate_numero_facture', {
        p_plombier_id: userId,
      });
      if (numError) throw numError;
      const numFacture = numData as string;

      const { error: insertError } = await supabase.from('factures').insert({
        plombier_id: userId,
        devis_id: quote.id,
        client_id: quote.client_id,
        numero_facture: numFacture,
        montant_ht: quote.total_ht,
        tva: quote.tva,
        tva_rate: tvaTaux,
        montant_ttc: quote.total_ttc,
        statut: 'non_payée',
      });
      if (insertError) throw insertError;

      setToast({ message: `Facture ${numFacture} générée !`, ok: true });
    } catch (err) {
      console.error(err);
      setToast({ message: 'Erreur lors de la génération de la facture.', ok: false });
    } finally {
      setAcceptLoading(false);
    }
  };

  const handleCancelConfirmed = async () => {
    setShowCancelConfirm(false);
    await updateStatus('refusé');
  };

  const copyClientLink = async () => {
    if (!quote.id) return;
    const { data } = await supabase
      .from('devis')
      .select('token')
      .eq('id', quote.id)
      .single();
    if (!data?.token) return;
    const url = `${window.location.origin}?token=${data.token}`;
    await navigator.clipboard.writeText(url);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 3000);
  };

  const downloadPDF = async () => {
    setGeneratingPDF(true);
    try {
      const dateEmission = quote.date_emission
        ? new Date(quote.date_emission).toLocaleDateString('fr-FR')
        : quote.created_at
          ? new Date(quote.created_at).toLocaleDateString('fr-FR')
          : '-';

      const dateValidite = quote.date_emission
        ? new Date(new Date(quote.date_emission).getTime() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('fr-FR')
        : undefined;

      const blob = await pdf(
        <DevisPDF
          numero={quote.numero ?? quote.id?.slice(0, 8).toUpperCase() ?? 'DEVIS'}
          dateEmission={dateEmission}
          dateValidite={dateValidite}
          clientNom={quote.client_name}
          clientAdresse={quote.client_address}
          plombier={plombier}
          lignes={items}
          totalHT={quote.total_ht}
          tva={quote.tva}
          tvaPct={tvaPct}
          totalTTC={quote.total_ttc}
          notes={quote.notes}
          signe_par_client={quote.signe_par_client}
          date_signature={quote.date_signature}
        />
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Devis-${quote.client_name}-${quote.numero ?? quote.id?.slice(0, 8)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Erreur PDF:', err);
      alert('Erreur lors de la génération du PDF.');
    } finally {
      setGeneratingPDF(false);
    }
  };

  const getTVA = () => quote.total_ht * tvaTaux;

  const getMentionLegale = () => {
    if (tvaTaux === 0.055) return "TVA au taux de 5,5% applicable pour les travaux d'amélioration énergétique";
    if (tvaTaux === 0.20) return 'TVA au taux de 20% applicable pour les constructions neuves';
    return 'TVA au taux de 10% applicable pour les travaux de rénovation (art. 279-0 bis CGI)';
  };

  const buildEmailHtml = (
    plombierData: { nom: string; prenom: string; adresse: string; siret: string; nom_entreprise?: string } | null,
    emailItems: { description: string; prix_unitaire: number; quantite: number; montant_ht: number }[]
  ) => {
    const plombierBlock = plombierData
      ? `
      <div style="margin: 20px 0; padding: 15px; background: #eff6ff; border-left: 4px solid #2563eb; border-radius: 4px;">
        <h3 style="margin: 0 0 10px 0; color: #1e40af;">Émetteur du devis</h3>
        ${plombierData.nom_entreprise ? `<p style="margin: 0; font-weight: 600;">${String(plombierData.nom_entreprise)}</p>` : ''}
        <p style="margin: ${plombierData.nom_entreprise ? '5px' : '0'} 0 0 0; font-weight: 600;">${String(plombierData.prenom ?? '')} ${String(plombierData.nom ?? '')}</p>
        <p style="margin: 5px 0 0 0; color: #4b5563;">${String(plombierData.adresse ?? '')}</p>
        <p style="margin: 5px 0 0 0; color: #4b5563;">SIRET : ${String(plombierData.siret ?? '')}</p>
      </div>
    `
      : '';

    const lignesRows = emailItems
      .map(
        (item) => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${String(item.description ?? '')}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right;">${Number(item.prix_unitaire || 0).toFixed(2)} €</td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right;">${Number(item.quantite || 0)}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 600;">${Number(item.montant_ht || 0).toFixed(2)} €</td>
      </tr>
    `
      )
      .join('');

    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #2563eb; margin-bottom: 20px;">DEVIS</h1>
        <p style="color: #6b7280;">Date : ${quote.date_emission ? new Date(quote.date_emission).toLocaleDateString('fr-FR') : quote.created_at ? new Date(quote.created_at).toLocaleDateString('fr-FR') : '-'}</p>
        <p style="color: #6b7280; font-size: 14px;">Référence : ${quote.numero ?? quote.id?.slice(0, 8).toUpperCase() ?? '-'}</p>
        <div style="margin: 20px 0; padding: 15px; background: #f9fafb; border-radius: 4px;">
          <h3 style="margin: 0 0 10px 0; color: #374151;">Informations Client</h3>
          <p style="margin: 0; font-weight: 600;">${quote.client_name}</p>
          <p style="margin: 5px 0 0 0; color: #6b7280;">${quote.client_address}</p>
        </div>
        ${plombierBlock}
        <h3 style="margin: 25px 0 10px 0; color: #374151;">Détail des Prestations</h3>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <thead>
            <tr style="background: #2563eb; color: white;">
              <th style="padding: 10px; text-align: left;">Prestation</th>
              <th style="padding: 10px; text-align: right;">Prix unitaire</th>
              <th style="padding: 10px; text-align: right;">Quantité</th>
              <th style="padding: 10px; text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>${lignesRows}</tbody>
        </table>
        ${quote.notes ? `<div style="margin: 20px 0; padding: 15px; background: #fffbeb; border-left: 4px solid #facc15; border-radius: 4px;"><p style="margin: 0; color: #78350f;">${quote.notes}</p></div>` : ''}
        <div style="border-top: 2px solid #2563eb; padding-top: 15px; margin-top: 20px;">
          <p style="margin: 5px 0;"><span style="color: #4b5563;">Total HT :</span> <strong>${quote.total_ht.toFixed(2)} €</strong></p>
          <p style="margin: 5px 0;"><span style="color: #4b5563;">TVA (${tvaPct}%) :</span> <strong>${getTVA().toFixed(2)} €</strong></p>
          <p style="margin: 15px 0 5px 0; font-size: 18px;"><span style="color: #2563eb; font-weight: bold;">Total TTC :</span> <strong>${quote.total_ttc.toFixed(2)} €</strong></p>
        </div>
        <p style="margin-top: 30px; font-size: 12px; color: #9ca3af; text-align: center;">Devis valable 30 jours à compter de la date d'émission. ${getMentionLegale()}.</p>
      </div>
    `;
  };

  const sendEmail = async () => {
    const email = clientEmail.trim();
    if (!email) { setEmailError('Veuillez saisir une adresse email valide.'); return; }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) { setEmailError('Adresse email invalide.'); return; }

    setEmailError(null);
    setSendingEmail(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const plombierId = quote.plombier_id ?? sessionData.session?.user?.id;
      let plombierData: { nom: string; prenom: string; adresse: string; siret: string; nom_entreprise?: string } | null = null;

      if (plombierId) {
        const { data: plombierRow, error: plombierError } = await supabase
          .from('plombiers')
          .select('nom, prenom, adresse, siret, nom_entreprise')
          .eq('id', plombierId)
          .single();
        if (!plombierError && plombierRow) plombierData = plombierRow;
      }

      const { data: lignesData } = await supabase
        .from('lignes_devis')
        .select(`description, quantite, prix_unitaire, montant_ht, prestations (nom)`)
        .eq('devis_id', quote.id);

      const emailItems = (lignesData || []).map((row: { description?: string; quantite?: number; prix_unitaire?: number; montant_ht?: number; prestations?: { nom?: string } | null }) => ({
        description: row.description ?? (row.prestations as { nom?: string } | null)?.nom ?? '',
        quantite: Number(row.quantite) || 0,
        prix_unitaire: Number(row.prix_unitaire) || 0,
        montant_ht: Number(row.montant_ht) || 0,
      }));

      const subject = `Devis - ${quote.client_name} - ${quote.numero ?? 'Sans référence'}`;
      const html = buildEmailHtml(plombierData, emailItems);

      const res = await fetch(`${import.meta.env.VITE_EMAIL_SERVER_URL}/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: email, subject, html }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Erreur ${res.status}`);

      await updateStatus('envoyé');
      setShowEmailForm(false);
      setClientEmail('');
      alert('Devis envoyé par email avec succès.');
    } catch (err) {
      setEmailError(err instanceof Error ? err.message : "Erreur lors de l'envoi.");
    } finally {
      setSendingEmail(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">

      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl shadow-xl font-bold text-sm text-white transition-all ${toast.ok ? 'bg-green-500' : 'bg-red-500'}`}>
          {toast.message}
        </div>
      )}

      <header className="bg-blue-600 text-white shadow-lg">
        <div className="max-w-5xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center">
            <button onClick={onBack} className="mr-4 p-2 hover:bg-blue-700 rounded-lg transition">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <FileText className="w-8 h-8 mr-3" />
            <h1 className="text-2xl sm:text-3xl font-bold">Aperçu du Devis</h1>
          </div>
        </div>
      </header>

      <main className="quote-main max-w-5xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="quote-content bg-white rounded-lg shadow-lg p-8 mb-6">

          <div className="flex justify-between items-start mb-8 pb-6 border-b-2">
            <div>
              <h2 className="text-3xl font-bold text-blue-600 mb-2">DEVIS</h2>
              <p className="text-gray-600">
                Date :{' '}
                {quote.date_emission
                  ? new Date(quote.date_emission).toLocaleDateString('fr-FR')
                  : quote.created_at
                    ? new Date(quote.created_at).toLocaleDateString('fr-FR')
                    : '-'}
              </p>
              <p className="text-gray-600 text-sm">
                Référence : {quote.numero ?? quote.id?.slice(0, 8).toUpperCase() ?? '-'}
              </p>
              {quote.signe_par_client && (
                <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">
                  ✅ Signé électroniquement par le client
                  {quote.date_signature && (
                    <span className="font-normal">
                      {' '}le {new Date(quote.date_signature).toLocaleDateString('fr-FR')}
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="text-right">
              <p className="text-sm text-gray-600 mb-1">Statut</p>

              {status === 'brouillon' && (
                <div className="flex flex-wrap gap-2 justify-end">
                  <button onClick={() => updateStatus('envoyé')} className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition">
                    Marquer comme envoyé
                  </button>
                  <button onClick={() => setShowCancelConfirm(true)} className="px-4 py-2 bg-gray-600 text-white rounded-lg font-semibold hover:bg-gray-700 transition">
                    Annuler
                  </button>
                </div>
              )}

              {status === 'envoyé' && (
                <div className="flex flex-wrap gap-2 justify-end">
                  <button onClick={handleAcceptQuote} disabled={acceptLoading} className="px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition disabled:opacity-50">
                    {acceptLoading ? 'Génération...' : 'Accepté'}
                  </button>
                  <button onClick={() => updateStatus('refusé')} className="px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition">
                    Refusé
                  </button>
                  <button onClick={() => updateStatus('brouillon')} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition">
                    ← Retour
                  </button>
                </div>
              )}

              {(status === 'accepté' || status === 'refusé') && (
                <div className="flex flex-col items-end gap-2">
                  {!showStatusEdit ? (
                    <div className="flex items-center gap-2">
                      <span className={`inline-block px-4 py-2 rounded-lg font-semibold ${status === 'accepté' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {status === 'accepté' ? 'Accepté' : 'Refusé'}
                      </span>
                      <button onClick={() => setShowStatusEdit(true)} className="px-3 py-2 text-sm bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition">
                        Modifier
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2 justify-end">
                      <button onClick={() => { updateStatus('brouillon'); setShowStatusEdit(false); }} className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition text-sm">
                        Brouillon
                      </button>
                      <button onClick={handleAcceptQuote} disabled={acceptLoading} className="px-3 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition text-sm disabled:opacity-50">
                        {acceptLoading ? '...' : 'Accepté'}
                      </button>
                      <button onClick={() => { updateStatus('refusé'); setShowStatusEdit(false); }} className="px-3 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition text-sm">
                        Refusé
                      </button>
                      <button onClick={() => setShowStatusEdit(false)} className="px-3 py-2 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition text-sm">
                        Annuler
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {plombier && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Émetteur du devis</h3>
              <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-600">
                {plombier.nom_entreprise && <p className="font-semibold text-gray-800 text-lg">{plombier.nom_entreprise}</p>}
                <p className="font-semibold text-gray-800 text-lg">{plombier.prenom || ''} {plombier.nom || ''}</p>
                <p className="text-gray-600">{plombier.adresse || ''}</p>
                <p className="text-gray-600 mt-1">SIRET : {plombier.siret || ''}</p>
              </div>
            </div>
          )}

          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Informations Client</h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="font-semibold text-gray-800 text-lg">{quote.client_name}</p>
              <p className="text-gray-600">{quote.client_address}</p>
            </div>
          </div>

          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Détail des Prestations</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-blue-600 text-white">
                    <th className="px-4 py-3 text-left rounded-tl-lg">Prestation</th>
                    <th className="px-4 py-3 text-right">Prix unitaire</th>
                    <th className="px-4 py-3 text-right">Quantité</th>
                    <th className="px-4 py-3 text-right rounded-tr-lg">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => (
                    <tr key={item.id ?? index} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                      <td className="px-4 py-3 text-gray-800">{item.description}</td>
                      <td className="px-4 py-3 text-right text-gray-600">{item.prix_unitaire.toFixed(2)} €</td>
                      <td className="px-4 py-3 text-right text-gray-600">{item.quantite}</td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-800">{item.montant_ht.toFixed(2)} €</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {quote.notes && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Notes</h3>
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
                <p className="text-gray-700 whitespace-pre-wrap">{quote.notes}</p>
              </div>
            </div>
          )}

          <div className="border-t-2 pt-6">
            <div className="flex justify-end">
              <div className="w-full sm:w-96 space-y-3">
                <div className="flex justify-between text-lg">
                  <span className="text-gray-700">Total HT</span>
                  <span className="font-semibold">{quote.total_ht.toFixed(2)} €</span>
                </div>
                <div className="flex justify-between text-lg">
                  <span className="text-gray-700">TVA ({tvaPct}%)</span>
                  <span className="font-semibold">{getTVA().toFixed(2)} €</span>
                </div>
                <div className="border-t-2 border-blue-600 pt-3 flex justify-between text-2xl">
                  <span className="text-blue-700 font-bold">Total TTC</span>
                  <span className="text-blue-700 font-bold">{quote.total_ttc.toFixed(2)} €</span>
                </div>
              </div>
            </div>
          </div>

          <div className="quote-legal mt-6 pt-4 border-t text-center text-xs text-gray-500">
            <p>Devis valable 30 jours à compter de la date d'émission</p>
            <p className="mt-1">{getMentionLegale()}</p>
          </div>
        </div>

        <div className="text-center space-y-4">
          <div className="flex flex-wrap justify-center gap-3">
            <button
              onClick={downloadPDF}
              disabled={generatingPDF}
              className="flex items-center px-8 py-3 bg-slate-800 text-white rounded-lg hover:bg-slate-900 transition font-semibold shadow-md disabled:opacity-50"
            >
              <Download className="w-5 h-5 mr-2" />
              {generatingPDF ? 'Génération...' : 'Télécharger PDF'}
            </button>
            <button
              onClick={() => window.print()}
              className="flex items-center px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold shadow-md"
            >
              Imprimer
            </button>
            <button
              onClick={() => { setShowEmailForm(!showEmailForm); setEmailError(null); setClientEmail(''); }}
              className="flex items-center px-8 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition font-semibold shadow-md"
            >
              <Mail className="w-5 h-5 mr-2" />
              Envoyer par email
            </button>
            <button
              onClick={copyClientLink}
              className="flex items-center px-8 py-3 bg-blue-700 text-white rounded-lg hover:bg-blue-800 transition font-semibold shadow-md"
            >
              <Link className="w-5 h-5 mr-2" />
              {linkCopied ? '✅ Lien copié !' : 'Copier le lien client'}
            </button>
          </div>

          {showEmailForm && (
            <div className="bg-white border border-gray-200 rounded-lg shadow-md p-6 max-w-md mx-auto text-left">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Envoyer le devis par email</h3>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Email du client</label>
                <input
                  type="email"
                  value={clientEmail}
                  onChange={(e) => { setClientEmail(e.target.value); setEmailError(null); }}
                  placeholder="client@exemple.fr"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  disabled={sendingEmail}
                />
              </div>
              {emailError && <p className="text-red-600 text-sm mb-3">{emailError}</p>}
              <div className="flex gap-2">
                <button onClick={sendEmail} disabled={sendingEmail} className="flex-1 flex items-center justify-center px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition font-medium">
                  {sendingEmail ? 'Envoi en cours...' : 'Envoyer'}
                </button>
                <button onClick={() => { setShowEmailForm(false); setEmailError(null); setClientEmail(''); }} disabled={sendingEmail} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition">
                  Annuler
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {showCancelConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Annuler ce devis ?</h3>
            <p className="text-gray-500 text-sm mb-6">
              Le devis sera marqué comme <strong className="text-red-600">refusé</strong>.
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowCancelConfirm(false)} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition">
                Retour
              </button>
              <button onClick={handleCancelConfirmed} className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white transition">
                Confirmer l'annulation
              </button>
            </div>
          </div>
        </div>
      )}

      <style>
        {`
          @media print {
            @page { size: A4; margin: 12mm; }
            header, button { display: none !important; }
            body { background: white !important; }
            .quote-main { padding: 0 1rem !important; }
            .quote-content { box-shadow: none !important; padding: 0 !important; margin: 0 !important; page-break-inside: avoid; }
            .quote-content [class*="mb-8"] { margin-bottom: 10px !important; }
            .quote-content [class*="mb-4"] { margin-bottom: 6px !important; }
            .quote-content [class*="mb-3"] { margin-bottom: 4px !important; }
            .quote-content [class*="mb-2"] { margin-bottom: 2px !important; }
            .quote-content [class*="py-3"] { padding-top: 4px !important; padding-bottom: 4px !important; }
            .quote-content table { font-size: 11px; }
            .quote-legal { margin-top: 6px !important; padding-top: 4px !important; font-size: 9px !important; }
          }
        `}
      </style>
    </div>
  );
}