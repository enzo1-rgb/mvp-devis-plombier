import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Plombier } from '../lib/types';
import { ArrowLeft, Receipt, Mail, Printer, CheckCircle2 } from 'lucide-react';

interface Invoice {
  id: string;
  numero_facture: string;
  montant_ht: number;
  tva: number;
  montant_ttc: number;
  statut: 'payée' | 'non_payée';
  date_emission: string;
  created_at: string;
  client_id?: string;
  devis_id?: string;
  plombier_id?: string;
  client_name?: string;
  client_address?: string;
}

interface InvoicePreviewProps {
  invoice: Invoice;
  onBack: () => void;
}

interface LigneRow {
  id: string;
  description: string;
  quantite: number;
  prix_unitaire: number;
  montant_ht: number;
}

export default function InvoicePreview({ invoice, onBack }: InvoicePreviewProps) {
  const [lignes, setLignes] = useState<LigneRow[]>([]);
  const [plombier, setPlombier] = useState<Plombier | null>(null);
  const [clientInfo, setClientInfo] = useState<{ nom: string; adresse?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [statut, setStatut] = useState(invoice.statut);
  const [toggling, setToggling] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [clientEmail, setClientEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; ok: boolean } | null>(null);

  useEffect(() => {
    loadAll();
  }, [invoice.id]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const loadAll = async () => {
    setLoading(true);
    await Promise.all([loadPlombier(), loadClient(), loadLignes()]);
    setLoading(false);
  };

  const loadPlombier = async () => {
    const { data: session } = await supabase.auth.getSession();
    const uid = session.session?.user?.id;
    if (!uid) return;
    const { data } = await supabase.from('plombiers').select('*').eq('id', uid).single();
    if (data) setPlombier(data as Plombier);
  };

  const loadClient = async () => {
    if (!invoice.client_id) return;
    const { data } = await supabase
      .from('clients')
      .select('nom, adresse')
      .eq('id', invoice.client_id)
      .single();
    if (data) setClientInfo(data);
  };

  const loadLignes = async () => {
    if (!invoice.devis_id) return;
    const { data } = await supabase
      .from('lignes_devis')
      .select('id, description, quantite, prix_unitaire, montant_ht')
      .eq('devis_id', invoice.devis_id);
    setLignes(
      (data || []).map((r) => ({
        id: r.id,
        description: r.description,
        quantite: Number(r.quantite),
        prix_unitaire: Number(r.prix_unitaire),
        montant_ht: Number(r.montant_ht),
      }))
    );
  };

  const togglePayment = async () => {
    setToggling(true);
    const newStatut = statut === 'payée' ? 'non_payée' : 'payée';
    const { error } = await supabase
      .from('factures')
      .update({ statut: newStatut })
      .eq('id', invoice.id);
    if (!error) setStatut(newStatut);
    setToggling(false);
  };

  const sendInvoiceEmail = async () => {
    const email = clientEmail.trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError('Email invalide.');
      return;
    }
    setEmailError(null);
    setSending(true);
    try {
      const lignesRows = lignes
        .map(
          (l) => `
          <tr>
            <td style="padding:10px;border-bottom:1px solid #e5e7eb">${l.description}</td>
            <td style="padding:10px;border-bottom:1px solid #e5e7eb;text-align:right">${l.prix_unitaire.toFixed(2)} €</td>
            <td style="padding:10px;border-bottom:1px solid #e5e7eb;text-align:right">${l.quantite}</td>
            <td style="padding:10px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:600">${l.montant_ht.toFixed(2)} €</td>
          </tr>`
        )
        .join('');

      const html = `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
          <h1 style="color:#7c3aed">FACTURE ${invoice.numero_facture}</h1>
          <p style="color:#6b7280">Date : ${new Date(invoice.date_emission || invoice.created_at).toLocaleDateString('fr-FR')}</p>
          ${plombier ? `
            <div style="margin:20px 0;padding:15px;background:#f5f3ff;border-left:4px solid #7c3aed;border-radius:4px">
              <strong>${plombier.nom_entreprise || ''}</strong><br/>
              ${plombier.prenom || ''} ${plombier.nom || ''}<br/>
              <span style="color:#6b7280">${plombier.adresse || ''}<br/>SIRET : ${plombier.siret || ''}</span>
            </div>` : ''}
          ${clientInfo ? `
            <div style="margin:20px 0;padding:15px;background:#f9fafb;border-radius:4px">
              <strong>Client :</strong> ${clientInfo.nom}<br/>
              <span style="color:#6b7280">${clientInfo.adresse || ''}</span>
            </div>` : ''}
          <table style="width:100%;border-collapse:collapse;margin:20px 0">
            <thead>
              <tr style="background:#7c3aed;color:white">
                <th style="padding:10px;text-align:left">Prestation</th>
                <th style="padding:10px;text-align:right">P.U.</th>
                <th style="padding:10px;text-align:right">Qté</th>
                <th style="padding:10px;text-align:right">Total</th>
              </tr>
            </thead>
            <tbody>${lignesRows}</tbody>
          </table>
          <div style="border-top:2px solid #7c3aed;padding-top:15px;text-align:right">
            <p>Total HT : <strong>${Number(invoice.montant_ht).toFixed(2)} €</strong></p>
            <p>TVA (10%) : <strong>${Number(invoice.tva).toFixed(2)} €</strong></p>
            <p style="font-size:20px;color:#7c3aed">Total TTC : <strong>${Number(invoice.montant_ttc).toFixed(2)} €</strong></p>
          </div>
        </div>`;

      const res = await fetch(`${import.meta.env.VITE_EMAIL_SERVER_URL}/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: email,
          subject: `Facture ${invoice.numero_facture} - ${clientInfo?.nom || ''}`,
          html,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Erreur ${res.status}`);
      setToast({ message: 'Facture envoyée par email !', ok: true });
      setShowEmailForm(false);
      setClientEmail('');
    } catch (err) {
      setEmailError(err instanceof Error ? err.message : "Erreur lors de l'envoi.");
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600" />
      </div>
    );
  }

  const clientName = clientInfo?.nom || invoice.client_name || 'Client inconnu';
  const clientAddr = clientInfo?.adresse || invoice.client_address || '';

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl shadow-xl font-bold text-sm text-white ${
            toast.ok ? 'bg-green-500' : 'bg-red-500'
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Header mobile-friendly */}
      <header className="bg-purple-700 text-white shadow-lg print:hidden">
        <div className="max-w-5xl mx-auto px-4 py-4">

          {/* Ligne 1 : retour + titre */}
          <div className="flex items-center gap-3 mb-3">
            <button
              onClick={onBack}
              className="p-2 hover:bg-purple-800 rounded-lg transition flex-shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <Receipt className="w-6 h-6" />
              <h1 className="text-lg font-bold leading-tight">Aperçu de la Facture</h1>
            </div>
          </div>

          {/* Ligne 2 : boutons */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={togglePayment}
              disabled={toggling}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-semibold text-xs transition disabled:opacity-50 flex-1 justify-center ${
                statut === 'payée'
                  ? 'bg-green-500 text-white hover:bg-green-600'
                  : 'bg-white text-purple-700 hover:bg-purple-50'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              {statut === 'payée' ? 'Payée' : 'Marquer payée'}
            </button>

            <button
              onClick={() => setShowEmailForm(!showEmailForm)}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500 text-white rounded-lg font-semibold text-xs hover:bg-emerald-600 transition flex-1 justify-center"
            >
              <Mail className="w-4 h-4 flex-shrink-0" /> Email
            </button>

            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-2 bg-white/20 text-white rounded-lg font-semibold text-xs hover:bg-white/30 transition flex-1 justify-center"
            >
              <Printer className="w-4 h-4 flex-shrink-0" /> Imprimer
            </button>
          </div>
        </div>
      </header>

      {/* Formulaire email */}
      {showEmailForm && (
        <div className="max-w-5xl mx-auto px-4 pt-4 print:hidden">
          <div className="bg-white border border-purple-200 rounded-2xl p-5 shadow-md">
            <h3 className="font-bold text-gray-800 mb-3">Envoyer la facture par email</h3>
            <div className="flex gap-3">
              <input
                type="email"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                placeholder="email@client.fr"
                className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <button
                onClick={sendInvoiceEmail}
                disabled={sending}
                className="px-5 py-2 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition disabled:opacity-50"
              >
                {sending ? 'Envoi...' : 'Envoyer'}
              </button>
            </div>
            {emailError && <p className="text-red-500 text-sm mt-2">{emailError}</p>}
          </div>
        </div>
      )}

      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-lg p-6 sm:p-8 mb-6">

          {/* En-tête facture */}
          <div className="flex justify-between items-start mb-8 pb-6 border-b-2 border-purple-600">
            <div>
              <h2 className="text-3xl font-bold text-purple-700 mb-2">FACTURE</h2>
              <p className="text-gray-600 font-mono text-sm">{invoice.numero_facture}</p>
              <p className="text-gray-600 text-sm">
                Date :{' '}
                {new Date(invoice.date_emission || invoice.created_at).toLocaleDateString('fr-FR')}
              </p>
            </div>
            <span
              className={`px-3 py-1.5 rounded-lg font-bold text-xs ${
                statut === 'payée'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-amber-100 text-amber-700'
              }`}
            >
              {statut === 'payée' ? '✓ Payée' : 'En attente'}
            </span>
          </div>

          {/* Émetteur */}
          {plombier && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Émetteur</h3>
              <div className="bg-purple-50 p-4 rounded-lg border-l-4 border-purple-600">
                {plombier.nom_entreprise && (
                  <p className="font-bold text-gray-800 text-lg">{plombier.nom_entreprise}</p>
                )}
                <p className="font-semibold text-gray-800">
                  {plombier.prenom} {plombier.nom}
                </p>
                <p className="text-gray-600">{plombier.adresse}</p>
                <p className="text-gray-600">SIRET : {plombier.siret}</p>
              </div>
            </div>
          )}

          {/* Client */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Facturé à</h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="font-bold text-gray-800 text-lg">{clientName}</p>
              {clientAddr && <p className="text-gray-600">{clientAddr}</p>}
            </div>
          </div>

          {/* Tableau des prestations */}
          {lignes.length > 0 && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Détail des prestations</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-purple-700 text-white">
                      <th className="px-4 py-3 text-left rounded-tl-lg">Prestation</th>
                      <th className="px-4 py-3 text-right">Prix unitaire</th>
                      <th className="px-4 py-3 text-right">Quantité</th>
                      <th className="px-4 py-3 text-right rounded-tr-lg">Total HT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lignes.map((l, i) => (
                      <tr key={l.id} className={i % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                        <td className="px-4 py-3 text-gray-800">{l.description}</td>
                        <td className="px-4 py-3 text-right text-gray-600">
                          {l.prix_unitaire.toFixed(2)} €
                        </td>
                        <td className="px-4 py-3 text-right text-gray-600">{l.quantite}</td>
                        <td className="px-4 py-3 text-right font-semibold">
                          {l.montant_ht.toFixed(2)} €
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Totaux */}
          <div className="border-t-2 border-purple-600 pt-6">
            <div className="flex justify-end">
              <div className="w-full sm:w-80 space-y-3">
                <div className="flex justify-between text-lg">
                  <span className="text-gray-700">Total HT</span>
                  <span className="font-semibold">{Number(invoice.montant_ht).toFixed(2)} €</span>
                </div>
                <div className="flex justify-between text-lg">
                  <span className="text-gray-700">TVA (10%)</span>
                  <span className="font-semibold">{Number(invoice.tva).toFixed(2)} €</span>
                </div>
                <div className="border-t-2 border-purple-600 pt-3 flex justify-between text-2xl">
                  <span className="text-purple-700 font-bold">Total TTC</span>
                  <span className="text-purple-700 font-bold">
                    {Number(invoice.montant_ttc).toFixed(2)} €
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-4 border-t text-center text-xs text-gray-400">
            <p>Payable à réception — TVA 10% applicable aux travaux de rénovation (art. 279-0 bis CGI)</p>
          </div>
        </div>
      </main>
    </div>
  );
}