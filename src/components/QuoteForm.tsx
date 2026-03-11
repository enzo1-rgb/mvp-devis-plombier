import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { QuoteItem } from '../lib/types';
import { ArrowLeft, Plus, Trash2, Save } from 'lucide-react';

interface QuoteFormProps {
  onBack: () => void;
  onSuccess: () => void;
}

const DEFAULT_SERVICES = [
  { name: 'Installation robinet', price: 80 },
  { name: 'Réparation chauffe-eau', price: 150 },
  { name: 'Débouchage canalisation', price: 120 },
  { name: 'Réparation fuite', price: 90 },
];

export default function QuoteForm({ onBack, onSuccess }: QuoteFormProps) {
  const [clientName, setClientName] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<QuoteItem[]>([
    { service_name: '', unit_price: 0, quantity: 1, total: 0 },
  ]);
  const [saving, setSaving] = useState(false);

  const calculateTotal = (unitPrice: number, quantity: number) => {
    return unitPrice * quantity;
  };

  const updateItem = (index: number, field: keyof QuoteItem, value: string | number) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };

    if (field === 'unit_price' || field === 'quantity') {
      newItems[index].total = calculateTotal(
        newItems[index].unit_price,
        newItems[index].quantity
      );
    }

    setItems(newItems);
  };

  const addItem = () => {
    setItems([...items, { service_name: '', unit_price: 0, quantity: 1, total: 0 }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const addServiceFromTemplate = (serviceName: string, price: number) => {
    const newItem: QuoteItem = {
      service_name: serviceName,
      unit_price: price,
      quantity: 1,
      total: price,
    };
    setItems([...items, newItem]);
  };

  const getTotalHT = () => {
    return items.reduce((sum, item) => sum + item.total, 0);
  };

  const getTVA = () => {
    return getTotalHT() * 0.1;
  };

  const getTotalTTC = () => {
    return getTotalHT() + getTVA();
  };

  const handleSave = async () => {
    if (!clientName.trim() || !clientAddress.trim()) {
      alert('Veuillez remplir le nom et l\'adresse du client');
      return;
    }

    if (items.some((item) => !item.service_name.trim())) {
      alert('Veuillez remplir tous les noms de prestation');
      return;
    }

    setSaving(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Non authentifié');

      const { data: quote, error: quoteError } = await supabase
        .from('quotes')
        .insert({
          user_id: user.id,
          client_name: clientName,
          client_address: clientAddress,
          status: 'brouillon',
          notes,
          total_ht: getTotalHT(),
          total_ttc: getTotalTTC(),
        })
        .select()
        .single();

      if (quoteError) throw quoteError;

      const quoteItems = items.map((item) => ({
        quote_id: quote.id,
        service_name: item.service_name,
        unit_price: item.unit_price,
        quantity: item.quantity,
        total: item.total,
      }));

      const { error: itemsError } = await supabase.from('quote_items').insert(quoteItems);

      if (itemsError) throw itemsError;

      onSuccess();
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      alert('Erreur lors de la sauvegarde du devis');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-blue-600 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center">
            <button
              onClick={onBack}
              className="mr-4 p-2 hover:bg-blue-700 rounded-lg transition"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="text-2xl sm:text-3xl font-bold">Nouveau Devis</h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Informations Client</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nom du client
              </label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Jean Dupont"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Adresse du client
              </label>
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

          <div className="mb-4 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm font-medium text-gray-700 mb-2">Prestations rapides :</p>
            <div className="flex flex-wrap gap-2">
              {DEFAULT_SERVICES.map((service) => (
                <button
                  key={service.name}
                  onClick={() => addServiceFromTemplate(service.name, service.price)}
                  className="px-3 py-1 bg-white border border-blue-300 text-blue-700 rounded-lg hover:bg-blue-100 transition text-sm"
                >
                  {service.name} ({service.price}€)
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            {items.map((item, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="grid gap-4 sm:grid-cols-12">
                  <div className="sm:col-span-5">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Prestation
                    </label>
                    <input
                      type="text"
                      value={item.service_name}
                      onChange={(e) => updateItem(index, 'service_name', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Description"
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Prix unitaire (€)
                    </label>
                    <input
                      type="number"
                      value={item.unit_price}
                      onChange={(e) => updateItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Quantité
                    </label>
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      min="0.01"
                      step="0.01"
                    />
                  </div>
                  <div className="sm:col-span-2 flex items-end">
                    <div className="w-full">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Total
                      </label>
                      <div className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg font-semibold">
                        {item.total.toFixed(2)} €
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

        <div className="bg-blue-50 rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Récapitulatif</h2>
          <div className="space-y-2">
            <div className="flex justify-between text-lg">
              <span className="text-gray-700">Total HT</span>
              <span className="font-semibold">{getTotalHT().toFixed(2)} €</span>
            </div>
            <div className="flex justify-between text-lg">
              <span className="text-gray-700">TVA (10%)</span>
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
          {saving ? 'Enregistrement...' : 'Enregistrer le devis'}
        </button>
      </main>
    </div>
  );
}
