import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { Quote } from "../lib/types";
import { Plus, ChevronRight, User, Wrench, LogOut, Search, FileText, TrendingUp } from "lucide-react";
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
    client_name: row.clients?.nom ?? "Client inconnu",
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
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("tous");
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [quoteToDelete, setQuoteToDelete] = useState<Quote | null>(null);

  useEffect(() => { loadQuotes(); }, []);

  const loadQuotes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("devis")
        .select(`*, clients (nom, adresse)`)
        .eq("plombier_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setQuotes((data || []).map((r) => toQuote(r as unknown as DevisRow)));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const deleteQuote = async (id: string) => {
    const { error } = await supabase.from("devis").delete().eq("id", id);
    if (!error) {
      setQuotes(prev => prev.filter(q => q.id !== id));
      setQuoteToDelete(null);
    }
  };

  if (showProfile) return <Profile user={user} onBack={() => setShowProfile(false)} />;
  if (showPrestations) return <Prestations user={user} onBack={() => setShowPrestations(false)} />;

  const filtered = quotes.filter(q => 
    (filterStatus === "tous" || q.status === filterStatus) &&
    q.client_name.toLowerCase().includes(search.toLowerCase())
  );

  const totalCA = quotes.filter(q => q.status === 'accepté').reduce((acc, curr) => acc + curr.total_ttc, 0);

  return (
    <div className="min-h-screen pb-28 bg-slate-50 font-sans">
      {/* HEADER FIXE - BLEU NAVY */}
      <header className="bg-slate-900 text-white sticky top-0 z-30 shadow-lg border-b border-slate-800">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-1.5 rounded-lg shadow-inner">
              <Wrench className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight">PlombierPro</span>
          </div>

          <nav className="flex items-center gap-1 sm:gap-3">
            <button
              onClick={() => setShowPrestations(true)}
              className="flex items-center gap-2 p-2 sm:px-3 sm:py-1.5 rounded-lg hover:bg-white/10 transition-colors text-blue-400 sm:text-slate-200"
            >
              <Wrench className="w-5 h-5" />
              <span className="hidden sm:inline text-xs font-bold uppercase tracking-wider">Prestations</span>
            </button>
            
            <button
              onClick={() => setShowProfile(true)}
              className="flex items-center gap-2 p-2 sm:px-3 sm:py-1.5 rounded-lg hover:bg-white/10 transition-colors text-blue-400 sm:text-slate-200"
            >
              <User className="w-5 h-5" />
              <span className="hidden sm:inline text-xs font-bold uppercase tracking-wider">Profil</span>
            </button>

            <button onClick={() => setShowLogoutConfirm(true)} className="p-2 text-slate-500 hover:text-red-400">
              <LogOut className="w-5 h-5" />
            </button>
          </nav>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 pt-6">
        {/* RESUME CA */}
        <div className="bg-white rounded-2xl p-5 mb-6 border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Chiffre d'Affaires</p>
            <p className="text-2xl font-black text-slate-900">{totalCA.toLocaleString()} €</p>
          </div>
          <div className="bg-green-50 p-3 rounded-full">
            <TrendingUp className="w-6 h-6 text-green-500" />
          </div>
        </div>

        {/* RECHERCHE */}
        <div className="relative mb-4">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            className="input-field pl-11"
            placeholder="Rechercher un client ou un numéro..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* FILTRES HORIZONTAUX */}
        <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide">
          {["tous", "brouillon", "envoyé", "accepté", "refusé"].map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-5 py-2 rounded-full text-xs font-bold border transition-all whitespace-nowrap ${
                filterStatus === s ? 'bg-blue-600 border-blue-600 text-white shadow-md' : 'bg-white border-slate-200 text-slate-500'
              }`}
            >
              {s.toUpperCase()}
            </button>
          ))}
        </div>

        {/* LISTE DEVIS */}
        <div className="space-y-3">
          {loading ? (
             <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-slate-200">
              <FileText className="w-12 h-12 mx-auto text-slate-200 mb-3" />
              <p className="text-slate-400 font-medium">Aucun devis trouvé</p>
            </div>
          ) : (
            filtered.map((quote) => {
              const cfg = STATUS_CONFIG[quote.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.brouillon;
              return (
                <div key={quote.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden hover:border-blue-200 transition-colors">
                  <button onClick={() => onViewQuote(quote)} className="w-full p-4 flex items-center gap-4 active:bg-slate-50">
                    <div className={`w-1 h-12 rounded-full ${quote.status === 'accepté' ? 'bg-green-500' : quote.status === 'envoyé' ? 'bg-blue-500' : 'bg-slate-200'}`} />
                    <div className="flex-1 text-left min-w-0">
                      <div className="flex justify-between items-start mb-1">
                        <p className="font-bold text-slate-900 truncate">{quote.client_name}</p>
                        <span className={`pill-status ${cfg.className}`}>{cfg.label}</span>
                      </div>
                      <div className="flex justify-between items-baseline">
                        <p className="text-xs text-slate-400 font-medium">{quote.numero || "Nouveau devis"}</p>
                        <p className="font-black text-slate-900 text-lg">{quote.total_ttc.toFixed(0)} €</p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-300" />
                  </button>
                  <div className="flex border-t border-slate-50">
                    <button onClick={() => onEditQuote(quote)} className="flex-1 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-blue-600 border-r border-slate-50 transition-colors">Modifier</button>
                    <button onClick={() => setQuoteToDelete(quote)} className="flex-1 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-red-500 transition-colors">Supprimer</button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>

      {/* BOUTON FLOTTANT "+" */}
      <button className="fab" onClick={onCreateQuote} aria-label="Nouveau devis">
        <Plus className="w-8 h-8 stroke-[3]" />
      </button>

      {/* MODAL DECONNEXION */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-in slide-in-from-bottom-4">
            <h3 className="text-xl font-bold text-slate-900 mb-2 text-center">Se déconnecter ?</h3>
            <p className="text-slate-500 text-center mb-6">Vous devrez vous reconnecter pour accéder à vos devis.</p>
            <div className="flex flex-col gap-2">
              <button onClick={() => supabase.auth.signOut()} className="w-full py-4 bg-red-500 text-white rounded-2xl font-bold shadow-lg shadow-red-100">Déconnexion</button>
              <button onClick={() => setShowLogoutConfirm(false)} className="w-full py-4 text-slate-500 font-bold hover:bg-slate-50 rounded-2xl transition">Annuler</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL SUPPRESSION */}
      {quoteToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-3xl p-6 w-full max-w-xs shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900 mb-2 text-center">Supprimer ce devis ?</h3>
            <p className="text-slate-500 text-sm text-center mb-6 italic">"{quoteToDelete.client_name}"</p>
            <div className="flex flex-col gap-2">
              <button onClick={() => deleteQuote(quoteToDelete.id)} className="w-full py-3 bg-red-500 text-white rounded-xl font-bold">Confirmer</button>
              <button onClick={() => setQuoteToDelete(null)} className="w-full py-3 text-slate-500 font-bold">Annuler</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}