import { Request, Response, NextFunction } from 'express';

export const ensureRole = (role: 'user' | 'superAdmin') => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    if (req.user.role !== role) {
      return res
        .status(403)
        .json({ message: 'Forbidden: insufficient rights' });
    }
    next();
  };
};
