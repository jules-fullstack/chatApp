import { Request, Response, NextFunction } from 'express';
import passport from 'passport';
import User from '../models/User.js';
import { RegisterRequest, LoginRequest, AuthResponse } from '../types/index.js';

export const register = async (
  req: Request<{}, AuthResponse, RegisterRequest>,
  res: Response<AuthResponse>,
): Promise<void> => {
  try {
    const { email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      res.status(400).json({ message: 'User already exists' });
      return;
    }

    const user = new User({ email, password });
    await user.save();

    req.login(user, (err) => {
      if (err) {
        res
          .status(500)
          .json({ message: 'Error logging in after registration' });
        return;
      }
      res.status(201).json({
        message: 'User registered successfully',
        user: { id: user._id.toString(), email: user.email },
      });
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      message: `Server error: ${errorMessage}`,
    });
  }
};

export const login = (
  req: Request<{}, AuthResponse, LoginRequest>,
  res: Response<AuthResponse>,
  next: NextFunction,
): void => {
  passport.authenticate('local', (err: Error, user: any, info: any) => {
    if (err) {
      res.status(500).json({ message: 'Server error' });
      return;
    }
    if (!user) {
      res.status(400).json({ message: info.message });
      return;
    }

    req.login(user, (err) => {
      if (err) {
        res.status(500).json({ message: 'Error loggin in' });
        return;
      }
      res.json({
        message: 'Login successful',
        user: { id: user._id.toString(), email: user.email },
      });
    });
  })(req, res, next);
};

export const logout = (req: Request, res: Response): void => {
  req.logout((err) => {
    if (err) {
      res.status(500).json({ message: 'Error logging out' });
      return;
    }
    req.session.destroy((err) => {
      if (err) {
        res.status(500).json({ message: 'Error destroying session' });
        return;
      }
      res.clearCookie('connect.sid');
      res.json({ message: 'Logout successful' });
    });
  });
};

export const getCurrentUser = (req: Request, res: Response): void => {
  if (req.user) {
    res.json({
      user: { id: req.user._id.toString(), email: req.user.email },
    });
  } else {
    res.status(401).json({ message: 'Not authenticated' });
  }
};
