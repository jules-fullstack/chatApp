import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_APP_PASSWORD,
  },
});

export const sendOTPEmail = async (
  email: string,
  otp: string,
): Promise<void> => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Your OTP Code - ChatApp',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Your OTP Code</h2>
        <p>Your One-Time Password (OTP) for ChatApp is:</p>
        <div style="background: #f4f4f4; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
          <h1 style="color: #2563eb; font-size: 32px; margin: 0; letter-spacing: 8px;">${otp}</h1>
        </div>
        <p style="color: #666;">This code will expire in 10 minutes.</p>
        <p style="color: #666;">If you didn't request this code, please ignore this email.</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error('Error sending OTP email:', error);
    throw new Error('Failed to send OTP email');
  }
};

export const sendInvitationEmail = async (
  email: string,
  inviterName: string,
  groupName: string,
  invitationLink: string,
): Promise<void> => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: `You're invited to join ${groupName} on ChatApp`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">You're Invited!</h2>
        <p>${inviterName} has invited you to join the group chat "<strong>${groupName}</strong>" on ChatApp.</p>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
          <p style="margin-bottom: 15px; color: #666;">Click the link below to sign up and join the group:</p>
          <a href="${invitationLink}" 
             style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 500;">
            Join Group Chat
          </a>
        </div>
        
        <p style="color: #666; font-size: 14px;">This invitation will expire in 7 days. If you already have a ChatApp account, you can log in and the group will be added to your conversations.</p>
        <p style="color: #666; font-size: 14px;">If you didn't expect this invitation, you can safely ignore this email.</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error('Error sending invitation email:', error);
    throw new Error('Failed to send invitation email');
  }
};
