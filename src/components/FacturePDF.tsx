import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    padding: 40,
    color: '#1f2937',
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
    paddingBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#475569',
  },
  title: {
    fontSize: 28,
    fontFamily: 'Helvetica-Bold',
    color: '#475569',
    marginBottom: 4,
  },
  ref: {
    fontSize: 9,
    color: '#6b7280',
    marginBottom: 1,
  },
  statusBadge: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  infoBox: {
    backgroundColor: '#f5f3ff',
    borderLeftWidth: 3,
    borderLeftColor: '#475569',
    padding: 10,
    borderRadius: 4,
  },
  infoBoxGray: {
    backgroundColor: '#f9fafb',
    padding: 10,
    borderRadius: 4,
  },
  infoName: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#1f2937',
    marginBottom: 2,
  },
  infoText: {
    fontSize: 9,
    color: '#4b5563',
    marginBottom: 1,
  },
  sectionTitle: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
  },
  table: {
    marginBottom: 16,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#475569',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 4,
    marginBottom: 2,
  },
  tableHeaderText: {
    color: '#ffffff',
    fontFamily: 'Helvetica-Bold',
    fontSize: 9,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  tableRowAlt: {
    backgroundColor: '#f9fafb',
  },
  colDescription: { flex: 3 },
  colRight: { flex: 1, textAlign: 'right' },
  totalsBox: {
    alignSelf: 'flex-end',
    width: 220,
    marginTop: 8,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  totalLabel: { fontSize: 10, color: '#6b7280' },
  totalValue: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#1f2937' },
  totalTTCRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    marginTop: 4,
    borderTopWidth: 2,
    borderTopColor: '#475569',
  },
  totalTTCLabel: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: '#475569' },
  totalTTCValue: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: '#475569' },
  ibanBox: {
    marginTop: 16,
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#86efac',
    borderRadius: 4,
    padding: 10,
  },
  legal: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  legalText: {
    fontSize: 8,
    color: '#9ca3af',
    marginBottom: 2,
  },
});

interface Plombier {
  nom: string;
  prenom: string;
  nom_entreprise?: string;
  adresse?: string;
  siret?: string;
  tva_intracom?: string;
  forme_juridique?: string;
  numero_rcs?: string;
  iban?: string;
  delai_paiement?: number;
  taux_penalite?: string;
}

interface LigneFacture {
  description: string;
  quantite: number;
  prix_unitaire: number;
  montant_ht: number;
}

interface FacturePDFProps {
  numeroFacture: string;
  dateEmission: string;
  dateEcheance: string;
  statut: 'payée' | 'non_payée';
  clientNom: string;
  clientAdresse?: string;
  plombier: Plombier | null;
  lignes: LigneFacture[];
  montantHT: number;
  tva: number;
  tvaPct: string;
  montantTTC: number;
}

