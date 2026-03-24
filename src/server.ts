import dotenv from 'dotenv';
dotenv.config(); // loads .env file contents

import express from 'express'; // js runtime
import path from 'path';

// create express instance
const app = express();

// assign the folder to serve static files
app.use(express.static(path.join(__dirname, '../public')));

// assign the view engine to ejs
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../public/views'));

// route for home page
app.get('/', (req, res) => {
  res.render('index');
});

// routes for the other pages
app.get('/resume', (req, res) => {
  res.render('resume');
});

app.get('/projects', (req, res) => {
  res.render('projects');
});

app.get('/contact', (req, res) => {
  res.render('contact');
});

app
  .listen(process.env.PORT, () => {
    console.log(`Server is running: http://localhost:${process.env.PORT}`);
  })
  .on('error', (err) => {
    console.error('Server error:', err);
  });
