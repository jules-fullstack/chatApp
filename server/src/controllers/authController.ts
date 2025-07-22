import { Request, Response, NextFunction } from 'express';
import passport from 'passport';
import User from '../models/User.js';
import InvitationToken from '../models/InvitationToken.js';
import Conversation from '../models/Conversation.js';
import {
  RegisterRequest,
  LoginRequest,
  OTPVerifyRequest,
  AuthResponse,
} from '../types/index.js';
import { sendOTPEmail } from '../services/emailService.js';
import { rateLimitService } from '../services/rateLimitService.js';
import { populateUserWithAvatar } from '../utils/mediaQueries.js';
import WebSocketManager from '../config/websocket.js';

export const register = async (
  req: Request<{}, AuthResponse, RegisterRequest>,
  res: Response<AuthResponse>,
): Promise<void> => {
  try {
    const { firstName, lastName, userName, email, password, invitationToken } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      res.status(400).json({ message: 'User already exists' });
      return;
    }

    // Validate invitation token if provided
    let invitation = null;
    if (invitationToken) {
      invitation = await InvitationToken.findOne({
        token: invitationToken,
        email: email.toLowerCase(),
        isUsed: false,
        expiresAt: { $gt: new Date() }
      }).populate('conversationId');

      if (!invitation) {
        res.status(400).json({ message: 'Invalid or expired invitation token' });
        return;
      }
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

    // Store both registration and invitation info in session
    const pendingUser: any = { 
      email, 
      type: 'register'
    };
    
    if (invitationToken) {
      pendingUser.invitationToken = invitationToken;
    }
    
    req.session.pendingUser = pendingUser;

    console.log('Registration - Session ID:', req.sessionID);
    console.log('Registration - Stored invitation token in session:', invitationToken);
    console.log('Registration - Full pendingUser object:', req.session.pendingUser);

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
      const otp = user.generateOTP();
      await user.save();
      await sendOTPEmail(user.email, otp);

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

    console.log('VerifyOTP - Session ID:', req.sessionID);
    console.log('VerifyOTP - Session data:', req.session);
    console.log('VerifyOTP - PendingUser:', req.session.pendingUser);

    // Check if there's a pending user in session
    if (!req.session.pendingUser || req.session.pendingUser.email !== email) {
      console.log('VerifyOTP - Session validation failed');
    console.log('Expected email:', email);
    console.log('Session email:', req.session.pendingUser?.email);
      res.status(400).json({ message: 'Invalid verification session' });
      return;
    }

    console.log('VerifyOTP - Session validation passed, proceeding with OTP verification');

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

    // Save invitation token before login (as req.login might regenerate session)
    const savedInvitationToken = req.session.pendingUser?.invitationToken;
    console.log('Saving invitation token before login:', savedInvitationToken);

    // Log the user in
    req.login(user, async (err) => {
      if (err) {
        res
          .status(500)
          .json({ message: 'Error logging in after OTP verification' });
        return;
      }

      // Handle invitation token if present  
      console.log('=== INVITATION PROCESSING START ===');
      console.log('OTP Verification - Session ID:', req.sessionID);
      console.log('OTP Verification - Full pendingUser object:', req.session.pendingUser);
      console.log('OTP Verification - Saved invitation token:', savedInvitationToken);
      console.log('OTP Verification - Checking invitation token:', req.session.pendingUser?.invitationToken || savedInvitationToken);
      if (req.session.pendingUser?.invitationToken || savedInvitationToken) {
        try {
          const invitation = await InvitationToken.findOne({
            token: req.session.pendingUser?.invitationToken || savedInvitationToken,
            email: email.toLowerCase(),
            isUsed: false,
            expiresAt: { $gt: new Date() }
          });

          console.log('Found invitation:', invitation ? 'Yes' : 'No');

          if (invitation) {
            // Add user to the conversation
            const conversation = await Conversation.findById(invitation.conversationId);
            console.log('Found conversation:', conversation ? 'Yes' : 'No');
            if (conversation && conversation.isGroup) {
              // Add user to participants if not already added
              if (!conversation.participants.includes(user._id)) {
                conversation.participants.push(user._id);
                await conversation.save();
                console.log('User added to conversation:', conversation._id);

                // Get updated conversation with populated participants for WebSocket
                const updatedConversation = await Conversation.findById(conversation._id)
                  .populate('participants', 'firstName lastName userName avatar')
                  .populate('groupAdmin', 'firstName lastName userName')
                  .populate('groupPhoto')
                  .lean();

                // Notify all participants via WebSocket about the new member
                const newMember = {
                  userId: user._id.toString(),
                  userName: user.userName,
                  firstName: user.firstName,
                  lastName: user.lastName,
                };

                conversation.participants.forEach((participantId: any) => {
                  WebSocketManager.sendMessage(participantId.toString(), {
                    type: 'members_added_to_group',
                    conversationId: conversation._id,
                    addedMembers: [newMember],
                    conversation: updatedConversation,
                    addedBy: {
                      userId: 'system',
                      userName: 'System',
                      firstName: 'System',
                      lastName: '',
                    },
                    timestamp: new Date().toISOString(),
                  });
                });

                console.log('WebSocket notifications sent for new group member with updated conversation data');
              } else {
                console.log('User already in conversation');
              }

              // Mark invitation as used
              invitation.isUsed = true;
              await invitation.save();
              console.log('Invitation marked as used');
            }
          } else {
            console.log('No valid invitation found for token:', req.session.pendingUser?.invitationToken || savedInvitationToken);
          }
        } catch (invitationError) {
          console.error('Error processing invitation:', invitationError);
          // Don't fail the entire login process if invitation processing fails
        }
      } else {
        console.log('No invitation token in session');
      }
      console.log('=== INVITATION PROCESSING END ===');

      // Clear pending user from session
      delete req.session.pendingUser;

      // Get user with populated avatar
      const userWithAvatar = await populateUserWithAvatar(user._id);
      const avatarUrl = (userWithAvatar?.avatar as any)?.url || null;

      res.json({
        message: 'OTP verified successfully',
        user: {
          id: user._id.toString(),
          firstName: user.firstName,
          lastName: user.lastName,
          userName: user.userName,
          email: user.email,
          role: user.role,
          avatar: avatarUrl,
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
  res: Response<AuthResponse>,
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
        timeUntilReset: rateLimit.timeUntilReset,
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
      // Get user with populated avatar
      const userWithAvatar = await populateUserWithAvatar(req.user._id);
      const avatarUrl = (userWithAvatar?.avatar as any)?.url || null;

      res.json({
        user: {
          id: req.user._id.toString(),
          firstName: req.user.firstName,
          lastName: req.user.lastName,
          userName: req.user.userName,
          email: req.user.email,
          role: req.user.role,
          avatar: avatarUrl,
        },
      });
    } catch (error) {
      console.error('Error getting current user:', error);
      res.status(500).json({ message: 'Error fetching user data' });
    }
  } else {
    res.status(401).json({ message: 'Not authenticated' });
  }
};

export const checkInvitation = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { token } = req.query;

    if (!token || typeof token !== 'string') {
      res.status(400).json({ message: 'Invalid invitation token' });
      return;
    }

    const invitation = await InvitationToken.findOne({
      token,
      isUsed: false,
      expiresAt: { $gt: new Date() }
    }).populate([
      {
        path: 'conversationId',
        select: 'groupName',
      },
      {
        path: 'invitedBy',
        select: 'firstName lastName userName',
      }
    ]);

    if (!invitation) {
      res.status(404).json({ message: 'Invalid or expired invitation' });
      return;
    }

    const conversation = invitation.conversationId as any;
    const inviter = invitation.invitedBy as any;

    const inviterName = inviter?.firstName && inviter?.lastName 
      ? `${inviter.firstName} ${inviter.lastName}`
      : inviter?.userName || 'A ChatApp user';

    res.json({
      email: invitation.email,
      groupName: conversation?.groupName || 'Group Chat',
      inviterName,
    });
  } catch (error) {
    console.error('Error checking invitation:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
