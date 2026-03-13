import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Prestation, UnitePrestation } from '../lib/types';
import { ArrowLeft, Plus, Pencil, Trash2, Save, X } from 'lucide-react';
import { User } from '@supabase/supabase-js';

interface PrestationsProps {
  user: User;
  onBack: () => void;
}

const UNITES: { value: UnitePrestation; label: string }[] = [
  { value: 'unité', label: 'Unité' },
  { value: 'heure', label: 'Heure' },
  { value: 'intervention', label: 'Intervention' },
  { value: 'forfait', label: 'Forfait' },
];

interface PrestationRow {
  id: string;
  nom: string;
  prix_unitaire: number | string;
  plombier_id: string | null;
  unite: string | null;
}

function toPrestation(row: PrestationRow): Prestation {
  return {
    id: row.id,
    nom: row.nom,
    prix_unitaire: Number(row.prix_unitaire) || 0,
    plombier_id: row.plombier_id ?? undefined,
    unite: (row.unite as UnitePrestation) || 'unité',
  };
}

export default function Prestations({ user, onBack }: PrestationsProps) {
  const [prestations, setPrestations] = useState<Prestation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formNom, setFormNom] = useState('');
  const [formPrix, setFormPrix] = useState('');
  const [formUnite, setFormUnite] = useState<UnitePrestation>('unité');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadPrestations();
  }, []);

  const loadPrestations = async () => {
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('prestations')
        .select('id, nom, prix_unitaire, plombier_id, unite')
        .or(`plombier_id.eq.${user.id},plombier_id.is.null`)
        .order('nom');

      if (err) {
        if (err.code === '42P01') {
          setError('La table "prestations" n\'existe pas.');
        } else if (err.message?.includes('plombier_id') || err.message?.includes('unite')) {
          setError('Colonnes manquantes. Exécutez la migration Supabase.');
        } else {
          setError(err.message);
        }
        setPrestations([]);
        return;
      }

      setPrestations((data || []).map((r) => toPrestation(r as PrestationRow)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      setPrestations([]);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormNom('');
    setFormPrix('');
    setFormUnite('unité');
    setEditingId(null);
    setShowForm(false);
  };

  const openAddForm = () => {
    resetForm();
    setShowForm(true);
  };

  const openEditForm = (p: Prestation) => {
    if (p.plombier_id === undefined || p.plombier_id === null) return;
    setFormNom(p.nom);
    setFormPrix(String(p.prix_unitaire));
    setFormUnite(p.unite || 'unité');
    setEditingId(p.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    const nom = formNom.trim();
    const prix = parseFloat(formPrix.replace(',', '.'));

    if (!nom) {
      alert('Veuillez saisir un nom.');
      return;
    }
    if (isNaN(prix) || prix < 0) {
      alert('Veuillez saisir un prix valide.');
      return;
    }

    setSaving(true);
    try {
      if (editingId) {
        const { error: err } = await supabase
          .from('prestations')
          .update({ nom, prix_unitaire: prix, unite: formUnite })
          .eq('id', editingId)
          .eq('plombier_id', user.id);

        if (err) throw err;
        setPrestations((prev) =>
          prev.map((p) =>
            p.id === editingId ? { ...p, nom, prix_unitaire: prix, unite: formUnite } : p
          )
        );
      } else {
        const { data, error: err } = await supabase
          .from('prestations')
          .insert({
            plombier_id: user.id,
            nom,
            prix_unitaire: prix,
            unite: formUnite,
          })
          .select('id, nom, prix_unitaire, plombier_id, unite')
          .single();

        if (err) throw err;
        if (data) {
          setPrestations((prev) => [...prev, toPrestation(data as PrestationRow)].sort((a, b) => a.nom.localeCompare(b.nom)));
        }
      }
      resetForm();
    } catch (err) {
      console.error('Erreur:', err);
      alert((err as { message?: string })?.message ?? 'Erreur lors de la sauvegarde.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, plombierId: string | null | undefined) => {
    if (plombierId === undefined || plombierId === null) {
      alert('Les prestations par défaut ne peuvent pas être supprimées.');
      return;
    }
    if (!confirm('Supprimer cette prestation ?')) return;

    try {
      const { error: err } = await supabase
        .from('prestations')
        .delete()
        .eq('id', id)
        .eq('plombier_id', user.id);

      if (err) throw err;
      setPrestations((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      console.error('Erreur:', err);
      alert((err as { message?: string })?.message ?? 'Erreur lors de la suppression.');
    }
  };

  const formatUnite = (u?: UnitePrestation) =>
    UNITES.find((x) => x.value === u)?.label ?? 'Unité';

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-blue-600 text-white shadow-lg">
        <div className="max-w-4xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button
                onClick={onBack}
                className="mr-4 p-2 hover:bg-blue-700 rounded-lg transition"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <h1 className="text-2xl sm:text-3xl font-bold">Mes Prestations</h1>
            </div>
            <button
              onClick={openAddForm}
              className="flex items-center px-4 py-2 bg-white text-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition"
            >
              <Plus className="w-5 h-5 mr-2" />
              Ajouter
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            <p className="font-medium">{error}</p>
            <button onClick={loadPrestations} className="mt-2 text-sm underline">
              Réessayer
            </button>
          </div>
        )}

        {showForm && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              {editingId ? 'Modifier la prestation' : 'Nouvelle prestation'}
            </h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
                <input
                  type="text"
                  value={formNom}
                  onChange={(e) => setFormNom(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex : Réparation fuite"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Prix unitaire (€)
                </label>
                <input
                  type="text"
                  value={formPrix}
                  onChange={(e) => setFormPrix(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Unité</label>
                <select
                  value={formUnite}
                  onChange={(e) => setFormUnite(e.target.value as UnitePrestation)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {UNITES.map((u) => (
                    <option key={u.value} value={u.value}>
                      {u.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
              >
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Enregistrement...' : 'Enregistrer'}
              </button>
              <button
                onClick={resetForm}
                className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              >
                <X className="w-4 h-4 mr-2" />
                Annuler
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
            <p className="mt-4 text-gray-600">Chargement...</p>
          </div>
        ) : prestations.length === 0 && !error ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <p className="text-gray-600 text-lg">Aucune prestation</p>
            <p className="text-gray-500 mt-2">
              Les prestations par défaut et vos prestations personnalisées apparaîtront ici.
            </p>
            <button
              onClick={openAddForm}
              className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Ajouter une prestation
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-100 text-left">
                  <th className="px-4 py-3 font-semibold text-gray-700">Nom</th>
                  <th className="px-4 py-3 font-semibold text-gray-700">Prix unitaire</th>
                  <th className="px-4 py-3 font-semibold text-gray-700">Unité</th>
                  <th className="px-4 py-3 font-semibold text-gray-700 text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {prestations.map((p) => (
                  <tr key={p.id} className="border-t border-gray-200 hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-800">{p.nom}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {p.prix_unitaire.toFixed(2)} €
                    </td>
                    <td className="px-4 py-3 text-gray-600">{formatUnite(p.unite)}</td>
                    <td className="px-4 py-3 text-right">
                      {p.plombier_id ? (
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => openEditForm(p)}
                            className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition"
                            title="Modifier"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(p.id, p.plombier_id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                            title="Supprimer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">Par défaut</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
