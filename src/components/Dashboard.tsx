import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Quote } from '../lib/types';
import { Plus, FileText, LogOut, Eye, Trash2, Pencil, Wrench } from 'lucide-react';
import { User } from '@supabase/supabase-js';
import Profile from './Profile';
import Prestations from './Prestations';

interface DevisRow {
  id: string;
  plombier_id: string;
  client_id: string;
  numero: string | null;
  statut: string;
  date_emission: string | null;
  montant_ht: number | string;
  tva: number | string;
  montant_ttc: number | string;
  notes: string | null;
  created_at: string | null;
  clients: { nom: string; adresse: string } | null;
}

function toQuote(row: DevisRow): Quote {
  return {
    id: row.id,
    plombier_id: row.plombier_id,
    client_id: row.client_id,
    client_name: row.clients?.nom ?? '',
    client_address: row.clients?.adresse ?? '',
    numero: row.numero ?? undefined,
    status: (row.statut as Quote['status']) ?? 'brouillon',
    date_emission: row.date_emission ?? undefined,
    total_ht: Number(row.montant_ht) || 0,
    tva: Number(row.tva) || 0,
    total_ttc: Number(row.montant_ttc) || 0,
    notes: row.notes ?? undefined,
    created_at: row.created_at ?? undefined,
  };
}

interface DashboardProps {
  user: User;
  onCreateQuote: () => void;
  onViewQuote: (quote: Quote) => void;
  onEditQuote: (quote: Quote) => void;
}

export default function Dashboard({ user, onCreateQuote, onViewQuote, onEditQuote }: DashboardProps) {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [showProfile, setShowProfile] = useState(false);
  const [showPrestations, setShowPrestations] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadQuotes();
  }, []);

  const loadQuotes = async () => {
    setError(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        setError('Session expirée. Veuillez vous reconnecter.');
        return;
      }

      const { data, error } = await supabase
        .from('devis')
        .select(`
          id,
          plombier_id,
          client_id,
          numero,
          statut,
          date_emission,
          montant_ht,
          tva,
          montant_ttc,
          notes,
          created_at,
          clients (nom, adresse)
        `)
        .eq('plombier_id', sessionData.session.user.id)
        .order('created_at', { ascending: false });

      if (error) {
        if (error.code === '42P01') {
          setError('La table "devis" n\'existe pas. Vérifiez la configuration Supabase.');
        } else {
          setError(`Erreur Supabase: ${error.message}`);
        }
        console.error('Erreur lors du chargement des devis:', error);
        return;
      }

      setQuotes((data || []).map((r) => toQuote(r as unknown as DevisRow)));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(msg);
      console.error('Erreur lors du chargement des devis:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const deleteQuote = async (id?: string) => {
    if (!id) return;
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce devis ?')) return;

    try {
      const { error } = await supabase
        .from('devis')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Erreur lors de la suppression:', error.message);
        alert(`Impossible de supprimer le devis : ${error.message}`);
        return;
      }

      setQuotes((prevQuotes) => prevQuotes.filter((q) => q.id !== id));
    } catch (err) {
      console.error('Erreur inattendue lors de la suppression:', err);
      alert('Erreur inattendue lors de la suppression du devis.');
    }
  };

  const getStatusBadge = (status: Quote['status']) => {
    const styles = {
      brouillon: 'bg-gray-100 text-gray-700',
      envoyé: 'bg-blue-100 text-blue-700',
      accepté: 'bg-green-100 text-green-700',
      refusé: 'bg-red-100 text-red-700',
    };
    return styles[status];
  };

  if (showProfile) return <Profile user={user} onBack={() => setShowProfile(false)} />;
  if (showPrestations) return <Prestations user={user} onBack={() => setShowPrestations(false)} />;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-blue-600 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <FileText className="w-8 h-8 mr-3" />
              <h1 className="text-2xl sm:text-3xl font-bold">Mes Devis</h1>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowPrestations(true)}
                className="flex items-center px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg transition"
              >
                <Wrench className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Mes prestations</span>
              </button>
              <button
                onClick={() => setShowProfile(true)}
                className="flex items-center px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg transition"
              >
                <span className="hidden sm:inline">Mon profil</span>
              </button>
              <button
                onClick={handleSignOut}
                className="flex items-center px-4 py-2 bg-blue-700 hover:bg-blue-800 rounded-lg transition"
              >
                <LogOut className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Déconnexion</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <button
            onClick={onCreateQuote}
            className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold shadow-md"
          >
            <Plus className="w-5 h-5 mr-2" />
            Nouveau Devis
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            <p className="font-medium">{error}</p>
            <button onClick={loadQuotes} className="mt-2 text-sm underline hover:no-underline">
              Réessayer
            </button>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Chargement...</p>
          </div>
        ) : quotes.length === 0 && !error ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <FileText className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 text-lg">Aucun devis pour le moment</p>
            <p className="text-gray-500 mt-2">Créez votre premier devis pour commencer</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {quotes.map((quote) => (
              <div key={quote.id} className="bg-white rounded-lg shadow-md hover:shadow-lg transition p-6">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="text-lg font-semibold text-gray-800 truncate">{quote.client_name}</h3>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(quote.status)}`}>
                    {quote.status}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-4 truncate">{quote.client_address}</p>
                <div className="border-t pt-4 mb-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Total HT</span>
                    <span className="font-medium">{quote.total_ht.toFixed(2)} €</span>
                  </div>
                  <div className="flex justify-between text-sm font-semibold text-blue-600">
                    <span>Total TTC</span>
                    <span>{quote.total_ttc.toFixed(2)} €</span>
                  </div>
                </div>
                <div className="flex justify-between items-center text-xs text-gray-500 mb-4">
                  <span>{quote.created_at ? new Date(quote.created_at).toLocaleDateString('fr-FR') : '-'}</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => onViewQuote(quote)}
                    className="flex-1 flex items-center justify-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    Voir
                  </button>
                  <button
                    onClick={() => onEditQuote(quote)}
                    className="flex-1 flex items-center justify-center px-3 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition text-sm font-medium"
                  >
                    <Pencil className="w-4 h-4 mr-1" />
                    Modifier
                  </button>
                  <button
                    onClick={() => deleteQuote(quote.id)}
                    className="flex items-center justify-center px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}