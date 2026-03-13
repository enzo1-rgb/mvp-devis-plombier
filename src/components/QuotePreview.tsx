import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Quote, QuoteItem, Plombier } from '../lib/types';
import { ArrowLeft, FileText } from 'lucide-react';

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

  useEffect(() => {
    loadData();
  }, [quote.id, quote.plombier_id]);

  const loadData = async () => {
    setLoading(true);
    await Promise.all([loadLignes(), loadPlombier()]);
    setLoading(false);
  };

  const loadPlombier = async () => {
    const plombierId = quote.plombier_id;
    if (!plombierId) return;
    try {
      const { data, error } = await supabase
        .from('plombiers')
        .select('id, nom, prenom, adresse, siret')
        .eq('id', plombierId)
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

  const getTVA = () => {
    return quote.total_ht * 0.1;
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
      <header className="bg-blue-600 text-white shadow-lg">
        <div className="max-w-5xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center">
            <button
              onClick={onBack}
              className="mr-4 p-2 hover:bg-blue-700 rounded-lg transition"
            >
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
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600 mb-1">Statut</p>
              {status === 'brouillon' && (
                <div className="flex flex-wrap gap-2 justify-end">
                  <button
                    onClick={() => updateStatus('envoyé')}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
                  >
                    Marquer comme envoyé
                  </button>
                  <button
                    onClick={() => updateStatus('refusé')}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg font-semibold hover:bg-gray-700 transition"
                  >
                    Annuler
                  </button>
                </div>
              )}
              {status === 'envoyé' && (
                <div className="flex flex-wrap gap-2 justify-end">
                  <button
                    onClick={() => updateStatus('accepté')}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition"
                  >
                    Accepté
                  </button>
                  <button
                    onClick={() => updateStatus('refusé')}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition"
                  >
                    Refusé
                  </button>
                </div>
              )}
              {(status === 'accepté' || status === 'refusé') && (
                <span
                  className={`inline-block px-4 py-2 rounded-lg font-semibold ${
                    status === 'accepté' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}
                >
                  {status === 'accepté' ? 'Accepté' : 'Refusé'}
                </span>
              )}
            </div>
          </div>

          {plombier && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">
                Émetteur du devis
              </h3>
              <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-600">
                <p className="font-semibold text-gray-800 text-lg">
                  {plombier.prenom} {plombier.nom}
                </p>
                <p className="text-gray-600">{plombier.adresse}</p>
                <p className="text-gray-600 mt-1">
                  SIRET : {plombier.siret}
                </p>
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
                    <tr
                      key={item.id ?? index}
                      className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}
                    >
                      <td className="px-4 py-3 text-gray-800">{item.description}</td>
                      <td className="px-4 py-3 text-right text-gray-600">
                        {item.prix_unitaire.toFixed(2)} €
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600">
                        {item.quantite}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-800">
                        {item.montant_ht.toFixed(2)} €
                      </td>
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
                  <span className="text-gray-700">TVA (10%)</span>
                  <span className="font-semibold">{getTVA().toFixed(2)} €</span>
                </div>
                <div className="border-t-2 border-blue-600 pt-3 flex justify-between text-2xl">
                  <span className="text-blue-700 font-bold">Total TTC</span>
                  <span className="text-blue-700 font-bold">
                    {quote.total_ttc.toFixed(2)} €
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="quote-legal mt-6 pt-4 border-t text-center text-xs text-gray-500">
            <p>Devis valable 30 jours à compter de la date d'émission</p>
            <p className="mt-1">
              TVA au taux de 10% applicable pour les travaux de rénovation (article 279-0 bis du
              CGI)
            </p>
          </div>
        </div>

        <div className="text-center">
          <button
            onClick={() => window.print()}
            className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold shadow-md"
          >
            Imprimer le devis
          </button>
        </div>
      </main>

      <style>
        {`
          @media print {
            @page {
              size: A4;
              margin: 12mm;
            }
            header, button {
              display: none !important;
            }
            body {
              background: white !important;
            }
            .quote-main {
              padding: 0 1rem !important;
            }
            .quote-content {
              box-shadow: none !important;
              padding: 0 !important;
              margin: 0 !important;
              page-break-inside: avoid;
            }
            .quote-content [class*="mb-8"] {
              margin-bottom: 10px !important;
            }
            .quote-content [class*="mb-4"] {
              margin-bottom: 6px !important;
            }
            .quote-content [class*="mb-3"] {
              margin-bottom: 4px !important;
            }
            .quote-content [class*="mb-2"] {
              margin-bottom: 2px !important;
            }
            .quote-content [class*="py-3"] {
              padding-top: 4px !important;
              padding-bottom: 4px !important;
            }
            .quote-content [class*="py-6"], .quote-content [class*="pt-6"], .quote-content [class*="pb-6"] {
              padding-top: 6px !important;
              padding-bottom: 6px !important;
            }
            .quote-content table {
              font-size: 11px;
            }
            .quote-legal {
              margin-top: 6px !important;
              padding-top: 4px !important;
              font-size: 9px !important;
              line-height: 1.2 !important;
            }
          }
        `}
      </style>
    </div>
  );
}
