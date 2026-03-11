/*
  # Création des tables pour la gestion de devis

  1. Nouvelles Tables
    - `quotes` (devis)
      - `id` (uuid, clé primaire)
      - `user_id` (uuid, référence à auth.users)
      - `client_name` (text, nom du client)
      - `client_address` (text, adresse du client)
      - `status` (text, statut : brouillon, envoyé, accepté, refusé)
      - `notes` (text, notes supplémentaires)
      - `total_ht` (numeric, total hors taxes)
      - `total_ttc` (numeric, total TTC)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `quote_items` (lignes de devis)
      - `id` (uuid, clé primaire)
      - `quote_id` (uuid, référence à quotes)
      - `service_name` (text, nom de la prestation)
      - `unit_price` (numeric, prix unitaire)
      - `quantity` (numeric, quantité)
      - `total` (numeric, total de la ligne)
      - `created_at` (timestamptz)

  2. Sécurité
    - Activation RLS sur les deux tables
    - Les utilisateurs authentifiés peuvent gérer leurs propres devis
    - Les utilisateurs peuvent voir et modifier uniquement leurs devis
*/

-- Création de la table quotes
CREATE TABLE IF NOT EXISTS quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  client_name text NOT NULL,
  client_address text NOT NULL,
  status text NOT NULL DEFAULT 'brouillon',
  notes text DEFAULT '',
  total_ht numeric(10, 2) NOT NULL DEFAULT 0,
  total_ttc numeric(10, 2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Création de la table quote_items
CREATE TABLE IF NOT EXISTS quote_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid REFERENCES quotes(id) ON DELETE CASCADE NOT NULL,
  service_name text NOT NULL,
  unit_price numeric(10, 2) NOT NULL,
  quantity numeric(10, 2) NOT NULL DEFAULT 1,
  total numeric(10, 2) NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS quotes_user_id_idx ON quotes(user_id);
CREATE INDEX IF NOT EXISTS quote_items_quote_id_idx ON quote_items(quote_id);

-- Activation RLS
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_items ENABLE ROW LEVEL SECURITY;

-- Politiques RLS pour quotes
CREATE POLICY "Les utilisateurs peuvent voir leurs propres devis"
  ON quotes FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Les utilisateurs peuvent créer leurs propres devis"
  ON quotes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Les utilisateurs peuvent modifier leurs propres devis"
  ON quotes FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Les utilisateurs peuvent supprimer leurs propres devis"
  ON quotes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Politiques RLS pour quote_items
CREATE POLICY "Les utilisateurs peuvent voir les lignes de leurs devis"
  ON quote_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM quotes
      WHERE quotes.id = quote_items.quote_id
      AND quotes.user_id = auth.uid()
    )
  );

CREATE POLICY "Les utilisateurs peuvent créer des lignes pour leurs devis"
  ON quote_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM quotes
      WHERE quotes.id = quote_items.quote_id
      AND quotes.user_id = auth.uid()
    )
  );

CREATE POLICY "Les utilisateurs peuvent modifier les lignes de leurs devis"
  ON quote_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM quotes
      WHERE quotes.id = quote_items.quote_id
      AND quotes.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM quotes
      WHERE quotes.id = quote_items.quote_id
      AND quotes.user_id = auth.uid()
    )
  );

CREATE POLICY "Les utilisateurs peuvent supprimer les lignes de leurs devis"
  ON quote_items FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM quotes
      WHERE quotes.id = quote_items.quote_id
      AND quotes.user_id = auth.uid()
    )
  );