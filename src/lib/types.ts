/** Table plombiers */
export interface Plombier {
  id: string;
  nom: string;
  prenom: string;
  adresse: string;
  siret: string;
}

/** Table clients - informations client */
export interface Client {
  id: string;
  plombier_id: string;
  nom: string;
  adresse: string;
  email?: string;
  telephone?: string;
  created_at?: string;
}

/** Table prestations - services disponibles */
export interface Prestation {
  id: string;
  nom: string;
  prix_unitaire: number;
}

/** Table lignes_devis */
export interface LigneDevis {
  id?: string;
  devis_id?: string;
  prestation_id?: string;
  description: string;
  quantite: number;
  prix_unitaire: number;
  montant_ht: number;
}

/** Table devis */
export interface Devis {
  id?: string;
  plombier_id: string;
  client_id: string;
  numero?: string;
  statut: 'brouillon' | 'envoyé' | 'accepté' | 'refusé';
  date_emission?: string;
  date_validite?: string;
  montant_ht: number;
  tva: number;
  montant_ttc: number;
  notes?: string;
  created_at?: string;
}

/** Représentation d'un devis avec infos client (pour l'affichage) */
export interface Quote {
  id?: string;
  plombier_id?: string;
  client_id?: string;
  client_name: string;
  client_address: string;
  numero?: string;
  status: 'brouillon' | 'envoyé' | 'accepté' | 'refusé';
  date_emission?: string;
  total_ht: number;
  tva: number;
  total_ttc: number;
  notes?: string;
  created_at?: string;
}

/** Ligne de devis pour l'affichage */
export interface QuoteItem {
  id?: string;
  description: string;
  quantite: number;
  prix_unitaire: number;
  montant_ht: number;
}
