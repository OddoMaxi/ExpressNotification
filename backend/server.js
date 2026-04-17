const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// Charger les variables d'environnement
dotenv.config();

// Importer les routes et modules
const { initializeDatabase } = require('./database');
const { startBackgroundService } = require('./services/cronService');
const authRoutes = require('./routes/auth');
const { authenticateApi } = require('./middleware/authMiddleware');
const registrationRoutes = require('./routes/registration');
const statusRoutes = require('./routes/status');
const notificationRoutes = require('./routes/notification');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialiser la base de données
initializeDatabase();

// Démarrer le service de background (vérification toutes les 30 minutes)
startBackgroundService();

// Routes
app.use('/api/auth', authRoutes);
app.use('/api', authenticateApi);
app.use('/api/registration', registrationRoutes);
app.use('/api/status', statusRoutes);
app.use('/api/notification', notificationRoutes);

// Route de santé
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString() 
  });
});

// Gestion des erreurs globale
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Erreur serveur interne',
    status: err.status || 500
  });
});

// Démarrer le serveur
app.listen(PORT, () => {
  console.log(`✓ Serveur de notification SMS démarré sur le port ${PORT}`);
  console.log(`✓ Environnement: ${process.env.NODE_ENV}`);
});
