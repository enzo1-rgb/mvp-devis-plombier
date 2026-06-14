-- Policies RLS pour la table factures
-- Créées manuellement en prod le 14/06/2026, documentées ici pour référence

ALTER TABLE factures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Gestion factures personnelles"
  ON factures FOR ALL
  TO authenticated
  USING (auth.uid() = plombier_id);

CREATE POLICY "factures_delete_own"
  ON factures FOR DELETE
  TO authenticated
  USING (plombier_id = auth.uid());

CREATE POLICY "factures_insert_own"
  ON factures FOR INSERT
  TO authenticated
  WITH CHECK (plombier_id = auth.uid());

CREATE POLICY "factures_select_own"
  ON factures FOR SELECT
  TO authenticated
  USING (plombier_id = auth.uid());

CREATE POLICY "factures_update_own"
  ON factures FOR UPDATE
  TO authenticated
  USING (plombier_id = auth.uid());