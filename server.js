import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
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

app.listen(3001, () => {
  console.log('Server running on http://localhost:3001');
});
