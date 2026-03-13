/*
  Politiques RLS (Row Level Security) pour protéger les données
  Chaque utilisateur n'accède qu'à ses propres données (basé sur auth.uid())
*/

-- =============================================
-- Table plombiers
-- Un plombier = un utilisateur (plombiers.id = auth.uid())
-- =============================================
ALTER TABLE plombiers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "plombiers_select_own" ON plombiers;
CREATE POLICY "plombiers_select_own"
  ON plombiers FOR SELECT
  TO authenticated
  USING (id = auth.uid());

DROP POLICY IF EXISTS "plombiers_insert_own" ON plombiers;
CREATE POLICY "plombiers_insert_own"
  ON plombiers FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "plombiers_update_own" ON plombiers;
CREATE POLICY "plombiers_update_own"
  ON plombiers FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "plombiers_delete_own" ON plombiers;
CREATE POLICY "plombiers_delete_own"
  ON plombiers FOR DELETE
  TO authenticated
  USING (id = auth.uid());

-- =============================================
-- Table clients
-- Les clients appartiennent au plombier (plombier_id)
-- =============================================
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "clients_select_own" ON clients;
CREATE POLICY "clients_select_own"
  ON clients FOR SELECT
  TO authenticated
  USING (plombier_id = auth.uid());

DROP POLICY IF EXISTS "clients_insert_own" ON clients;
CREATE POLICY "clients_insert_own"
  ON clients FOR INSERT
  TO authenticated
  WITH CHECK (plombier_id = auth.uid());

DROP POLICY IF EXISTS "clients_update_own" ON clients;
CREATE POLICY "clients_update_own"
  ON clients FOR UPDATE
  TO authenticated
  USING (plombier_id = auth.uid())
  WITH CHECK (plombier_id = auth.uid());

DROP POLICY IF EXISTS "clients_delete_own" ON clients;
CREATE POLICY "clients_delete_own"
  ON clients FOR DELETE
  TO authenticated
  USING (plombier_id = auth.uid());

-- =============================================
-- Table devis
-- Les devis appartiennent au plombier
-- =============================================
ALTER TABLE devis ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "devis_select_own" ON devis;
CREATE POLICY "devis_select_own"
  ON devis FOR SELECT
  TO authenticated
  USING (plombier_id = auth.uid());

DROP POLICY IF EXISTS "devis_insert_own" ON devis;
CREATE POLICY "devis_insert_own"
  ON devis FOR INSERT
  TO authenticated
  WITH CHECK (plombier_id = auth.uid());

DROP POLICY IF EXISTS "devis_update_own" ON devis;
CREATE POLICY "devis_update_own"
  ON devis FOR UPDATE
  TO authenticated
  USING (plombier_id = auth.uid())
  WITH CHECK (plombier_id = auth.uid());

DROP POLICY IF EXISTS "devis_delete_own" ON devis;
CREATE POLICY "devis_delete_own"
  ON devis FOR DELETE
  TO authenticated
  USING (plombier_id = auth.uid());

-- =============================================
-- Table lignes_devis
-- Accès via le devis parent (devis.plombier_id)
-- =============================================
ALTER TABLE lignes_devis ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lignes_devis_select_own" ON lignes_devis;
CREATE POLICY "lignes_devis_select_own"
  ON lignes_devis FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM devis
      WHERE devis.id = lignes_devis.devis_id
      AND devis.plombier_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "lignes_devis_insert_own" ON lignes_devis;
CREATE POLICY "lignes_devis_insert_own"
  ON lignes_devis FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM devis
      WHERE devis.id = lignes_devis.devis_id
      AND devis.plombier_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "lignes_devis_update_own" ON lignes_devis;
CREATE POLICY "lignes_devis_update_own"
  ON lignes_devis FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM devis
      WHERE devis.id = lignes_devis.devis_id
      AND devis.plombier_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM devis
      WHERE devis.id = lignes_devis.devis_id
      AND devis.plombier_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "lignes_devis_delete_own" ON lignes_devis;
CREATE POLICY "lignes_devis_delete_own"
  ON lignes_devis FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM devis
      WHERE devis.id = lignes_devis.devis_id
      AND devis.plombier_id = auth.uid()
    )
  );

-- =============================================
-- Table prestations
-- Lecture : ses prestations OU prestations par défaut (plombier_id IS NULL)
-- Écriture : uniquement ses propres prestations
-- =============================================
ALTER TABLE prestations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "prestations_select_own_and_default" ON prestations;
CREATE POLICY "prestations_select_own_and_default"
  ON prestations FOR SELECT
  TO authenticated
  USING (plombier_id = auth.uid() OR plombier_id IS NULL);

DROP POLICY IF EXISTS "prestations_insert_own" ON prestations;
CREATE POLICY "prestations_insert_own"
  ON prestations FOR INSERT
  TO authenticated
  WITH CHECK (plombier_id = auth.uid());

DROP POLICY IF EXISTS "prestations_update_own" ON prestations;
CREATE POLICY "prestations_update_own"
  ON prestations FOR UPDATE
  TO authenticated
  USING (plombier_id = auth.uid())
  WITH CHECK (plombier_id = auth.uid());

DROP POLICY IF EXISTS "prestations_delete_own" ON prestations;
CREATE POLICY "prestations_delete_own"
  ON prestations FOR DELETE
  TO authenticated
  USING (plombier_id = auth.uid());
