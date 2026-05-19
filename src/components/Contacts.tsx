import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { User as SupabaseUser } from '@supabase/supabase-js';
import {
  ArrowLeft, Users, Plus, Search, Pencil, Trash2,
  Save, X, Phone, Mail, MapPin, FileText, Receipt, ChevronDown, ChevronUp,
  ExternalLink, Loader2,
} from 'lucide-react';
import { Quote } from '../lib/types';

interface ContactsProps {
  user: SupabaseUser;
  onBack: () => void;
  onViewQuote: (quote: Quote) => void;
  onViewInvoice: (invoice: Record<string, unknown>) => void;
}

interface DevisRow {
  id: string;
  plombier_id: string;
  client_id: string;
  numero: string | null;
  statut: string;
  date_emission: string | null;
  montant_ht: number | string;
  tva: number | string;
  tva_rate: number | null;
  montant_ttc: number | string;
  notes: string | null;
  created_at: string | null;
  signe_par_client: boolean | null;
  date_signature: string | null;
  facture_generee_at: string | null;
  devis_modifie_at: string | null;
  clients: { nom: string; adresse: string } | null;
}

function toQuote(row: DevisRow): Quote {
  return {
    id: row.id,
    plombier_id: row.plombier_id,
    client_id: row.client_id,
    client_name: row.clients?.nom ?? 'Client inconnu',
    client_address: row.clients?.adresse ?? '',
    numero: row.numero ?? undefined,
    status: (row.statut as Quote['status']) ?? 'brouillon',
    date_emission: row.date_emission ?? undefined,
    total_ht: Number(row.montant_ht) || 0,
    tva: Number(row.tva) || 0,
    tva_rate: Number(row.tva_rate) || 0.10,
    total_ttc: Number(row.montant_ttc) || 0,
    notes: row.notes ?? undefined,
    created_at: row.created_at ?? undefined,
    signe_par_client: row.signe_par_client ?? false,
    date_signature: row.date_signature ?? undefined,
    facture_generee_at: row.facture_generee_at ?? undefined,
    devis_modifie_at: row.devis_modifie_at ?? undefined,
  };
}

interface Client {
  id: string;
  nom: string;
  adresse: string;
  email: string | null;
  telephone: string | null;
  created_at: string;
}

interface DevisClient {
  id: string;
  numero: string | null;
  statut: string;
  montant_ttc: number;
  created_at: string;
}

interface FactureClient {
  id: string;
  numero_facture: string;
  statut: string;
  montant_ttc: number;
  created_at: string;
}

