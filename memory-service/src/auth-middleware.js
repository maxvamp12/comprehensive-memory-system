const jwt = require('jsonwebtoken');
const { authenticateToken } = require('../src/config/jwt-auth-config');

// Authentication middleware for Memory Service
const authMiddleware = {
    // Protected routes require authentication
    requireAuth: (req, res, next) => {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

        if (!token) {
            return res.status(401).json({ 
                error: 'Access token required',
                message: 'Please provide a valid JWT token in the Authorization header'
            });
        }

        jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-in-production', (err, user) => {
            if (err) {
                return res.status(403).json({ 
                    error: 'Invalid or expired token',
                    message: 'Please provide a valid JWT token'
                });
            }
            req.user = user;
            next();
        });
    },

    // Optional authentication for public routes
    optionalAuth: (req, res, next) => {
        const authHeader = req.headers['authorization'];
        if (authHeader) {
            const token = authHeader.split(' ')[1]; // Bearer TOKEN
            jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-in-production', (err, user) => {
                if (!err) {
                    req.user = user;
                }
                next();
            });
        } else {
            next();
        }
    },

    // Role-based authorization
    requireRole: (role) => {
        return (req, res, next) => {
            if (!req.user) {
                return res.status(401).json({ error: 'Authentication required' });
            }
            
            if (req.user.role !== role) {
                return res.status(403).json({ 
                    error: 'Insufficient permissions',
                    message: `Role '${role}' required for this operation`
                });
            }
            next();
        };
    },

    // Admin role check
    requireAdmin: (req, res, next) => {
        if (!req.user || req.user.role !== 'admin') {
            return res.status(403).json({ 
                error: 'Admin access required',
                message: 'This operation requires administrative privileges'
            });
        }
        next();
    }
};

module.exports = authMiddleware;
