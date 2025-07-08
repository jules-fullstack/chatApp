import { Request, Response, NextFunction } from 'express';

export const ensureAuthenticated = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  if (req.isAuthenticated()) {
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
