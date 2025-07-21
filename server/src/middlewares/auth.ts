import { Request, Response, NextFunction } from 'express';

export const ensureAuthenticated = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  if (req.isAuthenticated()) {
    if (req.user && (req.user as any).isBlocked) {
      req.logout((err) => {
        if (err) {
          console.error('Error logging out blocked user:', err);
          res.status(500).json({ message: 'Internal server error' });
          return;
        }
        
        if (req.session && typeof req.session.destroy === 'function') {
          req.session.destroy((sessionErr) => {
            if (sessionErr) console.error('Error destroying session for blocked user:', sessionErr);
            res.status(403).json({ message: 'Your account has been blocked from the platform.' });
          });
        } else {
          res.status(403).json({ message: 'Your account has been blocked from the platform.' });
        }
      });
      return;
    }
    return next();
  }
  res.status(401).json({ message: 'Not authenticated' });
};

export const ensureNotAuthenticated = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  if (!req.isAuthenticated()) {
    return next();
  }
  res.status(400).json({ message: 'Already authenticated' });
};
