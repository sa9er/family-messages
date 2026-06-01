"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = void 0;
const authMiddleware = (req, res, next) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
        res.status(401).json({ error: 'No token provided' });
        return;
    }
    // For now, accept any token (we'll add JWT verification later)
    // In production: verify JWT, extract memberId, attach to req
    req.memberId = token;
    next();
};
exports.authMiddleware = authMiddleware;
//# sourceMappingURL=auth.js.map