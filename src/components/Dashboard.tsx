import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { Quote } from "../lib/types";
import {
  Plus, User, Wrench, LogOut, Search,
  Receipt, CheckCircle, Eye, Edit2, Trash2, TrendingUp,
  ChevronLeft, ChevronRight, Filter, Bell,
} from "lucide-react";
import { User as SupabaseUser } from "@supabase/supabase-js";
import Profile from "./Profile";
import Prestations from "./Prestations";
import Analytics from "./Analytics";

const PAGE_SIZE = 10;

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
  clients: { nom: string; adresse: string } | null;
}

function toQuote(row: DevisRow): Quote {
  return {
    id: row.id,
    plombier_id: row.plombier_id,
    client_id: row.client_id,
    client_name: row.clients?.nom ?? "Client inconnu",
    client_address: row.clients?.adresse ?? "",
    numero: row.numero ?? undefined,
    status: (row.statut as Quote["status"]) ?? "brouillon",
    date_emission: row.date_emission ?? undefined,
    total_ht: Number(row.montant_ht) || 0,
    tva: Number(row.tva) || 0,
    tva_rate: Number(row.tva_rate) || 0.10,
    total_ttc: Number(row.montant_ttc) || 0,
    notes: row.notes ?? undefined,
    created_at: row.created_at ?? undefined,
    signe_par_client: row.signe_par_client ?? false,
    date_signature: row.date_signature ?? undefined,
  };
}

interface DashboardProps {
  user: SupabaseUser;
  onCreateQuote: () => void;
  onViewQuote: (quote: Quote) => void;
  onEditQuote: (quote: Quote) => void;
  onViewInvoice: (invoice: any) => void;
}

type StatutFilter = 'tous' | 'brouillon' | 'envoyé' | 'accepté' | 'refusé';
type PeriodeFilter = 'tout' | 'mois' | '3mois';
type StatutFactureFilter = 'tous' | 'payée' | 'non_payée';

