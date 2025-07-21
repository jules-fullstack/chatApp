import { Request, Response, NextFunction } from 'express';
import passport from 'passport';
import User from '../models/User.js';
import {
  RegisterRequest,
  LoginRequest,
  OTPVerifyRequest,
  AuthResponse,
} from '../types/index.js';
import { sendOTPEmail } from '../services/emailService.js';
import { rateLimitService } from '../services/rateLimitService.js';

export const register = async (
  req: Request<{}, AuthResponse, RegisterRequest>,
  res: Response<AuthResponse>,
): Promise<void> => {
  try {
    const { firstName, lastName, userName, email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      res.status(400).json({ message: 'User already exists' });
      return;
    }

    const user = new User({
      firstName,
      lastName,
      userName,
      email,
      password,
      role: 'user',
    });
    const otp = user.generateOTP();
    await user.save();

    await sendOTPEmail(email, otp);

    req.session.pendingUser = { email, type: 'register' };

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
      const otp = user.generateOTP();
      await user.save();
      await sendOTPEmail(user.email, otp);

      // Store user info in session for OTP verification
      req.session.pendingUser = { email: user.email, type: 'login' };

      res.json({
        message:
          'Login credentials verified. Please check your email for OTP verification.',
      });
    } catch (error) {
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

    // Check if there's a pending user in session
    if (!req.session.pendingUser || req.session.pendingUser.email !== email) {
      res.status(400).json({ message: 'Invalid verification session' });
      return;
    }

    const user = await User.findOne({ email });
    if (!user) {
      res.status(400).json({ message: 'User not found' });
      return;
    }

    if (!user.verifyOTP(otp)) {
      res.status(400).json({ message: 'Invalid or expired OTP' });
      return;
    }

    // Clear OTP and mark email as verified
    user.otp = undefined;
    user.otpExpiry = undefined;
    user.isEmailVerified = true;
    await user.save();

    // Log the user in
    req.login(user, (err) => {
      if (err) {
        res
          .status(500)
          .json({ message: 'Error logging in after OTP verification' });
        return;
      }

      // Clear pending user from session
      delete req.session.pendingUser;

      res.json({
        message: 'OTP verified successfully',
        user: {
          id: user._id.toString(),
          firstName: user.firstName,
          lastName: user.lastName,
          userName: user.userName,
          email: user.email,
          role: user.role,
          avatar: user.avatar,
        },
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
  res: Response<AuthResponse>
): Promise<void> => {
  try {
    const { email } = req.body;

    if (!req.session.pendingUser || req.session.pendingUser.email !== email) {
      res.status(400).json({ message: 'Invalid verification session' });
      return;
    }

    const rateLimit = rateLimitService.checkRateLimit(email);
    if (!rateLimit.allowed) {
      res.status(429).json({ 
        message: `Too many OTP requests. Please try again in ${Math.ceil(rateLimit.timeUntilReset! / 60)} minutes.`,
        timeUntilReset: rateLimit.timeUntilReset
      });
      return;
    }

    const user = await User.findOne({ email });
    if (!user) {
      res.status(400).json({ message: 'User not found' });
      return;
    }

    const otp = user.generateOTP();
    await user.save();
    await sendOTPEmail(email, otp);

    rateLimitService.recordAttempt(email);

    const remainingAttempts = rateLimitService.getRemainingAttempts(email);

    res.json({
      message: 'OTP resent successfully. Please check your email.',
      remainingAttempts
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      message: `Server error: ${errorMessage}`
    });
  }
};

export const getCurrentUser = (req: Request, res: Response): void => {
  if (req.user) {
    res.json({
      user: {
        id: req.user._id.toString(),
        firstName: req.user.firstName,
        lastName: req.user.lastName,
        userName: req.user.userName,
        email: req.user.email,
        role: req.user.role,
        avatar: req.user.avatar,
      },
    });
  } else {
    res.status(401).json({ message: 'Not authenticated' });
  }
};
