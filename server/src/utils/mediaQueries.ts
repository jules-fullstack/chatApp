import { Types } from 'mongoose';
import User from '../models/User.js';
import Message from '../models/Message.js';
import Media from '../models/Media.js';
import mediaService from '../services/mediaService.js';

export const populateUserWithAvatar = async (userId: string | Types.ObjectId) => {
  return await User.findById(userId).populate({
    path: 'avatar',
    match: { isDeleted: false },
    select: 'url filename originalName mimeType metadata',
  });
};

export const populateUsersWithAvatars = async (userIds: (string | Types.ObjectId)[]) => {
  return await User.find({ _id: { $in: userIds } }).populate({
    path: 'avatar',
    match: { isDeleted: false },
    select: 'url filename originalName mimeType metadata',
  });
};

export const populateMessageWithAttachments = async (messageId: string | Types.ObjectId) => {
  return await Message.findById(messageId)
    .populate('sender', 'firstName lastName userName')
    .populate({
      path: 'sender',
      populate: {
        path: 'avatar',
        match: { isDeleted: false },
        select: 'url filename originalName mimeType metadata',
      },
    })
    .populate({
      path: 'attachments',
      match: { isDeleted: false },
      select: 'url filename originalName mimeType size metadata usage',
    });
};

export const populateMessagesWithAttachments = async (messageIds: (string | Types.ObjectId)[]) => {
  return await Message.find({ _id: { $in: messageIds } })
    .populate('sender', 'firstName lastName userName')
    .populate({
      path: 'sender',
      populate: {
        path: 'avatar',
        match: { isDeleted: false },
        select: 'url filename originalName mimeType metadata',
      },
    })
    .populate({
      path: 'attachments',
      match: { isDeleted: false },
      select: 'url filename originalName mimeType size metadata usage',
    })
    .sort({ createdAt: -1 });
};

export const getMessagesByConversationWithMedia = async (
  conversationId: string | Types.ObjectId,
  limit = 50,
  skip = 0
) => {
  return await Message.find({ conversation: conversationId })
    .populate('sender', 'firstName lastName userName')
    .populate({
      path: 'sender',
      populate: {
        path: 'avatar',
        match: { isDeleted: false },
        select: 'url filename originalName mimeType metadata',
      },
    })
    .populate({
      path: 'attachments',
      match: { isDeleted: false },
      select: 'url filename originalName mimeType size metadata usage',
    })
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip);
};

export const getUserAvatarMedia = async (userId: string | Types.ObjectId) => {
  return await Media.findOne({
    parentType: 'User',
    parentId: userId,
    usage: 'avatar',
    isDeleted: false,
  }).select('url filename originalName mimeType metadata');
};

export const getMessageAttachments = async (messageId: string | Types.ObjectId) => {
  return await Media.find({
    parentType: 'Message',
    parentId: messageId,
    usage: 'attachment',
    isDeleted: false,
  }).select('url filename originalName mimeType size metadata');
};

export const createDefaultAvatarMedia = async (userId: string | Types.ObjectId) => {
  // Create default avatar using media service
  const media = await mediaService.createDefaultAvatar(userId);
  
  // Update user with the new avatar
  await User.findByIdAndUpdate(userId, { avatar: media._id });
  
  return media;
};