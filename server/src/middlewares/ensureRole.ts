import { Request, Response, NextFunction } from 'express';

export const ensureRole = (role: 'user' | 'superAdmin') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.isAuthenticated() || !req.user) {
      res.status(401).json({ message: 'Not authenticated' });
      return;
    }
    if (req.user.role !== role) {
      res.status(403).json({ message: 'Forbidden: insufficient rights' });
      return;
    }
    next();
  };
};
