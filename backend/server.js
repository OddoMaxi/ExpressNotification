const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const rateLimit = require('express-rate-limit');

dotenv.config({ path: path.join(__dirname, '.env') });

// Valider les variables d'environnement requises au démarrage
const REQUIRED_ENV = ['JWT_SECRET', 'DATABASE_URL', 'IRIS_USERNAME', 'IRIS_PASSWORD', 'SMS_USER', 'SMS_HASH'];
const missing = REQUIRED_ENV.filter(k => !process.env[k]);
if (missing.length > 0) {
  console.error(`❌ Variables d'environnement manquantes: ${missing.join(', ')}`);
  process.exit(1);
}

const { initializeDatabase, pool } = require('./database');
const { startBackgroundService, stopBackgroundService } = require('./services/cronService');
const authRoutes = require('./routes/auth');
const { authenticateApi } = require('./middleware/authMiddleware');
const registrationRoutes = require('./routes/registration');
const statusRoutes = require('./routes/status');
const notificationRoutes = require('./routes/notification');
const supervisorRoutes = require('./routes/supervisor');
const usersRoutes = require('./routes/users');

const app = express();
const PORT = process.env.PORT || 5000;

// Faire confiance au proxy Nginx (nécessaire pour express-rate-limit derrière un reverse proxy)
app.set('trust proxy', 1);

// Middleware
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:3000'];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error('Origine non autorisée par CORS'));
  },
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de requêtes, veuillez réessayer dans une minute.' }
});

const smsLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Limite d\'envoi SMS atteinte, veuillez patienter.' }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de tentatives de connexion, réessayez dans 15 minutes.' }
});

app.use('/api', apiLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/registration/:id/send-sms', smsLimiter);
app.use('/api/registration', (req, res, next) => {
  if (req.method === 'POST' && !req.params.id) return smsLimiter(req, res, next);
  next();
});

// Initialiser la base de données
initializeDatabase();

// Démarrer le service de background
startBackgroundService();

// Routes
app.use('/api/auth', authRoutes);
app.use('/api', authenticateApi);
app.use('/api/registration', registrationRoutes);
app.use('/api/status', statusRoutes);
app.use('/api/notification', notificationRoutes);
app.use('/api/supervisor', supervisorRoutes);
app.use('/api/users', usersRoutes);

// Route de santé
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString()
  });
});

// Gestion des erreurs globale — ne pas exposer les détails internes
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'development' ? err.message : 'Erreur serveur interne',
    status: err.status || 500
  });
});

const server = app.listen(PORT, () => {
  console.log(`✓ Serveur de notification SMS démarré sur le port ${PORT}`);
  console.log(`✓ Environnement: ${process.env.NODE_ENV}`);
});

// Graceful shutdown
function shutdown(signal) {
  console.log(`\n${signal} reçu — arrêt du serveur...`);
  stopBackgroundService();
  server.close(async () => {
    await pool.end();
    console.log('✓ Pool PostgreSQL fermé proprement');
    process.exit(0);
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
