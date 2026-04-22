import { useState } from "react";

interface SendEmailButtonProps {
  quoteHtml?: string;
}

export default function SendEmailButton({ quoteHtml }: SendEmailButtonProps) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  const handleSendEmail = async () => {
    if (!quoteHtml) {
      setIsError(true);
      setMessage("Aucun contenu de devis à envoyer !");
      return;
    }

    setLoading(true);
    setMessage("");
    setIsError(false);

    try {
      const res = await fetch(
        "https://mvp-devis-plombier-production.up.railway.app/send-email",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: "enzo.keti1@gmail.com",
            subject: "Devis Plombier",
            html: quoteHtml,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        setIsError(true);
        setMessage("L'envoi d'e-mail est temporairement indisponible. Veuillez réessayer plus tard.");
        console.error("Erreur serveur :", data);
      } else {
        setIsError(false);
        setMessage("Email envoyé avec succès !");
        console.log("Réponse serveur :", data);
      }
    } catch (err: any) {
      setIsError(true);
      setMessage("Impossible de contacter le serveur. Vérifiez votre connexion.");
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
      {message && (
        <p className={`mt-2 text-sm ${isError ? "text-red-600" : "text-green-600"}`}>
          {message}
        </p>
      )}
    </div>
  );
}