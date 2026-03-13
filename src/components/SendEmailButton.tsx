import { useState } from "react";

interface SendEmailButtonProps {
  quoteHtml?: string; // le HTML du devis à envoyer
}

export default function SendEmailButton({ quoteHtml }: SendEmailButtonProps) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleSendEmail = async () => {
    if (!quoteHtml) {
      setMessage("Aucun contenu de devis à envoyer !");
      console.log("quoteHtml est vide !"); // ← debug
      return;
    }

    console.log("Contenu du devis envoyé :", quoteHtml); // ← debug

    setLoading(true);
    setMessage("");

    try {
      const res = await fetch(
        "https://mvp-devis-plombier-production.up.railway.app/send-email",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: "enzo.keti1@gmail.com", // ton email pour tester
            subject: "Devis Plombier",
            html: quoteHtml, // le contenu réel du devis
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        setMessage("Erreur : " + (data.error || "Email non envoyé"));
        console.error("Erreur serveur :", data);
      } else {
        setMessage("Email envoyé avec succès !");
        console.log("Réponse serveur :", data);
      }
    } catch (err: any) {
      setMessage("Erreur : " + err.message);
      console.error("Erreur fetch :", err);
    }

    setLoading(false);
  };

  return (
    <div className="mt-4">
      <button
        onClick={handleSendEmail}
        disabled={loading}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        {loading ? "Envoi..." : "Envoyer le devis par email"}
      </button>
      {message && <p className="mt-2 text-sm text-gray-700">{message}</p>}
    </div>
  );
}