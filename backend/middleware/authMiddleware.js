function getAuthToken(req) {
  const authHeader = req.headers.authorization || '';
  return authHeader.replace('Bearer ', '').trim();
}

function authenticateApi(req, res, next) {
  const exemptPaths = [
    '/api/auth/login',
    '/api/auth/check',
    '/api/health'
  ];

  if (exemptPaths.includes(req.path) || exemptPaths.some(path => req.originalUrl.startsWith(path))) {
    return next();
  }

  const token = getAuthToken(req);
  const expectedToken = process.env.AUTH_TOKEN || 'notification-secret-token';

  if (!token || token !== expectedToken) {
    return res.status(401).json({ error: 'Accès non autorisé' });
  }

  next();
}

module.exports = {
  authenticateApi
};
