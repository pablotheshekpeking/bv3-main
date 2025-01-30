import jwt from 'jsonwebtoken';
import { isTokenBlacklisted } from '../services/tokenService.js';

export const authenticateToken = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            return res.status(401).json({ error: 'Authentication token required' });
        }

        if (isTokenBlacklisted(token)) {
            return res.status(401).json({ error: 'Token has been invalidated' });
        }

        const user = jwt.verify(token, process.env.JWT_SECRET);
        req.user = user;
        next();
    } catch (error) {
        return res.status(403).json({ error: 'Invalid or expired token' });
    }
};

export const isAdmin = (req, res, next) => {
    try {
        if (req.user && req.user.role === 'ADMIN') {
            next();
        } else {
            res.status(403).json({ error: 'Admin access required' });
        }
    } catch (error) {
        res.status(403).json({ error: 'Admin access required' });
    }
};

export const isModerator = (req, res, next) => {
    try {
        if (req.user && (req.user.role === 'MODERATOR' || req.user.role === 'ADMIN')) {
            next();
        } else {
            res.status(403).json({ error: 'Moderator access required' });
        }
    } catch (error) {
        res.status(403).json({ error: 'Moderator access required' });
    }
}; 