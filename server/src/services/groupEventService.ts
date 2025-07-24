import Message from '../models/Message.js';
import Conversation from '../models/Conversation.js';
import { Types } from 'mongoose';

export interface GroupEventData {
  conversationId: Types.ObjectId;
  actorUserId: Types.ObjectId;
  targetUserId?: Types.ObjectId;
  oldValue?: string;
  newValue?: string;
}

export class GroupEventService {
  static async createGroupEvent(
    eventType: 'nameChange' | 'photoChange' | 'userLeft' | 'userPromoted' | 'userRemoved' | 'userAdded' | 'userJoinedViaInvitation',
    data: GroupEventData
  ) {
    const eventMessage = new Message({
      conversation: data.conversationId,
      sender: data.actorUserId,
      messageType: 'groupEvent',
      groupEventType: eventType,
      groupEventData: {
        targetUser: data.targetUserId,
        oldValue: data.oldValue,
        newValue: data.newValue,
      },
    });

    const savedMessage = await eventMessage.save();
    
    // Update the conversation's lastMessage and lastMessageAt
    await Conversation.findByIdAndUpdate(data.conversationId, {
      lastMessage: savedMessage._id,
      lastMessageAt: new Date(),
    });
    
    // Populate the message with sender and target user data
    return await Message.findById(savedMessage._id)
      .populate('sender', 'firstName lastName userName')
      .populate({
        path: 'sender',
        populate: {
          path: 'avatar',
          match: { isDeleted: false },
          select: 'url filename originalName mimeType metadata',
        },
      })
      .populate('groupEventData.targetUser', 'firstName lastName userName')
      .populate({
        path: 'groupEventData.targetUser',
        populate: {
          path: 'avatar',
          match: { isDeleted: false },
          select: 'url filename originalName mimeType metadata',
        },
      });
  }

  static async createNameChangeEvent(
    conversationId: Types.ObjectId,
    actorUserId: Types.ObjectId,
    oldName: string,
    newName: string
  ) {
    return this.createGroupEvent('nameChange', {
      conversationId,
      actorUserId,
      oldValue: oldName,
      newValue: newName,
    });
  }

  static async createPhotoChangeEvent(
    conversationId: Types.ObjectId,
    actorUserId: Types.ObjectId
  ) {
    return this.createGroupEvent('photoChange', {
      conversationId,
      actorUserId,
    });
  }

  static async createUserLeftEvent(
    conversationId: Types.ObjectId,
    userId: Types.ObjectId
  ) {
    return this.createGroupEvent('userLeft', {
      conversationId,
      actorUserId: userId,
      targetUserId: userId,
    });
  }

  static async createUserPromotedEvent(
    conversationId: Types.ObjectId,
    actorUserId: Types.ObjectId,
    targetUserId: Types.ObjectId
  ) {
    return this.createGroupEvent('userPromoted', {
      conversationId,
      actorUserId,
      targetUserId,
    });
  }

  static async createUserRemovedEvent(
    conversationId: Types.ObjectId,
    actorUserId: Types.ObjectId,
    targetUserId: Types.ObjectId
  ) {
    return this.createGroupEvent('userRemoved', {
      conversationId,
      actorUserId,
      targetUserId,
    });
  }

  static async createUserAddedEvent(
    conversationId: Types.ObjectId,
    actorUserId: Types.ObjectId,
    targetUserId: Types.ObjectId
  ) {
    return this.createGroupEvent('userAdded', {
      conversationId,
      actorUserId,
      targetUserId,
    });
  }

  static async createUserJoinedViaInvitationEvent(
    conversationId: Types.ObjectId,
    userId: Types.ObjectId
  ) {
    return this.createGroupEvent('userJoinedViaInvitation', {
      conversationId,
      actorUserId: userId,
      targetUserId: userId,
    });
  }
}