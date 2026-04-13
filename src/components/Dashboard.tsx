import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { Quote } from "../lib/types";
import {
  Plus, User, Wrench, LogOut, Search,
  Receipt, CheckCircle, Eye, Edit2, Trash2,
} from "lucide-react";
import { User as SupabaseUser } from "@supabase/supabase-js";
import Profile from "./Profile";
import Prestations from "./Prestations";

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
  };
}

interface DashboardProps {
  user: SupabaseUser;
  onCreateQuote: () => void;
  onViewQuote: (quote: Quote) => void;
  onEditQuote: (quote: Quote) => void;
  onViewInvoice: (invoice: any) => void;
}

export default function Dashboard({
  user,
  onCreateQuote,
  onViewQuote,
  onEditQuote,
  onViewInvoice,
}: DashboardProps) {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<"devis" | "factures">("devis");
  const [showProfile, setShowProfile] = useState(false);
  const [showPrestations, setShowPrestations] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [quoteToDelete, setQuoteToDelete] = useState<Quote | null>(null);
  const [toast, setToast] = useState<{ message: string; ok: boolean } | null>(null);
  const [acceptLoading, setAcceptLoading] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode]);

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
          .from("devis")
          .select(`*, clients (nom, adresse)`)
          .eq("plombier_id", user.id)
          .order("created_at", { ascending: false });
        if (data) setQuotes(data.map((r) => toQuote(r as unknown as DevisRow)));
      } else {
        const { data } = await supabase
          .from("factures")
          .select(`*, clients (nom)`)
          .eq("plombier_id", user.id)
          .order("created_at", { ascending: false });
        if (data) setInvoices(data);
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handleAcceptQuote = async (quote: Quote) => {
    setAcceptLoading(quote.id ?? null);
    try {
      const { data: existing } = await supabase
        .from("factures")
        .select("id")
        .eq("devis_id", quote.id)
        .maybeSingle();

      if (existing) {
        setToast({ message: "Une facture existe déjà pour ce devis.", ok: false });
        setViewMode("factures");
        return;
      }

      const { error: updateError } = await supabase
        .from("devis")
        .update({ statut: "accepté" })
        .eq("id", quote.id);
      if (updateError) throw updateError;

      // ✅ Numéro généré par Postgres, séquentiel et sans doublon possible
      const { data: numData, error: numError } = await supabase.rpc('generate_numero_facture', {
        p_plombier_id: user.id,
      });
      if (numError) throw numError;
      const numFacture = numData as string;

      const { error: insertError } = await supabase.from("factures").insert({
        plombier_id: user.id,
        devis_id: quote.id,
        client_id: quote.client_id,
        numero_facture: numFacture,
        montant_ht: quote.total_ht,
        tva: quote.tva,
        tva_rate: quote.tva_rate,
        montant_ttc: quote.total_ttc,
        statut: "non_payée",
      });
      if (insertError) throw insertError;

      setToast({ message: `Facture ${numFacture} générée !`, ok: true });
      setViewMode("factures");
    } catch (err) {
      console.error(err);
      setToast({ message: "Erreur lors de la création de la facture.", ok: false });
    } finally {
      setAcceptLoading(null);
    }
  };

  const confirmDelete = async () => {
    if (!quoteToDelete) return;
    const { error } = await supabase
      .from("devis")
      .delete()
      .eq("id", quoteToDelete.id);
    if (!error) {
      setQuotes(quotes.filter((q) => q.id !== quoteToDelete.id));
      setQuoteToDelete(null);
    }
  };

  if (showProfile) return <Profile user={user} onBack={() => setShowProfile(false)} />;
  if (showPrestations) return <Prestations user={user} onBack={() => setShowPrestations(false)} />;

  const filteredQuotes = quotes.filter((q) =>
    q.client_name.toLowerCase().includes(search.toLowerCase())
  );
  const filteredInvoices = invoices.filter(
    (inv) =>
      (inv.clients?.nom ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (inv.numero_facture ?? "").toLowerCase().includes(search.toLowerCase())
  );

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
              onClick={() => setViewMode(viewMode === "devis" ? "factures" : "devis")}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all ${
                viewMode === "factures"
                  ? "bg-purple-600 text-white shadow-md"
                  : "text-slate-400 hover:bg-white/10"
              }`}
            >
              <Receipt className="w-5 h-5" />
              <span className="hidden sm:inline text-[10px] font-bold uppercase tracking-widest">Factures</span>
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
        <h1 className="text-2xl font-black text-slate-900 mb-6">
          {viewMode === "devis" ? "Mes Devis" : "Mes Factures"}
        </h1>

        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            className="input-field pl-11"
            placeholder={viewMode === "devis" ? "Rechercher un client…" : "Rechercher une facture ou un client…"}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-12 text-slate-400">Chargement…</div>
          ) : viewMode === "devis" ? (
            filteredQuotes.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200">
                <p className="text-slate-400 font-medium">Aucun devis trouvé</p>
                <p className="text-slate-300 text-sm mt-1">Appuyez sur + pour créer votre premier devis</p>
              </div>
            ) : (
              filteredQuotes.map((quote) => (
                <div key={quote.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                  <div className="p-5">
                    <div className="flex justify-between items-start mb-2">
                      <p className="font-bold text-slate-900 truncate pr-3">{quote.client_name}</p>
                      <span className={`pill-status flex-shrink-0 ${
                        quote.status === "accepté" ? "pill-accepté"
                        : quote.status === "refusé" ? "pill-refusé"
                        : quote.status === "envoyé" ? "pill-envoyé"
                        : "pill-brouillon"
                      }`}>
                        {quote.status}
                      </span>
                    </div>
                    <p className="font-black text-xl text-slate-900">{quote.total_ttc.toFixed(2)} €</p>
                  </div>

                  <div className="flex border-t border-slate-50 bg-slate-50/30">
                    <button
                      onClick={() => onViewQuote(quote)}
                      className="flex-1 py-3 flex justify-center gap-1.5 text-[10px] font-bold uppercase text-slate-400 hover:text-blue-600 border-r border-slate-50"
                    >
                      <Eye className="w-4 h-4" /> Voir
                    </button>
                    <button
                      onClick={() => onEditQuote(quote)}
                      className="flex-1 py-3 flex justify-center gap-1.5 text-[10px] font-bold uppercase text-slate-400 hover:text-blue-600 border-r border-slate-50"
                    >
                      <Edit2 className="w-4 h-4" /> Modifier
                    </button>
                    {quote.status === "envoyé" && (
                      <button
                        onClick={() => handleAcceptQuote(quote)}
                        disabled={acceptLoading === quote.id}
                        className="flex-1 py-3 flex justify-center gap-1.5 text-[10px] font-bold uppercase text-green-600 hover:bg-green-50 border-r border-slate-50 disabled:opacity-40 transition"
                      >
                        <CheckCircle className="w-4 h-4" />
                        {acceptLoading === quote.id ? "…" : "Accepter"}
                      </button>
                    )}
                    <button
                      onClick={() => setQuoteToDelete(quote)}
                      className="flex-1 py-3 flex justify-center gap-1.5 text-[10px] font-bold uppercase text-slate-300 hover:text-red-500"
                    >
                      <Trash2 className="w-4 h-4" /> Suppr.
                    </button>
                  </div>
                </div>
              ))
            )
          ) : (
            filteredInvoices.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200">
                <Receipt className="w-12 h-12 mx-auto text-slate-200 mb-3" />
                <p className="text-slate-400 font-medium">Aucune facture</p>
                <p className="text-slate-300 text-sm mt-1 px-8">
                  Les factures sont générées automatiquement quand un devis est accepté
                </p>
              </div>
            ) : (
              filteredInvoices.map((inv) => (
                <div key={inv.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                  <div className="p-5 flex items-center gap-4">
                    <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Receipt className="w-6 h-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-900 truncate">{inv.clients?.nom ?? "Client inconnu"}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{inv.numero_facture}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-black text-slate-900">{Number(inv.montant_ttc).toFixed(2)} €</p>
                      <span className={`text-[10px] font-bold uppercase tracking-wide ${inv.statut === "payée" ? "text-green-600" : "text-amber-500"}`}>
                        {inv.statut === "payée" ? "Payée" : "Non payée"}
                      </span>
                    </div>
                  </div>
                  <div className="flex border-t border-slate-50 bg-slate-50/30">
                    <button
                      onClick={() => onViewInvoice(inv)}
                      className="flex-1 py-3 flex justify-center gap-1.5 text-[10px] font-bold uppercase text-slate-400 hover:text-purple-600 transition"
                    >
                      <Eye className="w-4 h-4" /> Voir la facture
                    </button>
                  </div>
                </div>
              ))
            )
          )}
        </div>
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