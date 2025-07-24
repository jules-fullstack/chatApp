import InvitationToken from '../models/InvitationToken.js';
import Conversation from '../models/Conversation.js';
import { GroupEventService } from './groupEventService.js';
import notificationService from './notificationService.js';
import { Types } from 'mongoose';
import { IUser } from '../types/index.js';

export interface InvitationInfo {
  email: string;
  groupName: string;
  inviterName: string;
}

export interface ProcessInvitationResult {
  success: boolean;
  conversationId?: Types.ObjectId;
  message?: string;
}

class InvitationService {
  /**
   * Validate invitation token and return invitation details
   */
  async validateInvitationToken(token: string, email: string) {
    const invitation = await InvitationToken.findOne({
      token,
      email: email.toLowerCase(),
      isUsed: false,
      expiresAt: { $gt: new Date() },
    }).populate('conversationId');

    return invitation;
  }

  /**
   * Get invitation information for display
   */
  async getInvitationInfo(token: string): Promise<InvitationInfo | null> {
    const invitation = await InvitationToken.findOne({
      token,
      isUsed: false,
      expiresAt: { $gt: new Date() },
    }).populate([
      {
        path: 'conversationId',
        select: 'groupName',
      },
      {
        path: 'invitedBy',
        select: 'firstName lastName userName',
      },
    ]);

    if (!invitation) {
      return null;
    }

    const conversation = invitation.conversationId as any;
    const inviter = invitation.invitedBy as any;

    const inviterName =
      inviter?.firstName && inviter?.lastName
        ? `${inviter.firstName} ${inviter.lastName}`
        : inviter?.userName || 'A ChatApp user';

    return {
      email: invitation.email,
      groupName: conversation?.groupName || 'Group Chat',
      inviterName,
    };
  }

  /**
   * Process invitation after user verification
   */
  async processInvitation(
    invitationToken: string,
    email: string,
    user: IUser
  ): Promise<ProcessInvitationResult> {
    try {
      const invitation = await this.validateInvitationToken(invitationToken, email);

      if (!invitation) {
        return {
          success: false,
          message: 'Invalid or expired invitation token',
        };
      }

      // Get the conversation
      const conversation = await Conversation.findById(invitation.conversationId);
      if (!conversation || !conversation.isGroup) {
        return {
          success: false,
          message: 'Invalid conversation for invitation',
        };
      }

      // Check if user is already in conversation
      if (conversation.participants.includes(user._id)) {
        console.log('User already in conversation');
        // Mark invitation as used even if already in conversation
        invitation.isUsed = true;
        await invitation.save();
        
        return {
          success: true,
          conversationId: conversation._id,
          message: 'User already in conversation',
        };
      }

      // Add user to conversation
      conversation.participants.push(user._id);
      await conversation.save();

      // Create group event for user joining via invitation
      const eventMessage = await GroupEventService.createUserJoinedViaInvitationEvent(
        conversation._id,
        user._id,
      );

      // Get updated conversation with populated participants
      const updatedConversation = await Conversation.findById(conversation._id)
        .populate('participants', 'firstName lastName userName avatar')
        .populate('groupAdmin', 'firstName lastName userName')
        .populate('groupPhoto')
        .lean();

      // Notify all participants about new member
      const newMember = {
        _id: user._id,
        userName: user.userName,
        firstName: user.firstName,
        lastName: user.lastName,
      };

      const systemUser = {
        _id: new Types.ObjectId('000000000000000000000000'),
        userName: 'System',
        firstName: 'System',
        lastName: '',
      };

      await notificationService.notifyMembersAdded(
        conversation.participants,
        conversation._id,
        [newMember],
        systemUser,
        updatedConversation
      );

      // Send the group event message
      notificationService.broadcastGroupEvent(
        conversation.participants,
        eventMessage
      );

      // Mark invitation as used
      invitation.isUsed = true;
      await invitation.save();

      return {
        success: true,
        conversationId: conversation._id,
        message: 'User added to group successfully',
      };
    } catch (error) {
      console.error('Error processing invitation:', error);
      return {
        success: false,
        message: 'Error processing invitation',
      };
    }
  }
}

// Export singleton instance
export default new InvitationService();