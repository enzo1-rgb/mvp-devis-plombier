import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import { Quote } from './lib/types';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import QuoteForm from './components/QuoteForm';
import QuotePreview from './components/QuotePreview';
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
        <Dashboard onCreateQuote={handleCreateQuote} onViewQuote={handleViewQuote} />
      )}
      {currentView === 'create' && (
        <QuoteForm onBack={handleBackToDashboard} onSuccess={handleQuoteCreated} />
      )}
      {currentView === 'preview' && selectedQuote && (
        <QuotePreview quote={selectedQuote} onBack={handleBackToDashboard} />
      )}
    </>
  );
}

export default App;
