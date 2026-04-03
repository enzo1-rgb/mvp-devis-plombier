import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { Quote } from "../lib/types";
import { Plus, ChevronRight, User, Wrench, LogOut, Search, FileText } from "lucide-react";
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
    client_name: row.clients?.nom ?? "",
    client_address: row.clients?.adresse ?? "",
    numero: row.numero ?? undefined,
    status: (row.statut as Quote["status"]) ?? "brouillon",
    date_emission: row.date_emission ?? undefined,
    total_ht: Number(row.montant_ht) || 0,
    tva: Number(row.tva) || 0,
    total_ttc: Number(row.montant_ttc) || 0,
    notes: row.notes ?? undefined,
    created_at: row.created_at ?? undefined,
  };
}

const STATUS_CONFIG = {
  brouillon: { label: "Brouillon", className: "pill-brouillon" },
  envoyé:    { label: "Envoyé",    className: "pill-envoyé"    },
  accepté:   { label: "Accepté",   className: "pill-accepté"   },
  refusé:    { label: "Refusé",    className: "pill-refusé"    },
} as const;

interface DashboardProps {
  user: SupabaseUser;
  onCreateQuote: () => void;
  onViewQuote: (quote: Quote) => void;
  onEditQuote: (quote: Quote) => void;
}

