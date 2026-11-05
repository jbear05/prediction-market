const jwt = require('jsonwebtoken');

function requireAuth(req, res, next) {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        return res.status(500).json({ error: 'Authentication is not configured' });
    }

    const [scheme, token] = (req.get('authorization') || '').split(' ');
    if (scheme?.toLowerCase() !== 'bearer' || !token) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    try {
        const payload = jwt.verify(token, secret, { algorithms: ['HS256'] });
        if (
            typeof payload !== 'object' || payload === null || 
            Array.isArray(payload) || typeof payload.sub !== 'string'
        ) {
            return res.status(401).json({ error: 'Invalid token' });
        }
        req.user = { id: payload.sub };
        next();
    }
    catch {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
}

module.exports = requireAuth;