export default function FacturePDF({
  numeroFacture,
  dateEmission,
  dateEcheance,
  statut,
  clientNom,
  clientAdresse,
  plombier,
  lignes,
  montantHT,
  tva,
  tvaPct,
  montantTTC,
}: FacturePDFProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>

        {/* En-tête */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>FACTURE</Text>
            <Text style={styles.ref}>{numeroFacture}</Text>
            <Text style={styles.ref}>Émise le {dateEmission}</Text>
            <Text style={styles.ref}>Échéance : {dateEcheance}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <View style={[
              styles.statusBadge,
              { backgroundColor: statut === 'payée' ? '#f0fdf4' : '#fffbeb',
                color: statut === 'payée' ? '#16a34a' : '#d97706' }
            ]}>
              <Text style={{
                fontSize: 9,
                fontFamily: 'Helvetica-Bold',
                color: statut === 'payée' ? '#16a34a' : '#d97706',
              }}>
                {statut === 'payée' ? 'Payée' : 'En attente'}
              </Text>
            </View>
          </View>
        </View>

        {/* Émetteur + Client */}
        <View style={{ flexDirection: 'row', gap: 16, marginBottom: 20 }}>
          {plombier && (
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>Émetteur</Text>
              <View style={styles.infoBox}>
                {plombier.nom_entreprise && (
                  <Text style={styles.infoName}>{plombier.nom_entreprise}</Text>
                )}
                {plombier.forme_juridique && (
                  <Text style={styles.infoText}>{plombier.forme_juridique}</Text>
                )}
                <Text style={[styles.infoText, { fontFamily: 'Helvetica-Bold' }]}>
                  {plombier.prenom} {plombier.nom}
                </Text>
                {plombier.adresse && <Text style={styles.infoText}>{plombier.adresse}</Text>}
                {plombier.siret && <Text style={styles.infoText}>SIRET : {plombier.siret}</Text>}
                {plombier.tva_intracom && <Text style={styles.infoText}>TVA : {plombier.tva_intracom}</Text>}
                {plombier.numero_rcs && <Text style={styles.infoText}>{plombier.numero_rcs}</Text>}
              </View>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionTitle}>Client</Text>
            <View style={styles.infoBoxGray}>
              <Text style={styles.infoName}>{clientNom}</Text>
              {clientAdresse && <Text style={styles.infoText}>{clientAdresse}</Text>}
            </View>
          </View>
        </View>

        {/* Prestations */}
        <Text style={styles.sectionTitle}>Prestations</Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, styles.colDescription]}>Prestation</Text>
            <Text style={[styles.tableHeaderText, styles.colRight]}>P.U. HT</Text>
            <Text style={[styles.tableHeaderText, styles.colRight]}>Qté</Text>
            <Text style={[styles.tableHeaderText, styles.colRight]}>Total HT</Text>
          </View>
          {lignes.map((l, i) => (
            <View key={i} style={[styles.tableRow, i % 2 !== 0 ? styles.tableRowAlt : {}]}>
              <Text style={[{ fontSize: 9, color: '#1f2937' }, styles.colDescription]}>{l.description}</Text>
              <Text style={[{ fontSize: 9, color: '#6b7280' }, styles.colRight]}>{l.prix_unitaire.toFixed(2)} €</Text>
              <Text style={[{ fontSize: 9, color: '#6b7280' }, styles.colRight]}>{l.quantite}</Text>
              <Text style={[{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#1f2937' }, styles.colRight]}>
                {l.montant_ht.toFixed(2)} €
              </Text>
            </View>
          ))}
        </View>

        {/* Totaux */}
        <View style={styles.totalsBox}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total HT</Text>
            <Text style={styles.totalValue}>{montantHT.toFixed(2)} €</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>TVA ({tvaPct}%)</Text>
            <Text style={styles.totalValue}>{tva.toFixed(2)} €</Text>
          </View>
          <View style={styles.totalTTCRow}>
            <Text style={styles.totalTTCLabel}>Total TTC</Text>
            <Text style={styles.totalTTCValue}>{montantTTC.toFixed(2)} €</Text>
          </View>
        </View>

        {/* IBAN */}
        {plombier?.iban && (
          <View style={styles.ibanBox}>
            <Text style={[styles.sectionTitle, { marginBottom: 3 }]}>Règlement par virement</Text>
            <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#1f2937' }}>
              {plombier.iban}
            </Text>
          </View>
        )}

        {/* Mentions légales */}
        <View style={styles.legal}>
          <Text style={styles.legalText}>
            Paiement sous {plombier?.delai_paiement ?? 30} jours — Échéance le {dateEcheance}.
          </Text>
          <Text style={styles.legalText}>
            En cas de retard, pénalités au taux de {plombier?.taux_penalite ?? '3 fois le taux légal'} + indemnité forfaitaire de recouvrement de 40 € (art. L441-10 Code de Commerce).
          </Text>
          <Text style={styles.legalText}>Pas d'escompte pour règlement anticipé.</Text>
        </View>

      </Page>
    </Document>
  );
}