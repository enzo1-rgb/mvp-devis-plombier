interface PrivacyPolicyProps {
    onBack: () => void;
  }
  
  export default function PrivacyPolicy({ onBack }: PrivacyPolicyProps) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-slate-900 text-white shadow-lg h-16 flex items-center px-4">
          <div className="max-w-3xl mx-auto w-full flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2 hover:bg-white/10 rounded-lg transition text-sm font-medium"
            >
              ← Retour
            </button>
            <h1 className="text-lg font-bold">Politique de confidentialité</h1>
          </div>
        </header>
  
        <div className="max-w-3xl mx-auto px-4 py-10 space-y-8 text-gray-700">
  
          <div>
            <p className="text-sm text-gray-400">Dernière mise à jour : avril 2026</p>
            <p className="mt-3">
              ProPlomb est un logiciel de gestion de devis et factures destiné aux plombiers indépendants. La présente politique explique quelles données nous collectons, pourquoi, et comment vous pouvez exercer vos droits conformément au Règlement Général sur la Protection des Données (RGPD — Règlement UE 2016/679).
            </p>
          </div>
  
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">1. Responsable du traitement</h2>
            <p>
              Le responsable du traitement est l'exploitant de ProPlomb. Pour toute question relative à vos données personnelles, vous pouvez nous contacter à l'adresse email renseignée lors de votre inscription.
            </p>
          </section>
  
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">2. Données collectées</h2>
            <p className="mb-3">ProPlomb collecte les catégories de données suivantes :</p>
            <div className="space-y-3">
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <p className="font-semibold text-gray-800 mb-1">Données du compte plombier</p>
                <p className="text-sm text-gray-500">Nom, prénom, email, téléphone, adresse professionnelle, SIRET, numéro TVA, forme juridique, IBAN. Ces données sont saisies volontairement par l'utilisateur dans son profil.</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <p className="font-semibold text-gray-800 mb-1">Données des clients finaux</p>
                <p className="text-sm text-gray-500">Nom, adresse, email et téléphone des clients renseignés par le plombier pour la création de devis et factures. Le plombier est lui-même responsable de traitement vis-à-vis de ses propres clients.</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <p className="font-semibold text-gray-800 mb-1">Données d'utilisation</p>
                <p className="text-sm text-gray-500">Devis, factures, prestations créés dans l'application. Ces données sont nécessaires au fonctionnement du service.</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <p className="font-semibold text-gray-800 mb-1">Données de connexion</p>
                <p className="text-sm text-gray-500">Adresse email et mot de passe hashé, gérés par Supabase Auth. Nous ne stockons jamais votre mot de passe en clair.</p>
              </div>
            </div>
          </section>
  
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">3. Finalités et bases légales</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="text-left px-4 py-3 font-semibold text-gray-700 rounded-tl-lg">Finalité</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700 rounded-tr-lg">Base légale</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['Fourniture du service (devis, factures)', 'Exécution du contrat'],
                    ['Authentification et sécurité du compte', 'Exécution du contrat'],
                    ["Envoi d'emails (devis, factures au client)", 'Exécution du contrat'],
                    ['Conservation des données comptables', 'Obligation légale (10 ans)'],
                    ['Amélioration du service', 'Intérêt légitime'],
                  ].map(([finalite, base], i) => (
                    <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-4 py-3 border-t border-gray-100">{finalite}</td>
                      <td className="px-4 py-3 border-t border-gray-100 text-gray-500">{base}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
  
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">4. Durée de conservation</h2>
            <div className="space-y-2 text-sm">
              <div className="flex gap-3 items-start">
                <span className="w-2 h-2 rounded-full bg-purple-500 mt-1.5 flex-shrink-0"></span>
                <p><strong>Données de compte :</strong> conservées pendant toute la durée de l'utilisation du service, puis supprimées dans un délai de 30 jours après la résiliation.</p>
              </div>
              <div className="flex gap-3 items-start">
                <span className="w-2 h-2 rounded-full bg-purple-500 mt-1.5 flex-shrink-0"></span>
                <p><strong>Données comptables (factures) :</strong> conservées 10 ans conformément à l'obligation légale prévue par l'article L123-22 du Code de Commerce.</p>
              </div>
              <div className="flex gap-3 items-start">
                <span className="w-2 h-2 rounded-full bg-purple-500 mt-1.5 flex-shrink-0"></span>
                <p><strong>Données clients finaux :</strong> conservées tant que le plombier utilise le service. Le plombier est responsable de leur suppression en cas de demande de ses propres clients.</p>
              </div>
            </div>
          </section>
  
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">5. Sous-traitants et transferts</h2>
            <p className="mb-3">ProPlomb fait appel aux sous-traitants suivants :</p>
            <div className="space-y-2">
              {[
                ['Supabase', 'Hébergement de la base de données et authentification', 'États-Unis (garanties adéquates — SCCs)'],
                ['Vercel', 'Hébergement du frontend', 'États-Unis (garanties adéquates — SCCs)'],
                ['Railway', "Hébergement du serveur d'envoi d'emails", 'États-Unis (garanties adéquates — SCCs)'],
                ['Resend', "Service d'envoi d'emails transactionnels", 'États-Unis (garanties adéquates — SCCs)'],
              ].map(([nom, role, transfert], i) => (
                <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 text-sm">
                  <p className="font-semibold text-gray-800">{nom}</p>
                  <p className="text-gray-500">{role}</p>
                  <p className="text-gray-400 text-xs mt-1">{transfert}</p>
                </div>
              ))}
            </div>
            <p className="text-sm text-gray-500 mt-3">Aucune donnée n'est vendue ou partagée à des fins commerciales.</p>
          </section>
  
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">6. Vos droits</h2>
            <p className="mb-3">Conformément au RGPD, vous disposez des droits suivants :</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              {[
                ['Droit d\'accès', 'Obtenir une copie de vos données personnelles.'],
                ['Droit de rectification', 'Corriger des données inexactes ou incomplètes.'],
                ['Droit à l\'effacement', 'Demander la suppression de vos données (sous réserve des obligations légales de conservation).'],
                ['Droit à la portabilité', 'Recevoir vos données dans un format structuré et lisible.'],
                ['Droit d\'opposition', 'Vous opposer à certains traitements fondés sur l\'intérêt légitime.'],
                ['Droit de limitation', 'Demander la suspension temporaire d\'un traitement.'],
              ].map(([droit, desc], i) => (
                <div key={i} className="bg-white rounded-xl border border-gray-200 p-4">
                  <p className="font-semibold text-gray-800 mb-1">{droit}</p>
                  <p className="text-gray-500">{desc}</p>
                </div>
              ))}
            </div>
            <p className="text-sm text-gray-500 mt-4">
              Pour exercer vos droits, contactez-nous via l'email de votre compte. Vous pouvez également introduire une réclamation auprès de la <strong>CNIL</strong> (Commission Nationale de l'Informatique et des Libertés) sur <a href="https://www.cnil.fr" className="text-blue-600 underline" target="_blank" rel="noreferrer">www.cnil.fr</a>.
            </p>
          </section>
  
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">7. Cookies</h2>
            <p className="text-sm">
              ProPlomb utilise uniquement des cookies techniques strictement nécessaires au fonctionnement de l'authentification (session Supabase). Aucun cookie publicitaire ou de suivi tiers n'est utilisé. Ces cookies ne nécessitent pas de consentement préalable conformément aux lignes directrices de la CNIL.
            </p>
          </section>
  
          <div className="pt-4 border-t border-gray-200 text-xs text-gray-400 text-center">
            ProPlomb — Politique de confidentialité v1.0 — Avril 2026
          </div>
        </div>
      </div>
    );
  }