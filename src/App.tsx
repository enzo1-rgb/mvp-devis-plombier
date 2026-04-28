import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";
import { Quote } from "./lib/types";
import Auth from "./components/Auth";
import Dashboard from "./components/Dashboard";
import QuoteForm from "./components/QuoteForm";
import QuotePreview from "./components/QuotePreview";
import InvoicePreview from "./components/InvoicePreview";
import ClientPortal from "./components/ClientPortal";

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState<"dashboard" | "create" | "preview" | "invoice">("dashboard");
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [dashboardInitialTab, setDashboardInitialTab] = useState<"devis" | "factures">("devis");

  const urlParams = new URLSearchParams(window.location.search);
  const clientToken = urlParams.get('token');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  if (clientToken) {
    return <ClientPortal token={clientToken} />;
  }

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

  const handleViewInvoice = (invoice: any) => {
    setSelectedInvoice(invoice);
    setCurrentView("invoice");
  };

  const handleBackToDashboard = () => {
    setDashboardInitialTab("devis");
    setCurrentView("dashboard");
    setSelectedQuote(null);
    setSelectedInvoice(null);
  };

  const handleBackFromInvoice = () => {
    setDashboardInitialTab("factures");
    setCurrentView("dashboard");
    setSelectedInvoice(null);
  };

  const handleQuoteCreated = () => {
    setDashboardInitialTab("devis");
    setCurrentView("dashboard");
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
    </div>
  );

  if (!user) return <Auth />;

  return (
    <>
      {currentView === "dashboard" && (
        <Dashboard
          user={user}
          initialTab={dashboardInitialTab}
          onCreateQuote={handleCreateQuote}
          onViewQuote={handleViewQuote}
          onEditQuote={handleEditQuote}
          onViewInvoice={handleViewInvoice}
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
      {currentView === "invoice" && selectedInvoice && (
        <InvoicePreview invoice={selectedInvoice} onBack={handleBackFromInvoice} />
      )}
    </>
  );
}