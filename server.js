import express from 'express';
import cors from 'cors';

const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173',
  'https://mvp-devis-plombier.vercel.app',
];

const app = express();
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
  })
);
app.use(express.json());

app.post('/send-email', async (req, res) => {
  try {
    const { to, subject, html } = req.body;

    if (!to || !subject || !html) {
      return res.status(400).json({
        error: 'Missing required fields: to, subject, html',
      });
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        error: 'RESEND_API_KEY not configured',
      });
    }

    const fromEmail = process.env.RESEND_FROM_EMAIL || 'Devis <onboarding@resend.dev>';

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [to],
        subject,
        html,
      }),
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

// 🚀 Correction ici pour Railway
const PORT = process.env.PORT || 3001;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});