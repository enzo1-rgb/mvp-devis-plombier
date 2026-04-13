import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Prestation, LigneDevis, Quote } from '../lib/types';
import { ArrowLeft, Plus, Trash2, Save } from 'lucide-react';

const TVA_OPTIONS = [
  { value: 0.10, label: '10% — Rénovation (art. 279-0 bis CGI)' },
  { value: 0.20, label: '20% — Construction neuve' },
  { value: 0.055, label: '5,5% — Amélioration énergétique' },
] as const;

interface QuoteFormProps {
  onBack: () => void;
  onSuccess: () => void;
  quoteToEdit?: Quote;
}

interface FormItem {
  prestation_id: string | null;
  description: string;
  prix_unitaire: number;
  quantite: number;
  montant_ht: number;
}

interface LigneDevisRow {
  id: string;
  prestation_id: string | null;
  description: string;
  quantite: number;
  prix_unitaire: number;
  montant_ht: number;
}

export default function QuoteForm({ onBack, onSuccess, quoteToEdit }: QuoteFormProps) {
  const [clientName, setClientName] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [tvaTaux, setTvaTaux] = useState<number>(quoteToEdit?.tva_rate ?? 0.10);
  const [items, setItems] = useState<FormItem[]>([
    { prestation_id: null, description: '', prix_unitaire: 0, quantite: 1, montant_ht: 0 },
  ]);
  const [prestations, setPrestations] = useState<Prestation[]>([]);
  const [saving, setSaving] = useState(false);
  const [loadingPrestations, setLoadingPrestations] = useState(true);
  const [loadingQuote, setLoadingQuote] = useState(!!quoteToEdit);

  useEffect(() => {
    loadPrestations();
  }, []);

  useEffect(() => {
    if (quoteToEdit?.id) {
      loadQuoteData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quoteToEdit?.id]);

  const loadQuoteData = async () => {
    if (!quoteToEdit?.id) return;
    setLoadingQuote(true);
    try {
      setClientName(quoteToEdit.client_name || '');
      setClientAddress(quoteToEdit.client_address || '');
      setNotes(quoteToEdit.notes || '');
      setTvaTaux(quoteToEdit.tva_rate ?? 0.10);

      const { data, error } = await supabase
        .from('lignes_devis')
        .select('id, prestation_id, description, quantite, prix_unitaire, montant_ht')
        .eq('devis_id', quoteToEdit.id);

      if (error) throw error;

      if (data && data.length > 0) {
        setItems(
          (data as LigneDevisRow[]).map((r) => ({
            prestation_id: r.prestation_id || null,
            description: r.description || '',
            prix_unitaire: Number(r.prix_unitaire) || 0,
            quantite: Number(r.quantite) || 1,
            montant_ht: Number(r.montant_ht) || 0,
          }))
        );
      }
    } catch (err) {
      console.error('Erreur lors du chargement du devis:', err);
      alert('Erreur lors du chargement des données du devis');
    } finally {
      setLoadingQuote(false);
    }
  };

  const loadPrestations = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      let query = supabase.from('prestations').select('id, nom, prix_unitaire, unite');

      if (user?.id) {
        query = query.or(`plombier_id.eq.${user.id},plombier_id.is.null`);
      }

      const { data, error } = await query.order('nom');

      if (error) {
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('prestations')
          .select('id, nom, prix_unitaire')
          .order('nom');
        if (fallbackError) {
          console.warn('Prestations non chargées:', error);
          setPrestations([]);
          return;
        }
        setPrestations(
          (fallbackData || []).map((p: { id: string; nom: string; prix_unitaire: number }) => ({
            ...p,
            prix_unitaire: Number(p.prix_unitaire) || 0,
          }))
        );
        return;
      }
      setPrestations(
        (data || []).map((p: { id: string; nom: string; prix_unitaire: number; unite?: string }) => ({
          ...p,
          prix_unitaire: Number(p.prix_unitaire) || 0,
          unite: (p.unite as Prestation['unite']) || 'unité',
        }))
      );
    } catch {
      setPrestations([]);
    } finally {
      setLoadingPrestations(false);
    }
  };

  const calculateMontant = (prixUnitaire: number, quantite: number) => prixUnitaire * quantite;

  const updateItem = (index: number, field: keyof FormItem, value: string | number) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    if (field === 'prix_unitaire' || field === 'quantite') {
      newItems[index].montant_ht = calculateMontant(
        newItems[index].prix_unitaire,
        newItems[index].quantite
      );
    }
    setItems(newItems);
  };

  const addItem = () => {
    setItems([
      ...items,
      { prestation_id: null, description: '', prix_unitaire: 0, quantite: 1, montant_ht: 0 },
    ]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) setItems(items.filter((_, i) => i !== index));
  };

  const addPrestation = (prestation: Prestation) => {
    const prix = prestation.prix_unitaire;
    setItems([
      ...items,
      { prestation_id: prestation.id, description: prestation.nom, prix_unitaire: prix, quantite: 1, montant_ht: prix },
    ]);
  };

  const getTotalHT = () => items.reduce((sum, item) => sum + item.montant_ht, 0);
  const getTVA = () => getTotalHT() * tvaTaux;
  const getTotalTTC = () => getTotalHT() + getTVA();

  const generateNumero = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const h = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    return `DEV-${y}${m}${d}-${h}${min}`;
  };

  const handleSave = async () => {
    if (!clientName.trim() || !clientAddress.trim()) {
      alert('Veuillez remplir le nom et l\'adresse du client');
      return;
    }
    if (items.some((item) => !item.description.trim())) {
      alert('Veuillez remplir toutes les descriptions de prestation');
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non authentifié');

      const totalHT = getTotalHT();
      const tva = getTVA();
      const totalTTC = getTotalTTC();
      const dateEmission = new Date().toISOString().split('T')[0];
      const dateValidite = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const isEdit = !!quoteToEdit?.id;

      if (isEdit) {
        const clientId = quoteToEdit!.client_id!;
        const devisId = quoteToEdit!.id!;

        const { error: clientError } = await supabase
          .from('clients')
          .update({ nom: clientName.trim(), adresse: clientAddress.trim() })
          .eq('id', clientId);
        if (clientError) throw clientError;

        const { error: devisError } = await supabase
          .from('devis')
          .update({
            date_emission: dateEmission,
            date_validite: dateValidite,
            montant_ht: totalHT,
            tva,
            tva_rate: tvaTaux,
            montant_ttc: totalTTC,
            notes: notes.trim() || null,
          })
          .eq('id', devisId);
        if (devisError) throw devisError;

        const { error: deleteLignesError } = await supabase
          .from('lignes_devis').delete().eq('devis_id', devisId);
        if (deleteLignesError) throw deleteLignesError;

        const lignes: Omit<LigneDevis, 'id'>[] = items.map((item) => ({
          devis_id: devisId,
          prestation_id: item.prestation_id || null,
          description: item.description.trim(),
          quantite: item.quantite,
          prix_unitaire: item.prix_unitaire,
          montant_ht: item.montant_ht,
        }));
        const { error: lignesError } = await supabase.from('lignes_devis').insert(lignes);
        if (lignesError) throw lignesError;

      } else {
        const { data: client, error: clientError } = await supabase
          .from('clients')
          .insert({ plombier_id: user.id, nom: clientName.trim(), adresse: clientAddress.trim() })
          .select('id').single();
        if (clientError) throw clientError;
        if (!client?.id) throw new Error('Erreur création client');

        const { data: devis, error: devisError } = await supabase
          .from('devis')
          .insert({
            plombier_id: user.id,
            client_id: client.id,
            numero: generateNumero(),
            statut: 'brouillon',
            date_emission: dateEmission,
            date_validite: dateValidite,
            montant_ht: totalHT,
            tva,
            tva_rate: tvaTaux,
            montant_ttc: totalTTC,
            notes: notes.trim() || null,
          })
          .select('id').single();
        if (devisError) throw devisError;
        if (!devis?.id) throw new Error('Erreur création devis');

        const lignes: Omit<LigneDevis, 'id'>[] = items.map((item) => ({
          devis_id: devis.id,
          prestation_id: item.prestation_id || null,
          description: item.description.trim(),
          quantite: item.quantite,
          prix_unitaire: item.prix_unitaire,
          montant_ht: item.montant_ht,
        }));
        const { error: lignesError } = await supabase.from('lignes_devis').insert(lignes);
        if (lignesError) throw lignesError;
      }

      onSuccess();
    } catch (err) {
      console.error('Erreur lors de la sauvegarde:', err);
      const errObj = err as { code?: string; message?: string };
      const message =
        errObj?.code === '42P01'
          ? 'Une des tables n\'existe pas. Vérifiez vos migrations Supabase.'
          : errObj?.message ?? 'Erreur lors de la sauvegarde du devis';
      alert(message);
    } finally {
      setSaving(false);
    }
  };

  if (loadingQuote) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Chargement du devis...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-blue-600 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center">
            <button onClick={onBack} className="mr-4 p-2 hover:bg-blue-700 rounded-lg transition">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="text-2xl sm:text-3xl font-bold">
              {quoteToEdit ? 'Modifier le devis' : 'Nouveau Devis'}
            </h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">

        {/* Informations client */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Informations Client</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Nom du client</label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Jean Dupont"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Adresse du client</label>
              <input
                type="text"
                value={clientAddress}
                onChange={(e) => setClientAddress(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="123 Rue de la Paix, 75000 Paris"
              />
            </div>
          </div>
        </div>

        {/* Prestations */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-800">Prestations</h2>
            <button
              onClick={addItem}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm"
            >
              <Plus className="w-4 h-4 mr-1" />
              Ajouter
            </button>
          </div>

          {!loadingPrestations && prestations.length > 0 && (
            <div className="mb-4 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm font-medium text-gray-700 mb-2">Prestations rapides :</p>
              <div className="flex flex-wrap gap-2">
                {prestations.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => addPrestation(p)}
                    className="px-3 py-1 bg-white border border-blue-300 text-blue-700 rounded-lg hover:bg-blue-100 transition text-sm"
                  >
                    {p.nom} ({p.prix_unitaire}€)
                  </button>
                ))}
              </div>
            </div>
          )}

          {!loadingPrestations && prestations.length === 0 && (
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">
                Aucune prestation en base. Ajoutez des prestations manuellement ci-dessous.
              </p>
            </div>
          )}

          <div className="space-y-4">
            {items.map((item, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="grid gap-4 sm:grid-cols-12">
                  <div className="sm:col-span-5">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => updateItem(index, 'description', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Prestation"
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Prix unitaire (€)</label>
                    <input
                      type="number"
                      value={item.prix_unitaire}
                      onChange={(e) => updateItem(index, 'prix_unitaire', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Quantité</label>
                    <input
                      type="number"
                      value={item.quantite}
                      onChange={(e) => updateItem(index, 'quantite', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      min="0.01"
                      step="0.01"
                    />
                  </div>
                  <div className="sm:col-span-2 flex items-end">
                    <div className="w-full">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Total HT</label>
                      <div className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg font-semibold">
                        {item.montant_ht.toFixed(2)} €
                      </div>
                    </div>
                    {items.length > 1 && (
                      <button
                        onClick={() => removeItem(index)}
                        className="ml-2 p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Notes</h2>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={4}
            placeholder="Informations supplémentaires..."
          />
        </div>

        {/* Récapitulatif */}
        <div className="bg-blue-50 rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Récapitulatif</h2>

          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Taux de TVA applicable
            </label>
            <select
              value={tvaTaux}
              onChange={(e) => setTvaTaux(parseFloat(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
            >
              {TVA_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-lg">
              <span className="text-gray-700">Total HT</span>
              <span className="font-semibold">{getTotalHT().toFixed(2)} €</span>
            </div>
            <div className="flex justify-between text-lg">
              <span className="text-gray-700">TVA ({(tvaTaux * 100).toFixed(1)}%)</span>
              <span className="font-semibold">{getTVA().toFixed(2)} €</span>
            </div>
            <div className="border-t-2 border-blue-300 pt-2 flex justify-between text-2xl">
              <span className="text-blue-700 font-bold">Total TTC</span>
              <span className="text-blue-700 font-bold">{getTotalTTC().toFixed(2)} €</span>
            </div>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full flex items-center justify-center px-6 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold text-lg shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save className="w-6 h-6 mr-2" />
          {saving ? 'Enregistrement...' : quoteToEdit ? 'Mettre à jour le devis' : 'Enregistrer le devis'}
        </button>
      </main>
    </div>
  );
}