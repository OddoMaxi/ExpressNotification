const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error('JWT_SECRET est requis dans les variables d\'environnement');

const EXEMPT_PATHS = ['/api/auth/login', '/api/auth/check', '/api/health'];

function authenticateApi(req, res, next) {
  if (EXEMPT_PATHS.some(p => req.originalUrl.startsWith(p))) {
    return next();
  }

  const token = req.cookies?.token || req.headers.authorization?.replace('Bearer ', '').trim();

  if (!token) {
    return res.status(401).json({ error: 'Token manquant' });
  }

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Token invalide ou expiré' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Accès refusé — rôle insuffisant' });
    }
    next();
  };
}

module.exports = { authenticateApi, requireRole };
