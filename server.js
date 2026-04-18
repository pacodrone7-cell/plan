// ============================================================
//  backend/server.js — Serveur Express principal
//
//  Lancer : npm run dev   (nodemon, rechargement auto)
//           npm start     (production)
// ============================================================

require('dotenv').config();                 // charge le .env
const express  = require('express');
const mongoose = require('mongoose');
const cors     = require('cors');

const tachesRouter = require('./routes/taches');

const app  = express();
const PORT = process.env.PORT || 5000;

// ============================================================
//  MIDDLEWARES
// ============================================================

// CORS — autorise le frontend (Live Server 5500 ou Vercel)
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:5500',
    'http://127.0.0.1:5500',
    'http://localhost:3000',
    'http://localhost:5173',
    // Ajoute ici ton domaine Vercel : 'https://ton-projet.vercel.app'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
}));

// Parser JSON (corps des requêtes POST / PUT)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ============================================================
//  ROUTES
// ============================================================

// Route de santé — vérifie que le serveur tourne
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'TaskMaster API est en ligne 🚀',
    mongodb: mongoose.connection.readyState === 1 ? 'Connecté ✅' : 'Déconnecté ❌',
    timestamp: new Date().toISOString(),
  });
});

// Routes des tâches
app.use('/api/taches', tachesRouter);

// 404 — route inconnue
app.use((req, res) => {
  res.status(404).json({ erreur: `Route "${req.method} ${req.path}" introuvable.` });
});

// Gestionnaire d'erreurs global
app.use((err, req, res, next) => {
  console.error('Erreur non gérée :', err.message);
  res.status(500).json({ erreur: 'Erreur interne du serveur.', details: err.message });
});

// ============================================================
//  CONNEXION MONGODB → DÉMARRAGE DU SERVEUR
// ============================================================

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI manquant dans le fichier .env');
  console.error('   Copie l\'URI depuis MongoDB Atlas et colle-la dans backend/.env');
  process.exit(1);
}

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log('✅ MongoDB connecté avec succès');
    app.listen(PORT, () => {
      console.log('');
      console.log('🚀 Serveur TaskMaster démarré !');
      console.log(`   → API locale : http://localhost:${PORT}/api/taches`);
      console.log(`   → Santé      : http://localhost:${PORT}/api/health`);
      console.log('');
    });
  })
  .catch((err) => {
    console.error('❌ Connexion MongoDB échouée :', err.message);
    console.error('   Vérifie l\'URI dans backend/.env et les accès réseau MongoDB Atlas');
    process.exit(1);
  });
