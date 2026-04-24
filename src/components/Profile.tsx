import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { User } from "@supabase/supabase-js";
import { ArrowLeft } from "lucide-react";

interface ProfileProps {
  user: User;
  onBack: () => void;
}

interface PlombierProfile {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  adresse: string;
  siret: string;
  nom_entreprise: string;
  tva_intracom: string;
  forme_juridique: string;
  numero_rcs: string;
  iban: string;
  delai_paiement: number;
  taux_penalite: string;
}

const FORMES_JURIDIQUES = [
  'Auto-entrepreneur',
  'Entreprise Individuelle (EI)',
  'EIRL',
  'SARL',
  'SAS',
  'SASU',
  'SA',
  'Autre',
];

export default function Profile({ user, onBack }: ProfileProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [profile, setProfile] = useState<PlombierProfile>({
    id: user.id,
    nom: "",
    prenom: "",
    email: user.email || "",
    telephone: "",
    adresse: "",
    siret: "",
    nom_entreprise: "",
    tva_intracom: "",
    forme_juridique: "",
    numero_rcs: "",
    iban: "",
    delai_paiement: 30,
    taux_penalite: "3 fois le taux légal",
  });

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    setLoading(true);
    const { data } = await supabase
      .from("plombiers")
      .select("*")
      .eq("id", user.id)
      .single();

    if (data) {
      setProfile({
        id: data.id,
        nom: data.nom || "",
        prenom: data.prenom || "",
        email: data.email || user.email || "",
        telephone: data.telephone || "",
        adresse: data.adresse || "",
        siret: data.siret || "",
        nom_entreprise: data.nom_entreprise || "",
        tva_intracom: data.tva_intracom || "",
        forme_juridique: data.forme_juridique || "",
        numero_rcs: data.numero_rcs || "",
        iban: data.iban || "",
        delai_paiement: data.delai_paiement ?? 30,
        taux_penalite: data.taux_penalite || "3 fois le taux légal",
      });
    }
    setLoading(false);
  }

  async function saveProfile() {
    setSaving(true);
    setMessage("");

    const { error } = await supabase
      .from("plombiers")
      .upsert({
        id: user.id,
        nom: profile.nom,
        prenom: profile.prenom,
        email: profile.email,
        telephone: profile.telephone,
        adresse: profile.adresse,
        siret: profile.siret,
        nom_entreprise: profile.nom_entreprise,
        tva_intracom: profile.tva_intracom || null,
        forme_juridique: profile.forme_juridique || null,
        numero_rcs: profile.numero_rcs || null,
        iban: profile.iban || null,
        delai_paiement: profile.delai_paiement,
        taux_penalite: profile.taux_penalite,
      });

    if (error) {
      setMessage("Erreur lors de la sauvegarde : " + error.message);
    } else {
      setMessage("Profil sauvegardé avec succès !");
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="h-16 bg-slate-900" />
        <div className="max-w-2xl mx-auto px-4 py-8 space-y-4">
          {[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-slate-200 rounded-xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-slate-900 text-white shadow-lg h-16 flex items-center px-4">
        <div className="max-w-2xl mx-auto w-full flex items-center gap-3">
          <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-lg transition">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold">Mon Profil</h1>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">

        {/* ── Informations générales ── */}
        <div className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
          <div className="border-b pb-3">
            <h2 className="text-base font-bold text-slate-900">Informations générales</h2>
            <p className="text-xs text-slate-400 mt-0.5">Apparaissent sur vos devis et factures</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nom de l'entreprise</label>
            <input
              type="text"
              value={profile.nom_entreprise}
              onChange={(e) => setProfile({ ...profile, nom_entreprise: e.target.value })}
              placeholder="Ex : Plomberie Dupont"
              className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Prénom</label>
              <input
                type="text"
                value={profile.prenom}
                onChange={(e) => setProfile({ ...profile, prenom: e.target.value })}
                placeholder="Jean"
                className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nom</label>
              <input
                type="text"
                value={profile.nom}
                onChange={(e) => setProfile({ ...profile, nom: e.target.value })}
                placeholder="Dupont"
                className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email professionnel</label>
              <input
                type="email"
                value={profile.email}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                placeholder="jean@plomberie-dupont.fr"
                className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Téléphone</label>
              <input
                type="tel"
                value={profile.telephone}
                onChange={(e) => setProfile({ ...profile, telephone: e.target.value })}
                placeholder="06 12 34 56 78"
                className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Adresse complète</label>
            <textarea
              value={profile.adresse}
              onChange={(e) => setProfile({ ...profile, adresse: e.target.value })}
              placeholder="24 avenue de la République, 75011 Paris"
              rows={2}
              className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* ── Informations légales ── */}
        <div className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
          <div className="border-b pb-3">
            <h2 className="text-base font-bold text-slate-900">Informations légales</h2>
            <p className="text-xs text-slate-400 mt-0.5">Obligatoires sur les factures (art. L441-9 Code de Commerce)</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Numéro SIRET</label>
              <input
                type="text"
                value={profile.siret}
                onChange={(e) => setProfile({ ...profile, siret: e.target.value })}
                placeholder="123 456 789 00012"
                className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Forme juridique</label>
              <select
                value={profile.forme_juridique}
                onChange={(e) => setProfile({ ...profile, forme_juridique: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">— Sélectionner —</option>
                {FORMES_JURIDIQUES.map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                N° TVA intracommunautaire
              </label>
              <input
                type="text"
                value={profile.tva_intracom}
                onChange={(e) => setProfile({ ...profile, tva_intracom: e.target.value })}
                placeholder="FR 12 345678901"
                className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-slate-400 mt-1">Laisser vide si auto-entrepreneur non assujetti</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">N° RCS / RNE</label>
              <input
                type="text"
                value={profile.numero_rcs}
                onChange={(e) => setProfile({ ...profile, numero_rcs: e.target.value })}
                placeholder="RCS Paris 123 456 789"
                className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* ── Conditions de règlement ── */}
        <div className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
          <div className="border-b pb-3">
            <h2 className="text-base font-bold text-slate-900">Conditions de règlement</h2>
            <p className="text-xs text-slate-400 mt-0.5">Obligatoires sur les factures B2B en France</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Délai de paiement (jours)</label>
              <input
                type="number"
                value={profile.delai_paiement}
                onChange={(e) => setProfile({ ...profile, delai_paiement: parseInt(e.target.value) || 30 })}
                min={0}
                max={60}
                className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-slate-400 mt-1">30 jours par défaut (max légal 60 jours)</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Taux pénalités de retard</label>
              <input
                type="text"
                value={profile.taux_penalite}
                onChange={(e) => setProfile({ ...profile, taux_penalite: e.target.value })}
                placeholder="3 fois le taux légal"
                className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">IBAN (pour le règlement)</label>
            <input
              type="text"
              value={profile.iban}
              onChange={(e) => setProfile({ ...profile, iban: e.target.value })}
              placeholder="FR76 3000 6000 0112 3456 7890 189"
              className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
            />
          </div>
        </div>

        {message && (
          <div className={`p-4 rounded-xl text-sm font-medium ${
            message.includes("Erreur")
              ? "bg-red-50 text-red-700 border border-red-200"
              : "bg-green-50 text-green-700 border border-green-200"
          }`}>
            {message}
          </div>
        )}

        <button
          onClick={saveProfile}
          disabled={saving}
          className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-lg shadow-blue-100"
        >
          {saving ? "Sauvegarde en cours..." : "Sauvegarder mon profil"}
        </button>
      </div>
    </div>
  );
}