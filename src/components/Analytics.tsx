import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { ArrowLeft, TrendingUp, FileText, Receipt, Users, Clock, CheckCircle } from 'lucide-react';

interface AnalyticsProps {
  user: SupabaseUser;
  onBack: () => void;
}

interface StatsMois {
  mois: string;
  ca: number;
  nb_factures: number;
}

interface TopClient {
  nom: string;
  total: number;
  nb: number;
}

export default function Analytics({ user, onBack }: AnalyticsProps) {
  const [loading, setLoading] = useState(true);
  const [caTotal, setCaTotal] = useState(0);
  const [caMois, setCaMois] = useState(0);
  const [nbDevis, setNbDevis] = useState(0);
  const [nbDevisAcceptes, setNbDevisAcceptes] = useState(0);
  const [nbFacturesImpayees, setNbFacturesImpayees] = useState(0);
  const [montantImpaye, setMontantImpaye] = useState(0);
  const [statsMois, setStatsMois] = useState<StatsMois[]>([]);
  const [topClients, setTopClients] = useState<TopClient[]>([]);
  const [nbClientsUniques, setNbClientsUniques] = useState(0);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    await Promise.all([
      loadFacturesStats(),
      loadDevisStats(),
      loadTopClients(),
    ]);
    setLoading(false);
  };

  const loadFacturesStats = async () => {
    const { data } = await supabase
      .from('factures')
      .select('montant_ttc, statut, created_at')
      .eq('plombier_id', user.id);

    if (!data) return;

    const now = new Date();
    const debutMois = new Date(now.getFullYear(), now.getMonth(), 1);

    const total = data.reduce((sum, f) => sum + Number(f.montant_ttc), 0);
    const mois = data
      .filter(f => new Date(f.created_at) >= debutMois)
      .reduce((sum, f) => sum + Number(f.montant_ttc), 0);
    const impayees = data.filter(f => f.statut === 'non_payée');
    const montantImp = impayees.reduce((sum, f) => sum + Number(f.montant_ttc), 0);

    setCaTotal(total);
    setCaMois(mois);
    setNbFacturesImpayees(impayees.length);
    setMontantImpaye(montantImp);

    // Stats par mois (6 derniers mois)
    const sixMoisAgo = new Date();
    sixMoisAgo.setMonth(sixMoisAgo.getMonth() - 5);
    sixMoisAgo.setDate(1);

    const parMois: Record<string, { ca: number; nb: number }> = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      parMois[key] = { ca: 0, nb: 0 };
    }

    data.forEach(f => {
      const d = new Date(f.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (parMois[key]) {
        parMois[key].ca += Number(f.montant_ttc);
        parMois[key].nb += 1;
      }
    });

    const MOIS_FR = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
    setStatsMois(
      Object.entries(parMois).map(([key, val]) => {
        const [, m] = key.split('-');
        return { mois: MOIS_FR[parseInt(m) - 1], ca: val.ca, nb_factures: val.nb };
      })
    );
  };

  const loadDevisStats = async () => {
    const { data } = await supabase
      .from('devis')
      .select('statut, client_id')
      .eq('plombier_id', user.id);

    if (!data) return;

    setNbDevis(data.length);
    setNbDevisAcceptes(data.filter(d => d.statut === 'accepté').length);

    const clientsUniques = new Set(data.map(d => d.client_id)).size;
    setNbClientsUniques(clientsUniques);
  };

  const loadTopClients = async () => {
    const { data: factures } = await supabase
      .from('factures')
      .select('montant_ttc, client_id, clients(nom)')
      .eq('plombier_id', user.id);

    if (!factures) return;

    const parClient: Record<string, { nom: string; total: number; nb: number }> = {};
    factures.forEach((f: any) => {
      const nom = f.clients?.nom ?? 'Inconnu';
      const id = f.client_id;
      if (!parClient[id]) parClient[id] = { nom, total: 0, nb: 0 };
      parClient[id].total += Number(f.montant_ttc);
      parClient[id].nb += 1;
    });

    const sorted = Object.values(parClient)
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    setTopClients(sorted);
  };

  const tauxAcceptation = nbDevis > 0 ? Math.round((nbDevisAcceptes / nbDevis) * 100) : 0;

  const maxCA = Math.max(...statsMois.map(s => s.ca), 1);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="h-16 bg-slate-900" />
        <div className="max-w-5xl mx-auto px-4 py-8 space-y-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-slate-200 rounded-xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-16">

      <header className="bg-slate-900 text-white sticky top-0 z-30 shadow-lg h-16 flex items-center">
        <div className="max-w-2xl mx-auto px-4 w-full flex items-center gap-3">
          <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-lg transition">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <TrendingUp className="w-5 h-5 text-blue-400" />
          <h1 className="font-bold text-lg">Tableau de bord</h1>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 pt-6 space-y-6">

        {/* KPIs principaux */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">CA total</p>
            <p className="text-2xl font-black text-slate-900">{caTotal.toFixed(0)} €</p>
            <p className="text-xs text-slate-400 mt-1">toutes factures</p>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">CA ce mois</p>
            <p className="text-2xl font-black text-blue-600">{caMois.toFixed(0)} €</p>
            <p className="text-xs text-slate-400 mt-1">{new Date().toLocaleString('fr-FR', { month: 'long' })}</p>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Taux acceptation</p>
            <p className="text-2xl font-black text-green-600">{tauxAcceptation}%</p>
            <p className="text-xs text-slate-400 mt-1">{nbDevisAcceptes} / {nbDevis} devis</p>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Clients</p>
            <p className="text-2xl font-black text-slate-900">{nbClientsUniques}</p>
            <p className="text-xs text-slate-400 mt-1">clients uniques</p>
          </div>
        </div>

        {/* Impayés */}
        {nbFacturesImpayees > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="font-bold text-amber-900">
                  {montantImpaye.toFixed(0)} € en attente de paiement
                </p>
                <p className="text-sm text-amber-700">
                  {nbFacturesImpayees} facture{nbFacturesImpayees > 1 ? 's' : ''} non payée{nbFacturesImpayees > 1 ? 's' : ''}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Graphique CA 6 mois */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <h2 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
            <Receipt className="w-4 h-4 text-blue-500" />
            Chiffre d'affaires — 6 derniers mois
          </h2>
          <div className="flex items-end gap-2 h-32">
            {statsMois.map((s, i) => {
              const hauteur = maxCA > 0 ? Math.max((s.ca / maxCA) * 100, s.ca > 0 ? 8 : 0) : 0;
              const estMoisActuel = i === statsMois.length - 1;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <p className="text-[9px] text-slate-400 font-bold">
                    {s.ca > 0 ? `${s.ca.toFixed(0)}€` : ''}
                  </p>
                  <div className="w-full flex items-end justify-center" style={{ height: '80px' }}>
                    <div
                      className={`w-full rounded-t-lg transition-all ${estMoisActuel ? 'bg-blue-500' : 'bg-slate-200'}`}
                      style={{ height: `${hauteur}%` }}
                    />
                  </div>
                  <p className={`text-[10px] font-bold ${estMoisActuel ? 'text-blue-600' : 'text-slate-400'}`}>
                    {s.mois}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top clients */}
        {topClients.length > 0 && (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <h2 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
              <Users className="w-4 h-4 text-slate-500" />
              Top clients
            </h2>
            <div className="space-y-3">
              {topClients.map((c, i) => {
                const pct = topClients[0].total > 0 ? (c.total / topClients[0].total) * 100 : 0;
                return (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-[10px] font-black text-slate-500">{i + 1}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-1">
                        <p className="text-sm font-semibold text-slate-800 truncate">{c.nom}</p>
                        <p className="text-sm font-black text-slate-900 ml-2 flex-shrink-0">{c.total.toFixed(0)} €</p>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-slate-400"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5">{c.nb} facture{c.nb > 1 ? 's' : ''}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Résumé devis */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <h2 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-500" />
            Résumé des devis
          </h2>
          <div className="grid grid-cols-3 gap-3 text-center">
            {[
              { label: 'Total', value: nbDevis, color: 'text-slate-900' },
              { label: 'Acceptés', value: nbDevisAcceptes, color: 'text-green-600' },
              { label: 'Taux', value: `${tauxAcceptation}%`, color: 'text-blue-600' },
            ].map((item, i) => (
              <div key={i} className="bg-slate-50 rounded-xl p-3">
                <p className={`text-xl font-black ${item.color}`}>{item.value}</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">{item.label}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}