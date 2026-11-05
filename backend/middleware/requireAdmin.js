const User = require('../models/User');

async function requireAdmin(req, res, next) {
    if (!req.user?.id) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    try {
        const user = await User.findById(req.user.id).select('role');
        if (!user) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        if (user.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }
    }
    catch (error) {
        return next(error);
    }
    return next();
}

module.exports = requireAdmin;