const path = require('path');
require('dotenv').config();
const express = require('express');

// Routers
const sum2Router = require('./routes/sum2');
const mainRouter = require('./routes/maincontroller');

const app = express();
const PORT = 3000;

// View engine setup (set this first)
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'html');
app.engine('html', require('ejs').renderFile);

// Middleware order
app.use(express.static(path.join(__dirname, 'public'))); // Serve static files first
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Router connections
app.use('/sum2', sum2Router); // Main API router
app.use('/', mainRouter);     // Root router for rendering views

// Global error handling middleware (in English)
app.use((err, req, res, next) => {
  console.error('Global error:', err.stack);
  res.status(500).send('Internal Server Error');
});

app.listen(3000, () => {
  console.log(`Server started at http://13.54.187.196:3000`);
});