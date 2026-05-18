import { useCallback, useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "./lib/supabase";
import { Quote } from "./lib/types";
import Auth from "./components/Auth";
import Dashboard from "./components/Dashboard";
import QuoteForm from "./components/QuoteForm";
import QuotePreview from "./components/QuotePreview";
import InvoicePreview, { type Invoice } from "./components/InvoicePreview";
import ClientPortal from "./components/ClientPortal";

export default function App() {
  const urlParams = new URLSearchParams(window.location.search);
  const clientToken = urlParams.get("token");

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState<"dashboard" | "create" | "preview" | "invoice">("dashboard");
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [dashboardInitialTab, setDashboardInitialTab] = useState<"devis" | "factures">("devis");
  const [openContactsAfterDocumentBack, setOpenContactsAfterDocumentBack] = useState(false);
  const returnToContactsAfterDocRef = useRef(false);

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

  const clearOpenContactsAfterBack = useCallback(() => {
    setOpenContactsAfterDocumentBack(false);
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

  type ViewFromContactsOpts = { fromContacts?: boolean };

  const handleViewQuote = (quote: Quote, options?: ViewFromContactsOpts) => {
    returnToContactsAfterDocRef.current = !!options?.fromContacts;
    setSelectedQuote(quote);
    setCurrentView("preview");
  };

  const handleViewInvoice = (invoice: Invoice, options?: ViewFromContactsOpts) => {
    returnToContactsAfterDocRef.current = !!options?.fromContacts;
    setSelectedInvoice(invoice);
    setCurrentView("invoice");
  };

  const handleBackToDashboard = () => {
    const resumeContacts = returnToContactsAfterDocRef.current;
    returnToContactsAfterDocRef.current = false;
    setOpenContactsAfterDocumentBack(resumeContacts);
    setDashboardInitialTab("devis");
    setCurrentView("dashboard");
    setSelectedQuote(null);
    setSelectedInvoice(null);
  };

  const handleBackFromInvoice = () => {
    const resumeContacts = returnToContactsAfterDocRef.current;
    returnToContactsAfterDocRef.current = false;
    setOpenContactsAfterDocumentBack(resumeContacts);
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
          openContactsAfterDocumentBack={openContactsAfterDocumentBack}
          onOpenContactsAfterDocumentBackConsumed={clearOpenContactsAfterBack}
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