import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { CheckCircle, XCircle, FileText } from 'lucide-react';

interface ClientPortalProps {
  token: string;
}

interface DevisPublic {
  id: string;
  numero: string | null;
  statut: string;
  date_emission: string | null;
  date_validite: string | null;
  montant_ht: number;
  tva: number;
  tva_rate: number;
  montant_ttc: number;
  notes: string | null;
  plombier_id: string;
  client_id: string;
  signe_par_client: boolean;
}

interface LignePublic {
  id: string;
  description: string;
  quantite: number;
  prix_unitaire: number;
  montant_ht: number;
}

interface PlombierPublic {
  nom: string;
  prenom: string;
  nom_entreprise: string | null;
  adresse: string | null;
  siret: string | null;
  telephone: string | null;
  email: string | null;
  tva_intracom: string | null;
}

interface ClientPublic {
  nom: string;
  adresse: string | null;
}

export default function ClientPortal({ token }: ClientPortalProps) {
  const [devis, setDevis] = useState<DevisPublic | null>(null);
  const [lignes, setLignes] = useState<LignePublic[]>([]);
  const [plombier, setPlombier] = useState<PlombierPublic | null>(null);
  const [client, setClient] = useState<ClientPublic | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [signing, setSigning] = useState(false);
  const [signed, setSigned] = useState<'accepté' | 'refusé' | null>(null);

  useEffect(() => {
    loadDevis();
  }, [token]);

  const loadDevis = async () => {
    setLoading(true);
    try {
      const { data: devisData, error: devisError } = await supabase
        .from('devis')
        .select('*')
        .eq('token', token)
        .single();

      if (devisError || !devisData) {
        setError('Devis introuvable ou lien invalide.');
        return;
      }

      setDevis(devisData as DevisPublic);

      if (devisData.statut === 'accepté' || devisData.statut === 'refusé') {
        setSigned(devisData.statut as 'accepté' | 'refusé');
      }

      const [lignesRes, plombierRes, clientRes] = await Promise.all([
        supabase
          .from('lignes_devis')
          .select('id, description, quantite, prix_unitaire, montant_ht')
          .eq('devis_id', devisData.id),
        supabase
          .from('plombiers')
          .select('nom, prenom, nom_entreprise, adresse, siret, telephone, email, tva_intracom')
          .eq('id', devisData.plombier_id)
          .single(),
        supabase
          .from('clients')
          .select('nom, adresse')
          .eq('id', devisData.client_id)
          .single(),
      ]);

      if (lignesRes.data) setLignes(lignesRes.data as LignePublic[]);
      if (plombierRes.data) setPlombier(plombierRes.data as PlombierPublic);
      if (clientRes.data) setClient(clientRes.data as ClientPublic);
    } catch (err) {
      setError('Une erreur est survenue lors du chargement du devis.');
    } finally {
      setLoading(false);
    }
  };

  const handleSign = async (decision: 'accepté' | 'refusé') => {
    if (!devis) return;
    setSigning(true);
    try {
      const { error } = await supabase
        .from('devis')
        .update({
          statut: decision,
          signe_par_client: decision === 'accepté',
          date_signature: new Date().toISOString(),
        })
        .eq('token', token);

      if (error) throw error;
      setSigned(decision);
      setDevis({ ...devis, statut: decision });
    } catch (err) {
      alert('Erreur lors de la signature. Veuillez réessayer.');
    } finally {
      setSigning(false);
    }
  };

  const tvaTaux = devis ? (devis.tva_rate ?? 0.10) : 0.10;
  const tvaPct = (tvaTaux * 100).toFixed(1);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-slate-500">Chargement du devis...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-md p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">Lien invalide</h1>
          <p className="text-slate-500">{error}</p>
        </div>
      </div>
    );
  }

  if (signed) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-md p-8 max-w-md w-full text-center">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${signed === 'accepté' ? 'bg-green-50' : 'bg-red-50'}`}>
            {signed === 'accepté'
              ? <CheckCircle className="w-8 h-8 text-green-500" />
              : <XCircle className="w-8 h-8 text-red-500" />
            }
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">
            Devis {signed === 'accepté' ? 'accepté' : 'refusé'}
          </h1>
          <p className="text-slate-500">
            {signed === 'accepté'
              ? 'Merci ! Votre accord a bien été enregistré. Vous serez contacté prochainement.'
              : 'Votre réponse a bien été enregistrée.'}
          </p>
          {plombier && (
            <p className="text-sm text-slate-400 mt-4">
              {plombier.nom_entreprise || `${plombier.prenom} ${plombier.nom}`}
              {plombier.telephone && ` — ${plombier.telephone}`}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">

      <header className="bg-slate-900 text-white shadow-lg">
        <div className="max-w-3xl mx-auto px-4 py-5 flex items-center gap-3">
          <FileText className="w-6 h-6 flex-shrink-0" />
          <div>
            <h1 className="font-bold text-lg leading-tight">Devis à signer</h1>
            {devis?.numero && (
              <p className="text-blue-200 text-xs">Réf. {devis.numero}</p>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">

        {devis?.date_validite && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
            ⏳ Ce devis est valable jusqu'au <strong>{new Date(devis.date_validite).toLocaleDateString('fr-FR')}</strong>
          </div>
        )}

        {plombier && (
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Votre prestataire</h2>
            <div className="bg-blue-50 rounded-xl p-4 border-l-4 border-blue-600">
              {plombier.nom_entreprise && (
                <p className="font-bold text-slate-800 text-lg">{plombier.nom_entreprise}</p>
              )}
              <p className="font-semibold text-slate-700">{plombier.prenom} {plombier.nom}</p>
              {plombier.adresse && <p className="text-slate-500 text-sm">{plombier.adresse}</p>}
              {plombier.siret && <p className="text-slate-500 text-sm">SIRET : {plombier.siret}</p>}
              {plombier.tva_intracom && <p className="text-slate-500 text-sm">TVA : {plombier.tva_intracom}</p>}
              <div className="flex gap-4 mt-2">
                {plombier.telephone && (
                  <a href={`tel:${plombier.telephone}`} className="text-blue-600 text-sm font-medium hover:underline">
                    📞 {plombier.telephone}
                  </a>
                )}
                {plombier.email && (
                  <a href={`mailto:${plombier.email}`} className="text-blue-600 text-sm font-medium hover:underline">
                    ✉️ {plombier.email}
                  </a>
                )}
              </div>
            </div>
          </div>
        )}

        {client && (
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Destinataire</h2>
            <p className="font-semibold text-slate-800">{client.nom}</p>
            {client.adresse && <p className="text-slate-500 text-sm">{client.adresse}</p>}
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Détail des prestations</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-blue-600 text-white">
                  <th className="px-4 py-3 text-left rounded-tl-lg text-sm">Prestation</th>
                  <th className="px-4 py-3 text-right text-sm">P.U.</th>
                  <th className="px-4 py-3 text-right text-sm">Qté</th>
                  <th className="px-4 py-3 text-right rounded-tr-lg text-sm">Total</th>
                </tr>
              </thead>
              <tbody>
                {lignes.map((l, i) => (
                  <tr key={l.id} className={i % 2 === 0 ? 'bg-slate-50' : 'bg-white'}>
                    <td className="px-4 py-3 text-slate-800 text-sm">{l.description}</td>
                    <td className="px-4 py-3 text-right text-slate-600 text-sm">{l.prix_unitaire.toFixed(2)} €</td>
                    <td className="px-4 py-3 text-right text-slate-600 text-sm">{l.quantite}</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-800 text-sm">{l.montant_ht.toFixed(2)} €</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end mt-4">
            <div className="w-full sm:w-72 space-y-2">
              <div className="flex justify-between text-slate-600 text-sm">
                <span>Total HT</span>
                <span className="font-semibold">{Number(devis?.montant_ht).toFixed(2)} €</span>
              </div>
              <div className="flex justify-between text-slate-600 text-sm">
                <span>TVA ({tvaPct}%)</span>
                <span className="font-semibold">{Number(devis?.tva).toFixed(2)} €</span>
              </div>
              <div className="border-t-2 border-blue-600 pt-2 flex justify-between text-xl">
                <span className="text-blue-700 font-bold">Total TTC</span>
                <span className="text-blue-700 font-bold">{Number(devis?.montant_ttc).toFixed(2)} €</span>
              </div>
            </div>
          </div>
        </div>

        {devis?.notes && (
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Notes</h2>
            <p className="text-slate-700 whitespace-pre-wrap text-sm">{devis.notes}</p>
          </div>
        )}

        {devis?.statut === 'envoyé' || devis?.statut === 'brouillon' ? (
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="text-base font-bold text-slate-900 mb-2">Votre réponse</h2>
            <p className="text-slate-500 text-sm mb-6">
              En cliquant sur "Accepter", vous confirmez votre accord sur ce devis. Cette action est enregistrée.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => handleSign('accepté')}
                disabled={signing}
                className="flex-1 flex items-center justify-center gap-2 py-4 bg-green-600 text-white rounded-2xl font-bold text-lg hover:bg-green-700 transition disabled:opacity-50 shadow-lg shadow-green-100"
              >
                <CheckCircle className="w-6 h-6" />
                {signing ? 'Enregistrement...' : 'Accepter le devis'}
              </button>
              <button
                onClick={() => handleSign('refusé')}
                disabled={signing}
                className="flex-1 flex items-center justify-center gap-2 py-4 bg-white border-2 border-red-200 text-red-500 rounded-2xl font-bold hover:bg-red-50 transition disabled:opacity-50"
              >
                <XCircle className="w-5 h-5" />
                Refuser
              </button>
            </div>
          </div>
        ) : (
          <div className={`rounded-2xl p-5 text-center font-bold text-lg ${
            devis?.statut === 'accepté' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
          }`}>
            Devis {devis?.statut}
          </div>
        )}

        <p className="text-center text-xs text-slate-400 pb-4">
          Devis généré avec ProPlomb
        </p>
      </main>
    </div>
  );
}