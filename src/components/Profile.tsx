import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { User } from "@supabase/supabase-js";

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
}

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
  });

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    setLoading(true);
    const { data, error } = await supabase
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Chargement du profil...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-center mb-8">
          <button
            onClick={onBack}
            className="mr-4 text-blue-600 hover:text-blue-800 font-medium"
          >
            ← Retour
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Mon Profil</h1>
        </div>

        {/* Formulaire */}
        <div className="bg-white rounded-xl shadow-sm p-6 space-y-6">

          <div className="border-b pb-4">
            <h2 className="text-lg font-semibold text-gray-700">
              Informations personnelles
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Ces informations apparaîtront sur vos devis
            </p>
          </div>

          {/* Nom entreprise */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nom de l'entreprise
            </label>
            <input
              type="text"
              value={profile.nom_entreprise}
              onChange={(e) =>
                setProfile({ ...profile, nom_entreprise: e.target.value })
              }
              placeholder="Ex : Plomberie Dupont"
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Prénom et Nom */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Prénom
              </label>
              <input
                type="text"
                value={profile.prenom}
                onChange={(e) =>
                  setProfile({ ...profile, prenom: e.target.value })
                }
                placeholder="Jean"
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nom
              </label>
              <input
                type="text"
                value={profile.nom}
                onChange={(e) =>
                  setProfile({ ...profile, nom: e.target.value })
                }
                placeholder="Dupont"
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Email et Téléphone */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email professionnel
              </label>
              <input
                type="email"
                value={profile.email}
                onChange={(e) =>
                  setProfile({ ...profile, email: e.target.value })
                }
                placeholder="jean@plomberie-dupont.fr"
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Téléphone
              </label>
              <input
                type="tel"
                value={profile.telephone}
                onChange={(e) =>
                  setProfile({ ...profile, telephone: e.target.value })
                }
                placeholder="06 12 34 56 78"
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Adresse */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Adresse complète
            </label>
            <textarea
              value={profile.adresse}
              onChange={(e) =>
                setProfile({ ...profile, adresse: e.target.value })
              }
              placeholder="24 avenue de la République, 75011 Paris"
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* SIRET */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Numéro SIRET
            </label>
            <input
              type="text"
              value={profile.siret}
              onChange={(e) =>
                setProfile({ ...profile, siret: e.target.value })
              }
              placeholder="123 456 789 00012"
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Message de confirmation */}
          {message && (
            <div
              className={`p-3 rounded-lg text-sm font-medium ${
                message.includes("Erreur")
                  ? "bg-red-50 text-red-700"
                  : "bg-green-50 text-green-700"
              }`}
            >
              {message}
            </div>
          )}

          {/* Bouton sauvegarder */}
          <button
            onClick={saveProfile}
            disabled={saving}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {saving ? "Sauvegarde en cours..." : "Sauvegarder mon profil"}
          </button>
        </div>
      </div>
    </div>
  );
}