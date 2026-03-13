-- Ajout des colonnes plombier_id et unite à la table prestations
-- plombier_id NULL = prestation par défaut (visible par tous)
-- plombier_id = uuid = prestation personnalisée du plombier

ALTER TABLE prestations ADD COLUMN IF NOT EXISTS plombier_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE prestations ADD COLUMN IF NOT EXISTS unite text DEFAULT 'unité';

-- Index pour les requêtes filtrées
CREATE INDEX IF NOT EXISTS prestations_plombier_id_idx ON prestations(plombier_id);
