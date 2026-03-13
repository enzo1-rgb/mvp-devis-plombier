import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import { Quote } from './lib/types';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import QuoteForm from './components/QuoteForm';
import QuotePreview from './components/QuotePreview';
import SendEmailButton from './components/SendEmailButton';
import type { User } from '@supabase/supabase-js';

type View = 'dashboard' | 'create' | 'preview';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleCreateQuote = () => {
    setSelectedQuote(null);
    setCurrentView('create');
  };

  const handleEditQuote = (quote: Quote) => {
    setSelectedQuote(quote);
    setCurrentView('create');
  };

  const handleViewQuote = (quote: Quote) => {
    setSelectedQuote(quote);
    setCurrentView('preview');
  };

  const handleBackToDashboard = () => {
    setCurrentView('dashboard');
    setSelectedQuote(null);
  };

  const handleQuoteCreated = () => {
    setCurrentView('dashboard');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  return (
    <>
      {currentView === 'dashboard' && (
        <Dashboard
          user={user}
          onCreateQuote={handleCreateQuote}
          onViewQuote={handleViewQuote}
          onEditQuote={handleEditQuote}
        />
      )}

      {currentView === 'create' && (
        <QuoteForm
          onBack={handleBackToDashboard}
          onSuccess={handleQuoteCreated}
          quoteToEdit={selectedQuote ?? undefined}
        />
      )}

      {currentView === 'preview' && selectedQuote && (
        <QuotePreview quote={selectedQuote} onBack={handleBackToDashboard} />
      )}

      {/* Bouton envoi email avec devis complet et stylé */}
      <SendEmailButton
        quoteHtml={
          selectedQuote
            ? `
              <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.5;">
                <h2 style="color: #1D4ED8;">Devis pour ${selectedQuote.clientName}</h2>
                <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
                  <thead>
                    <tr>
                      <th style="border-bottom: 1px solid #ccc; text-align: left; padding: 4px;">Prestation</th>
                      <th style="border-bottom: 1px solid #ccc; text-align: center; padding: 4px;">Quantité</th>
                      <th style="border-bottom: 1px solid #ccc; text-align: right; padding: 4px;">Prix Unitaire</th>
                      <th style="border-bottom: 1px solid #ccc; text-align: right; padding: 4px;">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${selectedQuote.prestations
                      .map(
                        (p) => `
                        <tr>
                          <td style="padding: 4px;">${p.name}</td>
                          <td style="padding: 4px; text-align: center;">${p.quantity}</td>
                          <td style="padding: 4px; text-align: right;">${p.unitPrice}€</td>
                          <td style="padding: 4px; text-align: right;">${p.quantity * p.unitPrice}€</td>
                        </tr>
                      `
                      )
                      .join("")}
                  </tbody>
                </table>
                <p style="margin-top: 10px; font-weight: bold; text-align: right;">Total : ${selectedQuote.total}€</p>
              </div>
            `
            : undefined
        }
      />
    </>
  );
}

export default App;