export default function Dashboard({ user, onCreateQuote, onViewQuote, onEditQuote }: DashboardProps) {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [showProfile, setShowProfile] = useState(false);
  const [showPrestations, setShowPrestations] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("tous");
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [quoteToDelete, setQuoteToDelete] = useState<Quote | null>(null);

  useEffect(() => {
    loadQuotes();
  }, []);

  const loadQuotes = async () => {
    setError(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) { setError("Session expirée."); return; }

      const { data, error } = await supabase
        .from("devis")
        .select(`id, plombier_id, client_id, numero, statut, date_emission, montant_ht, tva, montant_ttc, notes, created_at, clients (nom, adresse)`)
        .eq("plombier_id", sessionData.session.user.id)
        .order("created_at", { ascending: false });

      if (error) { setError(`Erreur: ${error.message}`); return; }
      setQuotes((data || []).map((r) => toQuote(r as unknown as DevisRow)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    setShowLogoutConfirm(false);
    await supabase.auth.signOut();
  };

  const deleteQuote = async (id?: string) => {
    if (!id) return;
    try {
      const { error } = await supabase.from("devis").delete().eq("id", id);
      if (error) { alert(`Impossible de supprimer : ${error.message}`); return; }
      setQuotes((prev) => prev.filter((q) => q.id !== id));
      setQuoteToDelete(null);
    } catch { alert("Erreur inattendue."); }
  };

  if (showProfile) return <Profile user={user} onBack={() => setShowProfile(false)} />;
  if (showPrestations) return <Prestations user={user} onBack={() => setShowPrestations(false)} />;

  // Stats
  const totalCA = quotes.filter(q => q.status === "accepté").reduce((s, q) => s + q.total_ttc, 0);
  const tauxAcceptation = quotes.filter(q => q.status !== "brouillon").length > 0
    ? Math.round((quotes.filter(q => q.status === "accepté").length / quotes.filter(q => q.status !== "brouillon").length) * 100)
    : 0;

  // Filtered quotes
  const filtered = quotes.filter(q => {
    const matchSearch = q.client_name.toLowerCase().includes(search.toLowerCase()) ||
      (q.numero ?? "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "tous" || q.status === filterStatus;
    return matchSearch && matchStatus;
  });

  return (
    <div className="min-h-screen pb-24" style={{ background: 'var(--bg)' }}>

      {/* Header */}
      <header style={{ background: 'var(--navy)' }} className="sticky top-0 z-30">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--orange)' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
              </svg>
            </div>
            <span className="text-white font-bold text-lg tracking-tight">Mes Devis</span>
          </div>

          {/* Menu button */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="w-9 h-9 rounded-full flex items-center justify-center transition"
              style={{ background: 'rgba(255,255,255,0.1)' }}
            >
              <div className="w-6 h-6 flex flex-col justify-center gap-1.5 items-center">
                <span className="block w-4 h-0.5 bg-white rounded"></span>
                <span className="block w-4 h-0.5 bg-white rounded"></span>
                <span className="block w-4 h-0.5 bg-white rounded"></span>
              </div>
            </button>

            {showMenu && (
              <div className="absolute right-0 top-11 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 w-52 z-50">
                <button
                  onClick={() => { setShowMenu(false); setShowPrestations(true); }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-slate-700 hover:bg-slate-50 transition text-sm font-medium"
                >
                  <Wrench className="w-4 h-4 text-slate-400" />
                  Mes prestations
                </button>
                <button
                  onClick={() => { setShowMenu(false); setShowProfile(true); }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-slate-700 hover:bg-slate-50 transition text-sm font-medium"
                >
                  <User className="w-4 h-4 text-slate-400" />
                  Mon profil
                </button>
                <div className="border-t border-slate-100 my-1" />
                <button
                  onClick={() => { setShowMenu(false); setShowLogoutConfirm(true); }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-50 transition text-sm font-medium"
                >
                  <LogOut className="w-4 h-4" />
                  Déconnexion
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Click outside to close menu */}
      {showMenu && <div className="fixed inset-0 z-20" onClick={() => setShowMenu(false)} />}

      <div className="max-w-2xl mx-auto px-4 pt-5">

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
            <p className="text-xs text-slate-400 font-medium mb-1">Total</p>
            <p className="text-2xl font-bold" style={{ color: 'var(--navy)' }}>{quotes.length}</p>
            <p className="text-xs text-slate-400">devis</p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
            <p className="text-xs text-slate-400 font-medium mb-1">CA accepté</p>
            <p className="text-xl font-bold" style={{ color: 'var(--navy)' }}>{totalCA >= 1000 ? `${(totalCA/1000).toFixed(1)}k` : totalCA.toFixed(0)}€</p>
            <p className="text-xs text-slate-400">TTC</p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
            <p className="text-xs text-slate-400 font-medium mb-1">Taux</p>
            <p className="text-2xl font-bold" style={{ color: tauxAcceptation >= 50 ? '#22c55e' : 'var(--navy)' }}>{tauxAcceptation}%</p>
            <p className="text-xs text-slate-400">acceptés</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            className="input-field pl-10"
            placeholder="Rechercher un client, une référence..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Status filter */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
          {["tous", "brouillon", "envoyé", "accepté", "refusé"].map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className="whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-semibold transition-all"
              style={
                filterStatus === s
                  ? { background: 'var(--navy)', color: 'white' }
                  : { background: 'white', color: '#64748b', border: '1.5px solid #e2e8f0' }
              }
            >
              {s === "tous" ? "Tous" : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-sm">
            {error}
            <button onClick={loadQuotes} className="ml-2 underline">Réessayer</button>
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div className="text-center py-16">
            <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2" style={{ borderColor: 'var(--orange)' }}></div>
            <p className="mt-3 text-slate-400 text-sm">Chargement...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl shadow-sm border border-slate-100">
            <FileText className="w-12 h-12 mx-auto text-slate-200 mb-3" />
            <p className="text-slate-500 font-medium">
              {search || filterStatus !== "tous" ? "Aucun résultat" : "Aucun devis pour l'instant"}
            </p>
            {!search && filterStatus === "tous" && (
              <p className="text-slate-400 text-sm mt-1">Appuyez sur + pour créer votre premier devis</p>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((quote) => {
              const cfg = STATUS_CONFIG[quote.status as keyof typeof STATUS_CONFIG];
              return (
                <div
                  key={quote.id}
                  className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden"
                >
                  <button
                    onClick={() => onViewQuote(quote)}
                    className="w-full text-left p-4 flex items-center gap-3 active:bg-slate-50 transition"
                  >
                    {/* Status bar */}
                    <div
                      className="w-1 self-stretch rounded-full flex-shrink-0"
                      style={{
                        background: quote.status === 'accepté' ? '#22c55e'
                          : quote.status === 'refusé' ? '#ef4444'
                          : quote.status === 'envoyé' ? '#3b82f6'
                          : '#cbd5e1'
                      }}
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <p className="font-bold text-slate-800 truncate">{quote.client_name}</p>
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ${cfg.className}`}>
                          {cfg.label}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs text-slate-400 truncate">
                          {quote.numero ?? quote.id.slice(0, 8).toUpperCase()}
                          {quote.created_at && (
                            <span className="ml-2">
                              · {new Date(quote.created_at).toLocaleDateString("fr-FR")}
                            </span>
                          )}
                        </p>
                        <p className="text-sm font-bold text-slate-700 flex-shrink-0">
                          {quote.total_ttc.toFixed(0)} €
                        </p>
                      </div>
                    </div>

                    <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
                  </button>

                  {/* Actions */}
                  <div className="border-t border-slate-50 flex divide-x divide-slate-50">
                    <button
                      onClick={() => onEditQuote(quote)}
                      className="flex-1 py-2.5 text-xs font-semibold text-slate-500 hover:bg-slate-50 hover:text-orange-500 transition"
                    >
                      Modifier
                    </button>
                    <button
                      onClick={() => setQuoteToDelete(quote)}
                      className="flex-1 py-2.5 text-xs font-semibold text-slate-500 hover:bg-red-50 hover:text-red-500 transition"
                    >
                      Supprimer
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* FAB */}
      <button className="fab" onClick={onCreateQuote}>
        <Plus className="w-6 h-6" />
      </button>

      {/* Modal déconnexion */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold text-slate-800 mb-1">Se déconnecter ?</h3>
            <p className="text-slate-500 text-sm mb-6">Vous allez être déconnecté de votre espace.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowLogoutConfirm(false)} className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 transition">
                Annuler
              </button>
              <button onClick={handleSignOut} className="flex-1 py-3 rounded-xl bg-red-500 text-white font-semibold hover:bg-red-600 transition">
                Déconnexion
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal suppression */}
      {quoteToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold text-slate-800 mb-1">Supprimer ce devis ?</h3>
            <p className="text-slate-500 text-sm mb-6">
              Le devis de <strong>{quoteToDelete.client_name}</strong> sera supprimé définitivement.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setQuoteToDelete(null)} className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 transition">
                Annuler
              </button>
              <button onClick={() => deleteQuote(quoteToDelete.id)} className="flex-1 py-3 rounded-xl bg-red-500 text-white font-semibold hover:bg-red-600 transition">
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
