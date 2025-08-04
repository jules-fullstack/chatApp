import { memo, useMemo } from 'react';
import { ArrowRightStartOnRectangleIcon } from '@heroicons/react/24/outline';
import { NoSymbolIcon } from '@heroicons/react/24/solid';
import { Accordion } from '@mantine/core';
import { type Participant } from '../../types';

interface ConversationPrivacyProps {
  isGroup: boolean;
  participant?: Participant | null;
  blockedUsers: Set<string>;
  onOpenLeaveGroupModal: () => void;
  onOpenBlockUserModal: (participant: Participant) => void;
  onOpenUnblockUserModal: (participant: Participant) => void;
}

export const ConversationPrivacy = memo(({
  isGroup,
  participant,
  blockedUsers,
  onOpenLeaveGroupModal,
  onOpenBlockUserModal,
  onOpenUnblockUserModal,
}: ConversationPrivacyProps) => {
  const actionText = useMemo(() => {
    if (isGroup) return 'Leave Group';
    
    if (participant && blockedUsers.has(participant._id)) {
      return 'Unblock';
    }
    
    return 'Block';
  }, [isGroup, participant, blockedUsers]);

  const handleClick = () => {
    if (isGroup) {
      onOpenLeaveGroupModal();
    } else if (participant) {
      if (blockedUsers.has(participant._id)) {
        onOpenUnblockUserModal(participant);
      } else {
        onOpenBlockUserModal(participant);
      }
    }
  };

  return (
    <Accordion.Item value="privacy-support">
      <Accordion.Control>
        <p className="font-semibold">Privacy & support</p>
      </Accordion.Control>

      <div className="cursor-pointer hover:bg-gray-50" onClick={handleClick}>
        <Accordion.Panel>
          <div className="flex items-center gap-2">
            <div className="bg-gray-200 rounded-full p-2">
              {isGroup ? (
                <ArrowRightStartOnRectangleIcon className="size-4" />
              ) : (
                <NoSymbolIcon className="size-4" />
              )}
            </div>
            <p className="font-medium">{actionText}</p>
          </div>
        </Accordion.Panel>
      </div>
    </Accordion.Item>
  );
});

ConversationPrivacy.displayName = 'ConversationPrivacy';