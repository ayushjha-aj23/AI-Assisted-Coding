const jwt = require('jsonwebtoken');

function createToken(userId, secret) {
  return jwt.sign({}, secret, {
    algorithm: 'HS256',
    subject: userId,
    expiresIn: '1h'
  });
}

function createAuthMiddleware(db, secret) {
  return function requireAuth(req, res, next) {
    const authorization = req.get('authorization');
    const match = authorization && authorization.match(/^Bearer\s+(\S+)$/i);

    if (!match) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    try {
      const payload = jwt.verify(match[1], secret, { algorithms: ['HS256'] });
      if (typeof payload !== 'object' || typeof payload.sub !== 'string') {
        return res.status(401).json({ error: 'Invalid or expired token' });
      }

      const user = db.prepare(`
        SELECT id, name, email, created_at AS createdAt, updated_at AS updatedAt
        FROM users
        WHERE id = ?
      `).get(payload.sub);

      if (!user) {
        return res.status(401).json({ error: 'Invalid or expired token' });
      }

      req.user = user;
      next();
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError || error instanceof jwt.TokenExpiredError) {
        return res.status(401).json({ error: 'Invalid or expired token' });
      }

      next(error);
    }
  };
}

module.exports = { createAuthMiddleware, createToken };
