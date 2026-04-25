const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { runQuery, getQuery, allQuery } = require('../database');
const { requireRole } = require('../middleware/authMiddleware');

// Tous les endpoints nécessitent le rôle admin
router.use(requireRole('admin'));

// Liste tous les utilisateurs
router.get('/', async (req, res) => {
  try {
    const users = await allQuery(
      'SELECT id, username, role, nom, prenom, email, actif, date_creation, date_mise_a_jour FROM users ORDER BY date_creation DESC'
    );
    res.json({ success: true, users });
  } catch (err) {
    console.error('Erreur liste users:', err.message);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// Créer un utilisateur
router.post('/', async (req, res) => {
  const { username, password, role, nom, prenom, email } = req.body;

  if (!username || !password || !role) {
    return res.status(400).json({ error: 'username, password et role sont requis' });
  }
  if (!['admin', 'superviseur', 'agent'].includes(role)) {
    return res.status(400).json({ error: 'Rôle invalide' });
  }

  try {
    const existing = await getQuery('SELECT id FROM users WHERE username = ?', [username]);
    if (existing) {
      return res.status(400).json({ error: 'Ce nom d\'utilisateur existe déjà' });
    }

    const hash = await bcrypt.hash(password, 10);
    const result = await runQuery(
      'INSERT INTO users (username, password, role, nom, prenom, email) VALUES (?, ?, ?, ?, ?, ?)',
      [username, hash, role, nom || '', prenom || '', email || '']
    );

    res.status(201).json({ success: true, id: result.lastID });
  } catch (err) {
    console.error('Erreur création user:', err.message);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// Modifier un utilisateur
router.put('/:id', async (req, res) => {
  const { role, nom, prenom, email, actif, password } = req.body;

  if (role && !['admin', 'superviseur', 'agent'].includes(role)) {
    return res.status(400).json({ error: 'Rôle invalide' });
  }

  try {
    const user = await getQuery('SELECT id FROM users WHERE id = ?', [req.params.id]);
    if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' });

    if (password) {
      const hash = await bcrypt.hash(password, 10);
      await runQuery(
        'UPDATE users SET password = ?, date_mise_a_jour = CURRENT_TIMESTAMP WHERE id = ?',
        [hash, req.params.id]
      );
    }

    await runQuery(
      `UPDATE users SET role = COALESCE(?, role), nom = COALESCE(?, nom), prenom = COALESCE(?, prenom),
       email = COALESCE(?, email), actif = COALESCE(?, actif), date_mise_a_jour = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [role || null, nom || null, prenom || null, email || null, actif ?? null, req.params.id]
    );

    res.json({ success: true });
  } catch (err) {
    console.error('Erreur modification user:', err.message);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// Supprimer un utilisateur
router.delete('/:id', async (req, res) => {
  try {
    if (String(req.params.id) === String(req.user.id)) {
      return res.status(400).json({ error: 'Impossible de supprimer votre propre compte' });
    }
    const result = await runQuery('DELETE FROM users WHERE id = ?', [req.params.id]);
    if (result.changes === 0) return res.status(404).json({ error: 'Utilisateur non trouvé' });
    res.json({ success: true });
  } catch (err) {
    console.error('Erreur suppression user:', err.message);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

module.exports = router;
