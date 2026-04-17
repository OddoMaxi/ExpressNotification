const express = require('express');
const router = express.Router();

const AUTH_USERNAME = process.env.AUTH_USERNAME || 'admin';
const AUTH_PASSWORD = process.env.AUTH_PASSWORD || 'Admin123!';
const AUTH_TOKEN = process.env.AUTH_TOKEN || 'notification-secret-token';

router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ success: false, error: 'Nom d’utilisateur et mot de passe requis' });
  }

  if (username === AUTH_USERNAME && password === AUTH_PASSWORD) {
    return res.json({
      success: true,
      token: AUTH_TOKEN,
      user: { username }
    });
  }

  return res.status(401).json({ success: false, error: 'Identifiants invalides' });
});

router.get('/check', (req, res) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace('Bearer ', '').trim();

  if (token === AUTH_TOKEN) {
    return res.json({ success: true });
  }

  return res.status(401).json({ success: false, error: 'Non autorisé' });
});

module.exports = router;
