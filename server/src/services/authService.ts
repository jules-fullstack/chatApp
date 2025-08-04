import { sendOTPEmail } from './emailService.js';
import { populateUserWithAvatar } from '../utils/mediaQueries.js';
import { IUser } from '../types/index.js';

class AuthService {
  /**
   * Generate OTP for user and send via email
   */
  async generateAndSendOTP(user: IUser): Promise<string> {
    const otp = user.generateOTP();
    await user.save();
    await sendOTPEmail(user.email, otp);
    return otp;
  }

  /**
   * Get user with populated avatar URL
   */
  async getUserWithAvatar(userId: string): Promise<string | null> {
    const userWithAvatar = await populateUserWithAvatar(userId);
    return (userWithAvatar?.avatar as any)?.url || null;
  }
}

// Export singleton instance
export default new AuthService();