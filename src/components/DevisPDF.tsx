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
    borderBottomColor: '#2563eb',
  },
  title: {
    fontSize: 28,
    fontFamily: 'Helvetica-Bold',
    color: '#2563eb',
    marginBottom: 4,
  },
  ref: {
    fontSize: 9,
    color: '#6b7280',
  },
  statusBadge: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#ffffff',
    backgroundColor: '#2563eb',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  section: {
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
  },
  infoBox: {
    backgroundColor: '#eff6ff',
    borderLeftWidth: 3,
    borderLeftColor: '#2563eb',
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
  table: {
    marginBottom: 16,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#2563eb',
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
  totalLabel: {
    fontSize: 10,
    color: '#6b7280',
  },
  totalValue: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#1f2937',
  },
  totalTTCRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    marginTop: 4,
    borderTopWidth: 2,
    borderTopColor: '#2563eb',
  },
  totalTTCLabel: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    color: '#2563eb',
  },
  totalTTCValue: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    color: '#2563eb',
  },
  notes: {
    backgroundColor: '#fffbeb',
    borderLeftWidth: 3,
    borderLeftColor: '#facc15',
    padding: 10,
    borderRadius: 4,
    marginBottom: 16,
  },
  notesText: {
    fontSize: 9,
    color: '#78350f',
  },
  legal: {
    marginTop: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  legalText: {
    fontSize: 8,
    color: '#9ca3af',
    textAlign: 'center',
    marginBottom: 2,
  },
  signeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#86efac',
    borderRadius: 6,
    padding: 8,
    marginBottom: 16,
  },
  signeText: {
    fontSize: 9,
    color: '#16a34a',
    fontFamily: 'Helvetica-Bold',
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
}

interface LigneDevis {
  description: string;
  quantite: number;
  prix_unitaire: number;
  montant_ht: number;
}

interface DevisPDFProps {
  numero: string;
  dateEmission: string;
  dateValidite?: string;
  clientNom: string;
  clientAdresse?: string;
  plombier: Plombier | null;
  lignes: LigneDevis[];
  totalHT: number;
  tva: number;
  tvaPct: string;
  totalTTC: number;
  notes?: string;
  signe_par_client?: boolean;
  date_signature?: string;
}

export default function DevisPDF({
  numero,
  dateEmission,
  dateValidite,
  clientNom,
  clientAdresse,
  plombier,
  lignes,
  totalHT,
  tva,
  tvaPct,
  totalTTC,
  notes,
  signe_par_client,
  date_signature,
}: DevisPDFProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>

        {/* En-tête */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>DEVIS</Text>
            <Text style={styles.ref}>Réf. {numero}</Text>
            <Text style={styles.ref}>Émis le {dateEmission}</Text>
            {dateValidite && (
              <Text style={styles.ref}>Valable jusqu'au {dateValidite}</Text>
            )}
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            {signe_par_client && (
              <View style={{ backgroundColor: '#f0fdf4', borderRadius: 4, padding: 8, borderWidth: 1, borderColor: '#86efac' }}>
                <Text style={{ fontSize: 9, color: '#16a34a', fontFamily: 'Helvetica-Bold' }}>
                  Signe electroniquement
                </Text>
                {date_signature && (
                  <Text style={{ fontSize: 8, color: '#16a34a' }}>
                    le {new Date(date_signature).toLocaleDateString('fr-FR')}
                  </Text>
                )}
              </View>
            )}
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
        <Text style={styles.sectionTitle}>Détail des prestations</Text>
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
            <Text style={styles.totalValue}>{totalHT.toFixed(2)} €</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>TVA ({tvaPct}%)</Text>
            <Text style={styles.totalValue}>{tva.toFixed(2)} €</Text>
          </View>
          <View style={styles.totalTTCRow}>
            <Text style={styles.totalTTCLabel}>Total TTC</Text>
            <Text style={styles.totalTTCValue}>{totalTTC.toFixed(2)} €</Text>
          </View>
        </View>

        {/* Notes */}
        {notes && (
          <View style={[styles.notes, { marginTop: 16 }]}>
            <Text style={[styles.sectionTitle, { marginBottom: 4 }]}>Notes</Text>
            <Text style={styles.notesText}>{notes}</Text>
          </View>
        )}

        {/* Mentions légales */}
        <View style={styles.legal}>
          <Text style={styles.legalText}>Devis valable 30 jours à compter de la date d'émission</Text>
          <Text style={styles.legalText}>
            TVA au taux de {tvaPct}% — Article 279-0 bis du CGI pour les travaux de rénovation
          </Text>
        </View>

      </Page>
    </Document>
  );
}