export default function Contacts({ user, onBack, onViewQuote, onViewInvoice }: ContactsProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [expandedClient, setExpandedClient] = useState<string | null>(null);
  const [clientHistory, setClientHistory] = useState<Record<string, { devis: DevisClient[]; factures: FactureClient[] }>>({});
  const [loadingHistory, setLoadingHistory] = useState<string | null>(null);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; ok: boolean } | null>(null);
  const [openingHistory, setOpeningHistory] = useState<{ kind: 'devis' | 'facture'; id: string } | null>(null);

  const [formNom, setFormNom] = useState('');
  const [formAdresse, setFormAdresse] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formTelephone, setFormTelephone] = useState('');

  useEffect(() => { loadClients(); }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const loadClients = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('clients')
      .select('id, nom, adresse, email, telephone, created_at')
      .eq('plombier_id', user.id)
      .order('nom');
    if (data) setClients(data as Client[]);
    setLoading(false);
  };

  const loadHistory = async (clientId: string) => {
    if (clientHistory[clientId]) return;
    setLoadingHistory(clientId);
    const [devisRes, facturesRes] = await Promise.all([
      supabase.from('devis').select('id, numero, statut, montant_ttc, created_at').eq('client_id', clientId).order('created_at', { ascending: false }),
      supabase.from('factures').select('id, numero_facture, statut, montant_ttc, created_at').eq('client_id', clientId).order('created_at', { ascending: false }),
    ]);
    setClientHistory(prev => ({
      ...prev,
      [clientId]: {
        devis: (devisRes.data || []) as DevisClient[],
        factures: (facturesRes.data || []) as FactureClient[],
      },
    }));
    setLoadingHistory(null);
  };

  const toggleExpand = async (clientId: string) => {
    if (expandedClient === clientId) {
      setExpandedClient(null);
    } else {
      setExpandedClient(clientId);
      await loadHistory(clientId);
    }
  };

  const resetFormFields = () => {
    setFormNom('');
    setFormAdresse('');
    setFormEmail('');
    setFormTelephone('');
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingClient(null);
    resetFormFields();
  };

  const openAddForm = () => {
    setEditingClient(null);
    resetFormFields();
    setShowForm(true);
  };

  const openEditForm = (c: Client) => {
    setShowForm(false);
    setEditingClient(c);
    setFormNom(c.nom);
    setFormAdresse(c.adresse || '');
    setFormEmail(c.email || '');
    setFormTelephone(c.telephone || '');
    setExpandedClient(null);
  };

  const handleSave = async () => {
    if (!formNom.trim()) { alert('Le nom est obligatoire.'); return; }
    setSaving(true);
    try {
      if (editingClient) {
        const { error } = await supabase.from('clients').update({
          nom: formNom.trim(),
          adresse: formAdresse.trim(),
          email: formEmail.trim() || null,
          telephone: formTelephone.trim() || null,
        }).eq('id', editingClient.id);
        if (error) throw error;
        setClients(prev => prev.map(c =>
          c.id === editingClient.id
            ? { ...c, nom: formNom.trim(), adresse: formAdresse.trim(), email: formEmail.trim() || null, telephone: formTelephone.trim() || null }
            : c
        ));
        setToast({ message: 'Contact mis à jour.', ok: true });
      } else {
        const { data, error } = await supabase.from('clients').insert({
          plombier_id: user.id,
          nom: formNom.trim(),
          adresse: formAdresse.trim(),
          email: formEmail.trim() || null,
          telephone: formTelephone.trim() || null,
        }).select('id, nom, adresse, email, telephone, created_at').single();
        if (error) throw error;
        if (data) setClients(prev => [...prev, data as Client].sort((a, b) => a.nom.localeCompare(b.nom)));
        setToast({ message: 'Contact ajouté.', ok: true });
      }
      closeForm();
    } catch (err) {
      alert((err as { message?: string })?.message ?? 'Erreur lors de la sauvegarde.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!clientToDelete) return;
    const { error } = await supabase.from('clients').delete().eq('id', clientToDelete.id);
    if (!error) {
      setClients(prev => prev.filter(c => c.id !== clientToDelete.id));
      setToast({ message: 'Contact supprimé.', ok: true });
    }
    if (editingClient?.id === clientToDelete.id) closeForm();
    setClientToDelete(null);
  };

  const renderContactForm = (title: string, variant: 'card' | 'standalone' = 'standalone') => {
    const wrapperClass = variant === 'card'
      ? 'p-5 border-b border-slate-100 bg-blue-50/40'
      : 'bg-white rounded-2xl shadow-sm border border-slate-200 p-5 mb-5';

    return (
      <div className={wrapperClass}>
        <h2 className="font-bold text-slate-900 mb-4">{title}</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Nom *</label>
            <input
              type="text"
              value={formNom}
              onChange={(e) => setFormNom(e.target.value)}
              placeholder="Jean Dupont"
              className="w-full border border-slate-300 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Adresse</label>
            <input
              type="text"
              value={formAdresse}
              onChange={(e) => setFormAdresse(e.target.value)}
              placeholder="12 rue de la Paix, 75000 Paris"
              className="w-full border border-slate-300 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Email</label>
              <input
                type="email"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                placeholder="jean@email.fr"
                className="w-full border border-slate-300 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Téléphone</label>
              <input
                type="tel"
                value={formTelephone}
                onChange={(e) => setFormTelephone(e.target.value)}
                placeholder="06 12 34 56 78"
                className="w-full border border-slate-300 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 mt-4">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 disabled:opacity-50 transition"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
          <button
            type="button"
            onClick={closeForm}
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 border border-slate-300 rounded-xl text-sm text-slate-600 hover:bg-slate-50 transition"
          >
            <X className="w-4 h-4" />
            Annuler
          </button>
        </div>
      </div>
    );
  };

  const filtered = clients.filter(c =>
    c.nom.toLowerCase().includes(search.toLowerCase()) ||
    (c.email ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (c.telephone ?? '').includes(search)
  );

  const openDevisFromHistory = async (devisId: string) => {
    setOpeningHistory({ kind: 'devis', id: devisId });
    try {
      const { data, error } = await supabase
        .from('devis')
        .select('*, clients (nom, adresse)')
        .eq('id', devisId)
        .eq('plombier_id', user.id)
        .single();
      if (error || !data) throw error ?? new Error('not found');
      onViewQuote(toQuote(data as unknown as DevisRow));
    } catch {
      setToast({ message: "Impossible d'ouvrir ce devis.", ok: false });
    } finally {
      setOpeningHistory(null);
    }
  };

  const openFactureFromHistory = async (factureId: string) => {
    setOpeningHistory({ kind: 'facture', id: factureId });
    try {
      const { data, error } = await supabase
        .from('factures')
        .select('*, clients (nom, email)')
        .eq('id', factureId)
        .eq('plombier_id', user.id)
        .single();
      if (error || !data) throw error ?? new Error('not found');
      onViewInvoice(data as Record<string, unknown>);
    } catch {
      setToast({ message: "Impossible d'ouvrir cette facture.", ok: false });
    } finally {
      setOpeningHistory(null);
    }
  };

  const statutColor = (s: string) => {
    if (s === 'accepté' || s === 'payée') return 'text-green-600 bg-green-50';
    if (s === 'refusé') return 'text-red-500 bg-red-50';
    if (s === 'envoyé') return 'text-teal-600 bg-teal-50';
    if (s === 'non_payée') return 'text-amber-600 bg-amber-50';
    return 'text-slate-500 bg-slate-100';
  };

  return (
    <div className="min-h-screen bg-slate-50">

      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl shadow-xl font-bold text-sm text-white ${toast.ok ? 'bg-green-500' : 'bg-red-500'}`}>
          {toast.message}
        </div>
      )}

      <header className="bg-slate-900 text-white shadow-lg h-16 flex items-center">
        <div className="max-w-2xl mx-auto px-4 w-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-lg transition">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <Users className="w-5 h-5 text-blue-400" />
            <h1 className="font-bold text-lg">Contacts</h1>
          </div>
          <button
            onClick={openAddForm}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 transition"
          >
            <Plus className="w-4 h-4" />
            Ajouter
          </button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 pt-6">

        {/* Formulaire ajout (en haut uniquement) */}
        {showForm && !editingClient && renderContactForm('Nouveau contact', 'standalone')}


        {/* Barre de recherche */}
        <div className="relative mb-4">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            className="input-field pl-11"
            placeholder="Rechercher un contact…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <p className="text-xs text-slate-400 font-medium mb-3">{filtered.length} contact{filtered.length > 1 ? 's' : ''}</p>

        {/* Liste */}
        <div className="space-y-3 pb-10">
          {loading ? (
            <div className="text-center py-12 text-slate-400">Chargement…</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200">
              <Users className="w-12 h-12 mx-auto text-slate-200 mb-3" />
              <p className="text-slate-400 font-medium">Aucun contact trouvé</p>
              <p className="text-slate-300 text-sm mt-1">Appuyez sur "Ajouter" pour créer votre premier contact</p>
            </div>
          ) : (
            filtered.map((client) => {
              const isEditing = editingClient?.id === client.id;
              return (
              <div
                key={client.id}
                className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${isEditing ? 'border-blue-200 ring-1 ring-blue-100' : 'border-slate-100'}`}
              >
                {isEditing ? (
                  renderContactForm('Modifier le contact', 'card')
                ) : (
                <div className="p-5">
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-900 text-base">{client.nom}</p>
                      <div className="mt-1.5 space-y-0.5">
                        {client.adresse && (
                          <div className="flex items-center gap-1.5 text-xs text-slate-500">
                            <MapPin className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">{client.adresse}</span>
                          </div>
                        )}
                        {client.telephone && (
                          <div className="flex items-center gap-1.5 text-xs text-slate-500">
                            <Phone className="w-3 h-3 flex-shrink-0" />
                            <a href={`tel:${client.telephone}`} className="hover:text-blue-600">{client.telephone}</a>
                          </div>
                        )}
                        {client.email && (
                          <div className="flex items-center gap-1.5 text-xs text-slate-500">
                            <Mail className="w-3 h-3 flex-shrink-0" />
                            <a href={`mailto:${client.email}`} className="hover:text-blue-600 truncate">{client.email}</a>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1.5 ml-3 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => openEditForm(client)}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                        aria-label="Modifier le contact"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setClientToDelete(client)}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                        aria-label="Supprimer le contact"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
                )}

                {!isEditing && (
                <>
                {/* Bouton historique */}
                <button
                  onClick={() => toggleExpand(client.id)}
                  className="w-full flex items-center justify-center gap-1.5 py-2.5 border-t border-slate-50 bg-slate-50/50 text-[10px] font-bold uppercase text-slate-400 hover:text-blue-600 transition"
                >
                  {expandedClient === client.id ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  {expandedClient === client.id ? 'Masquer l\'historique' : 'Voir l\'historique'}
                </button>

                {/* Historique */}
                {expandedClient === client.id && (
                  <div className="border-t border-slate-100 px-5 py-4 bg-slate-50/30">
                    {loadingHistory === client.id ? (
                      <p className="text-xs text-slate-400 text-center py-2">Chargement…</p>
                    ) : (
                      <div className="space-y-4">
                        {/* Devis */}
                        <div>
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5" /> Devis ({clientHistory[client.id]?.devis.length ?? 0})
                          </p>
                          {clientHistory[client.id]?.devis.length === 0 ? (
                            <p className="text-xs text-slate-300">Aucun devis</p>
                          ) : (
                            <div className="space-y-1.5">
                              {clientHistory[client.id]?.devis.map((d) => {
                                const opening = openingHistory?.kind === 'devis' && openingHistory.id === d.id;
                                return (
                                  <div
                                    key={d.id}
                                    className="flex items-center justify-between gap-2 bg-white rounded-xl px-3 py-2 border border-slate-100"
                                  >
                                    <div className="min-w-0 flex-1">
                                      <span className="text-xs font-mono text-slate-500 break-all">{d.numero ?? d.id.slice(0, 8).toUpperCase()}</span>
                                      <span className={`ml-2 inline-block text-[10px] font-bold px-1.5 py-0.5 rounded-full align-middle ${statutColor(d.statut)}`}>
                                        {d.statut}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                      <span className="text-xs font-bold text-slate-700 tabular-nums whitespace-nowrap">
                                        {Number(d.montant_ttc).toFixed(2)} €
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => openDevisFromHistory(d.id)}
                                        disabled={!!openingHistory}
                                        title="Ouvrir le devis"
                                        aria-label="Ouvrir le devis"
                                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 disabled:opacity-40 transition"
                                      >
                                        {opening ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ExternalLink className="w-3.5 h-3.5" />}
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {/* Factures */}
                        <div>
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                            <Receipt className="w-3.5 h-3.5" /> Factures ({clientHistory[client.id]?.factures.length ?? 0})
                          </p>
                          {clientHistory[client.id]?.factures.length === 0 ? (
                            <p className="text-xs text-slate-300">Aucune facture</p>
                          ) : (
                            <div className="space-y-1.5">
                              {clientHistory[client.id]?.factures.map((f) => {
                                const opening = openingHistory?.kind === 'facture' && openingHistory.id === f.id;
                                return (
                                  <div
                                    key={f.id}
                                    className="flex items-center justify-between gap-2 bg-white rounded-xl px-3 py-2 border border-slate-100"
                                  >
                                    <div className="min-w-0 flex-1">
                                      <span className="text-xs font-mono text-slate-500 break-all">{f.numero_facture}</span>
                                      <span className={`ml-2 inline-block text-[10px] font-bold px-1.5 py-0.5 rounded-full align-middle ${statutColor(f.statut)}`}>
                                        {f.statut === 'payée' ? 'Payée' : 'Non payée'}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                      <span className="text-xs font-bold text-slate-700 tabular-nums whitespace-nowrap">
                                        {Number(f.montant_ttc).toFixed(2)} €
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => openFactureFromHistory(f.id)}
                                        disabled={!!openingHistory}
                                        title="Ouvrir la facture"
                                        aria-label="Ouvrir la facture"
                                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 disabled:opacity-40 transition"
                                      >
                                        {opening ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ExternalLink className="w-3.5 h-3.5" />}
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                </>
                )}
              </div>
              );
            })
          )}
        </div>
      </div>

      {/* Modal suppression */}
      {clientToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl text-center">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Supprimer ce contact ?</h3>
            <p className="text-slate-500 mb-6 text-sm">
              <strong>{clientToDelete.nom}</strong> sera supprimé. Ses devis et factures associés resteront dans votre historique.
            </p>
            <div className="flex flex-col gap-3">
              <button onClick={handleDelete} className="w-full py-4 bg-red-500 text-white rounded-2xl font-bold">
                Confirmer la suppression
              </button>
              <button onClick={() => setClientToDelete(null)} className="w-full py-4 text-slate-400 font-bold">
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}