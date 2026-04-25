const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getQuery } = require('../database');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error('JWT_SECRET est requis dans les variables d\'environnement');
const JWT_EXPIRES = '12h';
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 12 * 60 * 60 * 1000
};

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

    res.cookie('token', token, COOKIE_OPTIONS);
    return res.json({
      success: true,
      user: { id: user.id, username: user.username, role: user.role, nom: user.nom, prenom: user.prenom }
    });
  } catch (err) {
    console.error('Erreur login:', err.message);
    return res.status(500).json({ success: false, error: 'Erreur interne du serveur' });
  }
});

router.get('/check', (req, res) => {
  const token = req.cookies?.token;
  if (!token) return res.status(401).json({ success: false, error: 'Non autorisé' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return res.json({ success: true, user: decoded });
  } catch {
    return res.status(401).json({ success: false, error: 'Non autorisé' });
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie('token', { httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production' });
  res.json({ success: true });
});

module.exports = router;
