import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";
import { Quote } from "./lib/types";
import Auth from "./components/Auth";
import Dashboard from "./components/Dashboard";
import QuoteForm from "./components/QuoteForm";
import QuotePreview from "./components/QuotePreview";

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState<"dashboard" | "create" | "preview">("dashboard");
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
    setCurrentView("create");
  };

  const handleEditQuote = (quote: Quote) => {
    setSelectedQuote(quote);
    setCurrentView("create");
  };

  const handleViewQuote = (quote: Quote) => {
    setSelectedQuote(quote);
    setCurrentView("preview");
  };

  const handleBackToDashboard = () => {
    setCurrentView("dashboard");
    setSelectedQuote(null);
  };

  const handleQuoteCreated = () => {
    setCurrentView("dashboard");
  };

  if (loading) return <div>Chargement...</div>;

  if (!user) return <Auth />;

  return (
    <>
      {currentView === "dashboard" && (
        <Dashboard
          user={user}
          onCreateQuote={handleCreateQuote}
          onViewQuote={handleViewQuote}
          onEditQuote={handleEditQuote}
        />
      )}

      {currentView === "create" && (
        <QuoteForm
          onBack={handleBackToDashboard}
          onSuccess={handleQuoteCreated}
          quoteToEdit={selectedQuote ?? undefined}
        />
      )}

      {currentView === "preview" && selectedQuote && (
        <QuotePreview quote={selectedQuote} onBack={handleBackToDashboard} />
      )}
    </>
  );
}