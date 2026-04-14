import express from 'express';
import cors from 'cors';

const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

// Fallback pour le dev local si ALLOWED_ORIGINS n'est pas défini
const devOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173',
];

const allAllowedOrigins = allowedOrigins.length > 0
  ? allowedOrigins
  : devOrigins;

const app = express();

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allAllowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
  })
);

app.use(express.json({ limit: '100kb' }));

// ── Rate limiting simple sans dépendance externe ──────────────────────────────
const rateMap = new Map();
const RATE_LIMIT = 10;       // max requêtes
const RATE_WINDOW = 60_000;  // par minute (ms)

function rateLimiter(req, res, next) {
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const entry = rateMap.get(ip) || { count: 0, start: now };

  if (now - entry.start > RATE_WINDOW) {
    entry.count = 1;
    entry.start = now;
  } else {
    entry.count += 1;
  }

  rateMap.set(ip, entry);

  if (entry.count > RATE_LIMIT) {
    return res.status(429).json({
      error: 'Trop de requêtes. Veuillez patienter une minute.',
    });
  }

  next();
}

// Nettoyage mémoire toutes les 5 minutes pour éviter les fuites
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateMap.entries()) {
    if (now - entry.start > RATE_WINDOW) rateMap.delete(ip);
  }
}, 5 * 60_000);

// ── Route d'envoi d'email ─────────────────────────────────────────────────────
app.post('/send-email', rateLimiter, async (req, res) => {
  try {
    const { to, subject, html } = req.body;

    if (!to || !subject || !html) {
      return res.status(400).json({
        error: 'Missing required fields: to, subject, html',
      });
    }

    // Validation basique de l'email
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      return res.status(400).json({ error: 'Adresse email invalide.' });
    }

    // Limite de taille du HTML
    if (html.length > 50_000) {
      return res.status(400).json({ error: 'Contenu trop volumineux.' });
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'RESEND_API_KEY not configured' });
    }

    const fromEmail = process.env.RESEND_FROM_EMAIL || 'Devis <onboarding@resend.dev>';

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: fromEmail, to: [to], subject, html }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data.message || `Resend API error: ${response.status}`,
      });
    }

    res.json(data);
  } catch (error) {
    console.error('send-email error:', error);
    res.status(500).json({
      error: error.message || 'Internal server error',
    });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});