import dotenv from 'dotenv';
dotenv.config(); // loads .env file contents

import rateLimit from 'express-rate-limit';
import express from 'express'; // js runtime
import path from 'path';
import { sendEmail } from './mail'; // email sending function

// create express instance
const app = express();
app.set('trust proxy', 1);
app.use(express.json()); // for json ajax requests
app.use(express.urlencoded({ extended: true })); // for HTML sending
app.use(express.static(path.join(__dirname, '../public')));

// rate limiter
const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit to 5 sends per 15 minutes
  message: 'Too many requests, please try again in 15 minutes.',
  standardHeaders: true, 
  legacyHeaders: false,
});

// assign the view engine to ejs
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../public/views'));

// route for home page
app.get('/', (req, res) => {
  res.render('index');
});

app.get('/contact', (req, res) => {
  res.render('contact');
});

app.get('/resume', (req, res) => {
  res.render('resume');
});

app.get('/resume/download', (req, res) => {
    const filePath = path.join(__dirname, '../public/assets/files/Albert_Jordaan_CV.pdf');
    res.download(filePath, 'Albert_Jordaan_CV.pdf', (err) => {
      if (err) {
          console.error(`Resume download error: ${err}`);
          res.status(500).send(`Error downloading file: ${err}`);
      }
    });
})

// POST 
app.post('/contact', rateLimiter, async (req, res) => {
  const { name, email, subject, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  try {
    await sendEmail(name, email, subject, message);
    res.json({ success: true });
  } 
  catch (err) {
    console.error('Email error:', err);
    res.status(500).json({ error: 'Failed to send email' });
  }
});

// server lsiten
app.listen(process.env.PORT, () => {
  console.log(`Server is running: http://localhost:${process.env.PORT}`);
})
.on('error', (err) => {
  console.error('Server error:', err);
});