export default function Dashboard({
  user, onCreateQuote, onViewQuote, onEditQuote, onViewInvoice,
}: DashboardProps) {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<"devis" | "factures">("devis");
  const [showProfile, setShowProfile] = useState(false);
  const [showPrestations, setShowPrestations] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [quoteToDelete, setQuoteToDelete] = useState<Quote | null>(null);
  const [toast, setToast] = useState<{ message: string; ok: boolean } | null>(null);
  const [acceptLoading, setAcceptLoading] = useState<string | null>(null);
  const [relanceLoading, setRelanceLoading] = useState<string | null>(null);

  const [statutFilter, setStatutFilter] = useState<StatutFilter>('tous');
  const [periodeFilter, setPeriodeFilter] = useState<PeriodeFilter>('tout');
  const [pageDevis, setPageDevis] = useState(1);
  const [statutFactureFilter, setStatutFactureFilter] = useState<StatutFactureFilter>('tous');
  const [pageFactures, setPageFactures] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => { loadData(); }, [viewMode]);
  useEffect(() => { setPageDevis(1); }, [search, statutFilter, periodeFilter]);
  useEffect(() => { setPageFactures(1); }, [search, statutFactureFilter]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (viewMode === "devis") {
        const { data } = await supabase
          .from("devis").select(`*, clients (nom, adresse)`)
          .eq("plombier_id", user.id).order("created_at", { ascending: false });
        if (data) setQuotes(data.map((r) => toQuote(r as unknown as DevisRow)));
      } else {
        const { data } = await supabase
          .from("factures").select(`*, clients (nom, email)`)
          .eq("plombier_id", user.id).order("created_at", { ascending: false });
        if (data) setInvoices(data);
      }
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const isOverdue = (inv: any) => {
    if (inv.statut === 'payée') return false;
    const delai = 30;
    const base = new Date(inv.date_emission || inv.created_at);
    base.setDate(base.getDate() + delai);
    return new Date() > base;
  };

  const handleRelance = async (inv: any) => {
    setRelanceLoading(inv.id);
    try {
      const { data: clientData } = await supabase
        .from('clients').select('nom, email, adresse').eq('id', inv.client_id).single();

      if (!clientData?.email) {
        setToast({ message: 'Aucun email client enregistré pour cette facture.', ok: false });
        return;
      }

      const { data: plombierData } = await supabase
        .from('plombiers').select('*').eq('id', user.id).single();

      const dateEmission = new Date(inv.date_emission || inv.created_at);
      const delai = plombierData?.delai_paiement ?? 30;
      const dateEcheance = new Date(dateEmission);
      dateEcheance.setDate(dateEcheance.getDate() + delai);
      const joursRetard = Math.max(0, Math.floor((Date.now() - dateEcheance.getTime()) / (1000 * 60 * 60 * 24)));
      const numeroRelance = (inv.nb_relances ?? 0) + 1;

      const html = `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
          <h2 style="color:#d97706">⚠️ Rappel de paiement — Facture ${inv.numero_facture}</h2>
          <p style="color:#6b7280">Relance n°${numeroRelance}${joursRetard > 0 ? ` — ${joursRetard} jour${joursRetard > 1 ? 's' : ''} de retard` : ''}</p>
          ${plombierData ? `
          <div style="margin:20px 0;padding:15px;background:#fffbeb;border-left:4px solid #f59e0b;border-radius:4px">
            <strong>${plombierData.nom_entreprise || `${plombierData.prenom} ${plombierData.nom}`}</strong><br/>
            <span style="color:#6b7280">${plombierData.adresse || ''}<br/>SIRET : ${plombierData.siret || ''}</span>
          </div>` : ''}
          <p>Bonjour <strong>${clientData.nom}</strong>,</p>
          <p>Sauf erreur de notre part, la facture <strong>${inv.numero_facture}</strong> d'un montant de <strong>${Number(inv.montant_ttc).toFixed(2)} €</strong> est toujours en attente de règlement.</p>
          <p>Date d'échéance : <strong>${dateEcheance.toLocaleDateString('fr-FR')}</strong></p>
          <div style="margin:24px 0;padding:16px;background:#f9fafb;border-radius:8px;text-align:center">
            <p style="font-size:24px;font-weight:bold;color:#d97706;margin:0">${Number(inv.montant_ttc).toFixed(2)} €</p>
            <p style="color:#6b7280;margin:4px 0 0">à régler dès que possible</p>
          </div>
          ${plombierData?.iban ? `<p style="font-size:13px">Virement : <strong style="font-family:monospace">${plombierData.iban}</strong></p>` : ''}
          <p style="font-size:12px;color:#9ca3af;margin-top:24px">En cas de retard, pénalités au taux de ${plombierData?.taux_penalite || '3 fois le taux légal'} + indemnité forfaitaire de 40 € (art. L441-10 Code de Commerce).</p>
        </div>`;

      const res = await fetch(`${import.meta.env.VITE_EMAIL_SERVER_URL}/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: clientData.email,
          subject: `Rappel de paiement — Facture ${inv.numero_facture}`,
          html,
        }),
      });

      if (!res.ok) throw new Error('Erreur envoi email');

      await supabase.from('factures').update({
        nb_relances: numeroRelance,
        derniere_relance: new Date().toISOString(),
      }).eq('id', inv.id);

      setInvoices(prev => prev.map(f =>
        f.id === inv.id ? { ...f, nb_relances: numeroRelance, derniere_relance: new Date().toISOString() } : f
      ));

      setToast({ message: `Relance n°${numeroRelance} envoyée à ${clientData.email}`, ok: true });
    } catch (err) {
      setToast({ message: 'Erreur lors de l\'envoi de la relance.', ok: false });
    } finally {
      setRelanceLoading(null);
    }
  };

  const handleAcceptQuote = async (quote: Quote) => {
    setAcceptLoading(quote.id ?? null);
    try {
      const { data: existing } = await supabase
        .from("factures").select("id").eq("devis_id", quote.id).maybeSingle();
      if (existing) {
        setToast({ message: "Une facture existe déjà pour ce devis.", ok: false });
        setViewMode("factures");
        return;
      }
      const { error: updateError } = await supabase
        .from("devis").update({ statut: "accepté" }).eq("id", quote.id);
      if (updateError) throw updateError;
      const { data: numData, error: numError } = await supabase.rpc('generate_numero_facture', { p_plombier_id: user.id });
      if (numError) throw numError;
      const numFacture = numData as string;
      const { error: insertError } = await supabase.from("factures").insert({
        plombier_id: user.id, devis_id: quote.id, client_id: quote.client_id,
        numero_facture: numFacture, montant_ht: quote.total_ht, tva: quote.tva,
        tva_rate: quote.tva_rate, montant_ttc: quote.total_ttc, statut: "non_payée",
      });
      if (insertError) throw insertError;
      setToast({ message: `Facture ${numFacture} générée !`, ok: true });
      setViewMode("factures");
    } catch (err) {
      console.error("Erreur facture :", err);
      setToast({ message: "Erreur lors de la création de la facture.", ok: false });
    } finally {
      setAcceptLoading(null);
    }
  };

  const confirmDelete = async () => {
    if (!quoteToDelete) return;
    const { error } = await supabase.from("devis").delete().eq("id", quoteToDelete.id);
    if (!error) {
      setQuotes(quotes.filter((q) => q.id !== quoteToDelete.id));
      setQuoteToDelete(null);
    }
  };

  if (showProfile) return <Profile user={user} onBack={() => setShowProfile(false)} />;
  if (showPrestations) return <Prestations user={user} onBack={() => setShowPrestations(false)} />;
  if (showAnalytics) return <Analytics user={user} onBack={() => setShowAnalytics(false)} />;

  const now = new Date();
  const filteredQuotes = quotes.filter((q) => {
    const matchSearch = q.client_name.toLowerCase().includes(search.toLowerCase()) ||
      (q.numero ?? '').toLowerCase().includes(search.toLowerCase());
    const matchStatut = statutFilter === 'tous' || q.status === statutFilter;
    let matchPeriode = true;
    if (periodeFilter === 'mois') {
      const debut = new Date(now.getFullYear(), now.getMonth(), 1);
      matchPeriode = new Date(q.created_at ?? '') >= debut;
    } else if (periodeFilter === '3mois') {
      const debut = new Date(now.getFullYear(), now.getMonth() - 2, 1);
      matchPeriode = new Date(q.created_at ?? '') >= debut;
    }
    return matchSearch && matchStatut && matchPeriode;
  });
  const totalPagesDevis = Math.max(1, Math.ceil(filteredQuotes.length / PAGE_SIZE));
  const paginatedQuotes = filteredQuotes.slice((pageDevis - 1) * PAGE_SIZE, pageDevis * PAGE_SIZE);

  const filteredInvoices = invoices.filter((inv) => {
    const matchSearch =
      (inv.clients?.nom ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (inv.numero_facture ?? "").toLowerCase().includes(search.toLowerCase());
    const matchStatut = statutFactureFilter === 'tous' || inv.statut === statutFactureFilter;
    return matchSearch && matchStatut;
  });
  const totalPagesFactures = Math.max(1, Math.ceil(filteredInvoices.length / PAGE_SIZE));
  const paginatedInvoices = filteredInvoices.slice((pageFactures - 1) * PAGE_SIZE, pageFactures * PAGE_SIZE);

  const hasActiveFilters = viewMode === 'devis'
    ? statutFilter !== 'tous' || periodeFilter !== 'tout'
    : statutFactureFilter !== 'tous';

  const nbRetard = invoices.filter(isOverdue).length;

  return (
    <div className="min-h-screen pb-28 bg-slate-50 font-sans">

      {toast && (
        <div className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl shadow-xl font-bold text-sm text-white transition-all ${
          toast.ok ? "bg-green-500 shadow-green-200" : "bg-red-500 shadow-red-200"
        }`}>
          {toast.message}
        </div>
      )}

      <header className="bg-slate-900 text-white sticky top-0 z-30 shadow-lg h-16 flex items-center">
        <div className="max-w-2xl mx-auto px-4 w-full flex justify-between items-center">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setViewMode("devis")}>
            <div className="bg-blue-600 p-1.5 rounded-lg shadow-lg">
              <Wrench className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold">ProPlomb</span>
          </div>

          <nav className="flex items-center gap-1.5">
            <button
              onClick={() => { 
                if (viewMode === "factures") {
                  setViewMode("devis");
                } else {
                  setViewMode("factures");
                  setStatutFactureFilter("non_payée");
                }
              }}
              className={`relative flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all ${
                viewMode === "factures" ? "bg-slate-600 text-white shadow-md" : "text-slate-400 hover:bg-white/10"
              }`}
            >
              <Receipt className="w-5 h-5" />
              <span className="hidden sm:inline text-[10px] font-bold uppercase tracking-widest">Factures</span>
              {nbRetard > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[9px] font-black text-white flex items-center justify-center">
                  {nbRetard}
                </span>
              )}
            </button>
            <button onClick={() => setShowAnalytics(true)} className="p-2 text-slate-400 hover:text-white">
              <TrendingUp className="w-5 h-5" />
            </button>
            <button onClick={() => setShowPrestations(true)} className="p-2 text-slate-400 hover:text-white">
              <Wrench className="w-5 h-5" />
            </button>
            <button onClick={() => setShowProfile(true)} className="p-2 text-slate-400 hover:text-white">
              <User className="w-5 h-5" />
            </button>
            <button onClick={() => setShowLogoutConfirm(true)} className="p-2 text-slate-600 hover:text-red-400">
              <LogOut className="w-5 h-5" />
            </button>
          </nav>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 pt-6">
        <h1 className="text-2xl font-black text-slate-900 mb-4">
          {viewMode === "devis" ? "Mes Devis" : "Mes Factures"}
        </h1>

        <div className="flex gap-2 mb-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              className="input-field pl-11"
              placeholder={viewMode === "devis" ? "Rechercher un client…" : "Rechercher une facture ou un client…"}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-2xl font-bold text-sm border transition-all ${
              hasActiveFilters ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-500 border-slate-200 hover:border-blue-300'
            }`}
          >
            <Filter className="w-4 h-4" />
            <span className="hidden sm:inline">Filtres</span>
            {hasActiveFilters && <span className="w-2 h-2 rounded-full bg-white inline-block" />}
          </button>
        </div>

        {showFilters && (
          <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-4 space-y-4 shadow-sm">
            {viewMode === 'devis' ? (
              <>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Statut</p>
                  <div className="flex flex-wrap gap-2">
                    {(['tous', 'brouillon', 'envoyé', 'accepté', 'refusé'] as StatutFilter[]).map((s) => (
                      <button key={s} onClick={() => setStatutFilter(s)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all capitalize ${
                          statutFilter === s ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                        }`}>{s === 'tous' ? 'Tous' : s}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Période</p>
                  <div className="flex flex-wrap gap-2">
                    {([{ val: 'tout', label: 'Tout' }, { val: 'mois', label: 'Ce mois' }, { val: '3mois', label: '3 derniers mois' }] as { val: PeriodeFilter; label: string }[]).map((p) => (
                      <button key={p.val} onClick={() => setPeriodeFilter(p.val)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                          periodeFilter === p.val ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                        }`}>{p.label}</button>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Statut paiement</p>
                <div className="flex flex-wrap gap-2">
                  {([{ val: 'tous', label: 'Toutes' }, { val: 'payée', label: 'Payées' }, { val: 'non_payée', label: 'Non payées' }] as { val: StatutFactureFilter; label: string }[]).map((s) => (
                    <button key={s.val} onClick={() => setStatutFactureFilter(s.val)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        statutFactureFilter === s.val ? 'bg-slate-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                      }`}>{s.label}</button>
                  ))}
                </div>
              </div>
            )}
            {hasActiveFilters && (
              <button onClick={() => { setStatutFilter('tous'); setPeriodeFilter('tout'); setStatutFactureFilter('tous'); }}
                className="text-xs text-red-500 font-bold hover:underline">
                Réinitialiser les filtres
              </button>
            )}
          </div>
        )}

        <p className="text-xs text-slate-400 font-medium mb-3">
          {viewMode === 'devis'
            ? `${filteredQuotes.length} devis`
            : `${filteredInvoices.length} facture${filteredInvoices.length > 1 ? 's' : ''}`}
        </p>

        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-12 text-slate-400">Chargement…</div>
          ) : viewMode === "devis" ? (
            paginatedQuotes.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200">
                <p className="text-slate-400 font-medium">Aucun devis trouvé</p>
                <p className="text-slate-300 text-sm mt-1">
                  {hasActiveFilters ? 'Essayez de modifier vos filtres' : 'Appuyez sur + pour créer votre premier devis'}
                </p>
              </div>
            ) : (
              paginatedQuotes.map((quote) => (
                <div key={quote.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                  <div className="p-5">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1 min-w-0 pr-3">
                        <p className="font-bold text-slate-900 truncate">{quote.client_name}</p>
                        {quote.signe_par_client && (
                          <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-[10px] font-bold">
                            ✅ Signé par le client
                          </span>
                        )}
                      </div>
                      <span className={`pill-status flex-shrink-0 ${
                        quote.status === "accepté" ? "pill-accepté"
                        : quote.status === "refusé" ? "pill-refusé"
                        : quote.status === "envoyé" ? "pill-envoyé"
                        : "pill-brouillon"
                      }`}>{quote.status}</span>
                    </div>
                    <p className="font-black text-xl text-slate-900">{quote.total_ttc.toFixed(2)} €</p>
                  </div>
                  <div className="flex border-t border-slate-50 bg-slate-50/30">
                    <button onClick={() => onViewQuote(quote)} className="flex-1 py-3 flex justify-center gap-1.5 text-[10px] font-bold uppercase text-slate-400 hover:text-blue-600 border-r border-slate-50">
                      <Eye className="w-4 h-4" /> Voir
                    </button>
                    <button onClick={() => onEditQuote(quote)} className="flex-1 py-3 flex justify-center gap-1.5 text-[10px] font-bold uppercase text-slate-400 hover:text-blue-600 border-r border-slate-50">
                      <Edit2 className="w-4 h-4" /> Modifier
                    </button>
                    {quote.status === "envoyé" && (
                      <button onClick={() => handleAcceptQuote(quote)} disabled={acceptLoading === quote.id}
                        className="flex-1 py-3 flex justify-center gap-1.5 text-[10px] font-bold uppercase text-green-600 hover:bg-green-50 border-r border-slate-50 disabled:opacity-40 transition">
                        <CheckCircle className="w-4 h-4" />
                        {acceptLoading === quote.id ? "…" : "Accepter"}
                      </button>
                    )}
                    <button onClick={() => setQuoteToDelete(quote)} className="flex-1 py-3 flex justify-center gap-1.5 text-[10px] font-bold uppercase text-slate-300 hover:text-red-500">
                      <Trash2 className="w-4 h-4" /> Suppr.
                    </button>
                  </div>
                </div>
              ))
            )
          ) : (
            paginatedInvoices.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200">
                <Receipt className="w-12 h-12 mx-auto text-slate-200 mb-3" />
                <p className="text-slate-400 font-medium">Aucune facture</p>
                <p className="text-slate-300 text-sm mt-1 px-8">
                  {hasActiveFilters ? 'Essayez de modifier vos filtres' : 'Les factures sont générées automatiquement quand un devis est accepté'}
                </p>
              </div>
            ) : (
              paginatedInvoices.map((inv) => {
                const retard = isOverdue(inv);
                const peutRelancer = retard && (inv.nb_relances ?? 0) < 3 && inv.clients?.email;
                return (
                  <div key={inv.id} className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${retard ? 'border-red-200' : 'border-slate-100'}`}>
                    <div className="p-5 flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${retard ? 'bg-red-50 text-red-500' : 'bg-slate-50 text-slate-600'}`}>
                        <Receipt className="w-6 h-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-900 truncate">{inv.clients?.nom ?? "Client inconnu"}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{inv.numero_facture}</p>
                        {retard && (
                          <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 bg-red-100 text-red-600 rounded-full text-[10px] font-bold">
                            ⚠️ En retard{(inv.nb_relances ?? 0) > 0 ? ` · ${inv.nb_relances} relance${inv.nb_relances > 1 ? 's' : ''}` : ''}
                          </span>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="font-black text-slate-900">{Number(inv.montant_ttc).toFixed(2)} €</p>
                        <span className={`text-[10px] font-bold uppercase tracking-wide ${inv.statut === "payée" ? "text-green-600" : "text-amber-500"}`}>
                          {inv.statut === "payée" ? "Payée" : "Non payée"}
                        </span>
                      </div>
                    </div>
                    <div className="flex border-t border-slate-50 bg-slate-50/30">
                      <button onClick={() => onViewInvoice(inv)}
                        className="flex-1 py-3 flex justify-center gap-1.5 text-[10px] font-bold uppercase text-slate-400 hover:text-slate-600 transition border-r border-slate-50">
                        <Eye className="w-4 h-4" /> Voir
                      </button>
                      {peutRelancer && (
                        <button
                          onClick={() => handleRelance(inv)}
                          disabled={relanceLoading === inv.id}
                          className="flex-1 py-3 flex justify-center gap-1.5 text-[10px] font-bold uppercase text-amber-600 hover:bg-amber-50 transition disabled:opacity-40"
                        >
                          <Bell className="w-4 h-4" />
                          {relanceLoading === inv.id ? '…' : 'Relancer'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )
          )}
        </div>

        {viewMode === 'devis' && totalPagesDevis > 1 && (
          <div className="flex items-center justify-center gap-3 mt-6">
            <button onClick={() => setPageDevis(p => Math.max(1, p - 1))} disabled={pageDevis === 1}
              className="p-2 rounded-xl bg-white border border-slate-200 text-slate-500 hover:border-blue-300 disabled:opacity-30 transition">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-sm font-bold text-slate-600">{pageDevis} / {totalPagesDevis}</span>
            <button onClick={() => setPageDevis(p => Math.min(totalPagesDevis, p + 1))} disabled={pageDevis === totalPagesDevis}
              className="p-2 rounded-xl bg-white border border-slate-200 text-slate-500 hover:border-blue-300 disabled:opacity-30 transition">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {viewMode === 'factures' && totalPagesFactures > 1 && (
          <div className="flex items-center justify-center gap-3 mt-6">
            <button onClick={() => setPageFactures(p => Math.max(1, p - 1))} disabled={pageFactures === 1}
              className="p-2 rounded-xl bg-white border border-slate-200 text-slate-500 hover:border-slate-300 disabled:opacity-30 transition">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-sm font-bold text-slate-600">{pageFactures} / {totalPagesFactures}</span>
            <button onClick={() => setPageFactures(p => Math.min(totalPagesFactures, p + 1))} disabled={pageFactures === totalPagesFactures}
              className="p-2 rounded-xl bg-white border border-slate-200 text-slate-500 hover:border-slate-300 disabled:opacity-30 transition">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}
      </main>

      {quoteToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl text-center">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Supprimer le devis ?</h3>
            <p className="text-slate-500 mb-6 text-sm">
              Cette action est irréversible pour le devis de <strong>{quoteToDelete.client_name}</strong>.
            </p>
            <div className="flex flex-col gap-3">
              <button onClick={confirmDelete} className="w-full py-4 bg-red-500 text-white rounded-2xl font-bold shadow-lg shadow-red-100">
                Confirmer la suppression
              </button>
              <button onClick={() => setQuoteToDelete(null)} className="w-full py-4 text-slate-400 font-bold hover:text-slate-600 transition">
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl text-center">
            <h3 className="text-xl font-bold text-slate-900 mb-6">Se déconnecter ?</h3>
            <button onClick={() => supabase.auth.signOut()} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold mb-2 shadow-lg">
              Déconnexion
            </button>
            <button onClick={() => setShowLogoutConfirm(false)} className="w-full py-4 text-slate-400 font-bold">
              Rester
            </button>
          </div>
        </div>
      )}

      {viewMode === "devis" && (
        <button className="fab" onClick={onCreateQuote}>
          <Plus className="w-8 h-8 stroke-[3]" />
        </button>
      )}
    </div>
  );
}