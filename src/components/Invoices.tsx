import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { ArrowLeft, CheckCircle2, Search, Receipt } from "lucide-react";

interface InvoicesProps {
  onBack: () => void;
}

export default function Invoices({ onBack }: InvoicesProps) {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadInvoices();
  }, []);

  async function loadInvoices() {
    const { data: { session } } = await supabase.auth.getSession();
    const { data, error } = await supabase
      .from("factures")
      .select(`
        id, 
        numero, 
        statut, 
        montant_ttc, 
        date_emission, 
        devis (
          clients (nom)
        )
      `)
      .eq("plombier_id", session?.user.id)
      .order("created_at", { ascending: false });
    
    if (error) console.error(error);
    setInvoices(data || []);
    setLoading(false);
  }

  async function togglePayment(id: string, currentStatus: string) {
    const newStatus = currentStatus === 'payée' ? 'non_payée' : 'payée';
    const { error } = await supabase
      .from("factures")
      .update({ statut: newStatus })
      .eq("id", id);
    
    if (!error) loadInvoices();
  }

  const filtered = invoices.filter(inv => 
    (inv.devis?.clients?.nom || "").toLowerCase().includes(search.toLowerCase()) ||
    inv.numero.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <header className="bg-slate-900 text-white p-4 sticky top-0 z-30 flex items-center gap-4 shadow-lg">
        <button onClick={onBack} className="p-2 -ml-2 hover:bg-white/10 rounded-full transition">
          <ArrowLeft />
        </button>
        <h1 className="text-xl font-bold italic">Mes Factures</h1>
      </header>

      <div className="max-w-2xl mx-auto px-4 pt-6">
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            className="w-full bg-white border border-slate-200 rounded-2xl py-3 pl-10 pr-4 outline-none focus:ring-2 focus:ring-orange-500 transition-all shadow-sm"
            placeholder="Rechercher un client ou un numéro..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="text-center py-20 text-slate-400 italic">Chargement des factures...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200">
            <Receipt className="w-12 h-12 mx-auto text-slate-200 mb-2" />
            <p className="text-slate-400 font-medium">Aucune facture trouvée</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((inv) => (
              <div key={inv.id} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex items-center justify-between transition-all active:scale-[0.98]">
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-800 truncate text-lg">
                    {inv.devis?.clients?.nom || "Client inconnu"}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${inv.statut === 'payée' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                      {inv.statut === 'payée' ? 'Payée' : 'En attente'}
                    </span>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{inv.numero}</span>
                  </div>
                </div>
                <div className="text-right flex items-center gap-4 ml-4">
                  <span className="font-black text-slate-900 text-xl">{inv.montant_ttc.toFixed(0)}€</span>
                  <button 
                    onClick={() => togglePayment(inv.id, inv.statut)}
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-md ${inv.statut === 'payée' ? 'bg-green-500 text-white shadow-green-100' : 'bg-slate-100 text-slate-300'}`}
                  >
                    <CheckCircle2 size={26} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}