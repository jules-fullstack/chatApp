import { memo } from 'react';
import { type Participant, type Media } from '../../types';
import { Avatar, GroupAvatar } from '../ui';

interface ConversationDetailsHeaderProps {
  isGroup: boolean;
  conversationTitle: string;
  avatarUser: Participant | null;
  participants?: Participant[];
  groupPhoto?: Media;
}

export const ConversationDetailsHeader = memo(({
  isGroup,
  conversationTitle,
  avatarUser,
  participants = [],
  groupPhoto,
}: ConversationDetailsHeaderProps) => {
  return (
    <div className="flex flex-col items-center">
      {isGroup ? (
        <div className="mt-2">
          <GroupAvatar
            participants={participants}
            size="xl"
            className="!w-28 !h-28"
            groupPhoto={groupPhoto}
          />
        </div>
      ) : (
        <div className="mt-2">
          <Avatar user={avatarUser} size="xl" className="!w-28 !h-28" />
        </div>
      )}
      <p className={`font-semibold ${!isGroup ? 'text-blue-500' : ''}`}>
        {conversationTitle}
      </p>
    </div>
  );
});

ConversationDetailsHeader.displayName = 'ConversationDetailsHeader';