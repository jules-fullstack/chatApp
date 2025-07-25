import { rateLimitService } from '../services/rateLimitService.js';
import invitationService from '../services/invitationService.js';
import authService from '../services/authService.js';

import User from '../models/User.js';

import { Request, Response, NextFunction } from 'express';
import { formatUserResponse } from '../utils/userUtils.js';
import passport from 'passport';

import {
  RegisterRequest,
  LoginRequest,
  OTPVerifyRequest,
  AuthResponse,
} from '../types/index.js';

export const register = async (
  req: Request<{}, AuthResponse, RegisterRequest>,
  res: Response<AuthResponse>,
): Promise<void> => {
  try {
    const { firstName, lastName, userName, email, password, invitationToken } =
      req.body;

    const user = new User({
      firstName,
      lastName,
      userName,
      email,
      password,
      role: 'user',
    });

    await authService.generateAndSendOTP(user);

    // Store both registration and invitation info in session
    const pendingUser: any = {
      email,
      type: 'register',
    };

    if (invitationToken) {
      pendingUser.invitationToken = invitationToken;
    }

    req.session.pendingUser = pendingUser;

    // Explicitly save the session to ensure it persists
    req.session.save((err) => {
      if (err) {
        console.error('Error saving session:', err);
      } else {
        console.log('Session saved successfully');
      }
    });

    res.status(201).json({
      message:
        'Registration successful. Please check your email for OTP verification.',
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
  passport.authenticate('local', async (err: Error, user: any, info: any) => {
    if (err) {
      res.status(500).json({ message: 'Server error' });
      return;
    }
    if (!user) {
      res.status(400).json({ message: info.message });
      return;
    }

    try {
      // Generate and send OTP
      await authService.generateAndSendOTP(user);

      // Store user info in session for OTP verification
      req.session.pendingUser = { email: user.email, type: 'login' };

      res.json({
        message:
          'Login credentials verified. Please check your email for OTP verification.',
      });
    } catch {
      res.status(500).json({ message: 'Error sending OTP' });
    }
  })(req, res, next);
};

export const verifyOTP = async (
  req: Request<{}, AuthResponse, OTPVerifyRequest>,
  res: Response<AuthResponse>,
): Promise<void> => {
  try {
    const { email, otp } = req.body;

    const user = req.user!;

    console.log(email, otp);

    if (!user.verifyOTP(otp)) {
      res.status(400).json({ message: 'Invalid or expired OTP' });
      return;
    }

    // Clear OTP and mark email as verified
    user.otp = undefined;
    user.otpExpiry = undefined;
    user.isEmailVerified = true;
    await user.save();

    // Save invitation token before login (as req.login might regenerate session)
    const savedInvitationToken = req.session.pendingUser?.invitationToken;

    // Log the user in
    req.login(user, async (err) => {
      if (err) {
        res
          .status(500)
          .json({ message: 'Error logging in after OTP verification' });
        return;
      }

      const token =
        req.session.pendingUser?.invitationToken || savedInvitationToken;
      if (token) {
        try {
          const result = await invitationService.processInvitation(
            token,
            email,
            user,
          );

          if (!result.success) {
            console.log('Invitation processing failed:', result.message);
          }
        } catch (invitationError) {
          console.error('Error processing invitation:', invitationError);
          // Don't fail the entire login process if invitation processing fails
        }
      } else {
        console.log('No invitation token in session');
      }

      // Clear pending user from session
      delete req.session.pendingUser;

      // Get user with populated avatar
      const avatarUrl = await authService.getUserWithAvatar(
        user._id.toString(),
      );

      res.json({
        message: 'OTP verified successfully',
        user: formatUserResponse(user, avatarUrl),
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

export const resendOTP = async (
  req: Request<{}, AuthResponse, { email: string }>,
  res: Response<AuthResponse>,
): Promise<void> => {
  try {
    const { email } = req.body;

    const rateLimit = rateLimitService.checkRateLimit(email);
    if (!rateLimit.allowed) {
      res.status(429).json({
        message: `Too many OTP requests. Please try again in ${Math.ceil(rateLimit.timeUntilReset! / 60)} minutes.`,
        timeUntilReset: rateLimit.timeUntilReset,
      });
      return;
    }

    const user = req.user!;

    await authService.generateAndSendOTP(user);

    rateLimitService.recordAttempt(email);

    const remainingAttempts = rateLimitService.getRemainingAttempts(email);

    res.json({
      message: 'OTP resent successfully. Please check your email.',
      remainingAttempts,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      message: `Server error: ${errorMessage}`,
    });
  }
};

export const getCurrentUser = async (
  req: Request,
  res: Response,
): Promise<void> => {
  if (req.user) {
    try {
      const avatarUrl = await authService.getUserWithAvatar(
        req.user._id.toString(),
      );

      res.json({
        authenticated: true,
        user: formatUserResponse(req.user, avatarUrl),
      });
    } catch (error) {
      console.error('Error getting current user:', error);
      res.status(500).json({ message: 'Error fetching user data' });
    }
  } else {
    res.json({ authenticated: false, message: 'Not authenticated' });
  }
};

export const checkInvitation = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const invitationInfo = (req as any).invitationInfo;
  res.json(invitationInfo);
};
