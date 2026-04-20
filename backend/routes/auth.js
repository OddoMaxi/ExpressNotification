const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getQuery } = require('../database');

const JWT_SECRET = process.env.JWT_SECRET || 'louba-notification-jwt-secret-2025';
const JWT_EXPIRES = '12h';

router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ success: false, error: 'Nom d\'utilisateur et mot de passe requis' });
  }

  try {
    const user = await getQuery(
      'SELECT * FROM users WHERE username = ? AND actif = 1',
      [username]
    );

    if (!user) {
      return res.status(401).json({ success: false, error: 'Identifiants invalides' });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ success: false, error: 'Identifiants invalides' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES }
    );

    return res.json({
      success: true,
      token,
      user: { id: user.id, username: user.username, role: user.role, nom: user.nom, prenom: user.prenom }
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/check', (req, res) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace('Bearer ', '').trim();

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return res.json({ success: true, user: decoded });
  } catch {
    return res.status(401).json({ success: false, error: 'Non autorisé' });
  }
});

module.exports = router;
