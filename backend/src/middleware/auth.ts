import { Request, Response, NextFunction } from 'express';

export const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    res.status(401).json({ error: 'No token provided' });
    return;
  }
  
  // For now, accept any token (we'll add JWT verification later)
  // In production: verify JWT, extract memberId, attach to req
  (req as any).memberId = token;
  next();
};
