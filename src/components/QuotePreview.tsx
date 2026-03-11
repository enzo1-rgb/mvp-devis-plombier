import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Quote, QuoteItem } from '../lib/types';
import { ArrowLeft, FileText } from 'lucide-react';

interface QuotePreviewProps {
  quote: Quote;
  onBack: () => void;
}

export default function QuotePreview({ quote, onBack }: QuotePreviewProps) {
  const [items, setItems] = useState<QuoteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState(quote.status);

  useEffect(() => {
    loadQuoteItems();
  }, [quote.id]);

  const loadQuoteItems = async () => {
    try {
      const { data, error } = await supabase
        .from('quote_items')
        .select('*')
        .eq('quote_id', quote.id);

      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des lignes:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (newStatus: Quote['status']) => {
    try {
      const { error } = await supabase
        .from('quotes')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
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

      <main className="max-w-5xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
          <div className="flex justify-between items-start mb-8 pb-6 border-b-2">
            <div>
              <h2 className="text-3xl font-bold text-blue-600 mb-2">DEVIS</h2>
              <p className="text-gray-600">
                Date : {new Date(quote.created_at!).toLocaleDateString('fr-FR')}
              </p>
              <p className="text-gray-600 text-sm">
                Référence : {quote.id?.slice(0, 8).toUpperCase()}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600 mb-1">Statut</p>
              <select
                value={status}
                onChange={(e) => updateStatus(e.target.value as Quote['status'])}
                className="px-4 py-2 border-2 border-gray-300 rounded-lg font-semibold focus:ring-2 focus:ring-blue-500"
              >
                <option value="brouillon">Brouillon</option>
                <option value="envoyé">Envoyé</option>
                <option value="accepté">Accepté</option>
                <option value="refusé">Refusé</option>
              </select>
            </div>
          </div>

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
                      key={item.id}
                      className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}
                    >
                      <td className="px-4 py-3 text-gray-800">{item.service_name}</td>
                      <td className="px-4 py-3 text-right text-gray-600">
                        {item.unit_price.toFixed(2)} €
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600">
                        {item.quantity}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-800">
                        {item.total.toFixed(2)} €
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

          <div className="mt-8 pt-6 border-t text-center text-sm text-gray-500">
            <p>Devis valable 30 jours à compter de la date d'émission</p>
            <p className="mt-1">TVA intracommunautaire non applicable, article 259-1 du CGI</p>
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
            header, button {
              display: none !important;
            }
            body {
              background: white !important;
            }
          }
        `}
      </style>
    </div>
  );
}
