import dotenv from 'dotenv';
dotenv.config(); // loads .env file contents

import express from 'express';
import path from 'path';
import { handleContact, type ContactEnv } from './contact/handler';
import { TURNSTILE_TEST_SECRET_KEY, TURNSTILE_TEST_SITE_KEY } from './contact/turnstile';

// Local development only: production is static files + the Cloudflare Worker (src/worker.ts)
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../public/views'));

const locals = { turnstileSiteKey: process.env.TURNSTILE_SITE_KEY || TURNSTILE_TEST_SITE_KEY };

const contactEnv: ContactEnv = {
  RESEND_API_KEY: process.env.RESEND_API_KEY ?? '',
  EMAIL_TO: process.env.EMAIL_TO ?? '',
  EMAIL_FROM: process.env.EMAIL_FROM ?? 'Albert Jordaan <onboarding@resend.dev>',
  TURNSTILE_SECRET_KEY: process.env.TURNSTILE_SECRET_KEY || TURNSTILE_TEST_SECRET_KEY,
};

app.get('/', (req, res) => {
  res.render('index', locals);
});

app.get('/contact', (req, res) => {
  res.render('contact', locals);
});

app.get('/resume', (req, res) => {
  res.render('resume', locals);
});

// same handler the Worker uses, adapted from Express to Request/Response
app.post('/api/contact', async (req, res) => {
  const request = new Request(`http://localhost${req.originalUrl}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'cf-connecting-ip': req.ip ?? '' },
    body: JSON.stringify(req.body ?? {}),
  });
  const response = await handleContact(request, contactEnv);
  res.status(response.status).type('application/json').send(await response.text());
});

app.listen(process.env.PORT, () => {
  console.log(`Server is running: http://localhost:${process.env.PORT}`);
})
.on('error', (err) => {
  console.error('Server error:', err);
});
