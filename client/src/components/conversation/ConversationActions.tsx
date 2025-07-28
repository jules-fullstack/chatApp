import { memo } from 'react';
import { PencilIcon, PhotoIcon } from '@heroicons/react/24/solid';
import { Accordion } from '@mantine/core';

interface ConversationActionsProps {
  isGroup: boolean;
  isGroupAdmin: boolean;
  isUploadingPhoto: boolean;
  onOpenGroupNameModal: () => void;
  onOpenPhotoUpload: () => void;
  onPhotoUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
}

export const ConversationActions = memo(({
  isGroup,
  isGroupAdmin,
  isUploadingPhoto,
  onOpenGroupNameModal,
  onOpenPhotoUpload,
  onPhotoUpload,
  fileInputRef,
}: ConversationActionsProps) => {
  if (!isGroup || !isGroupAdmin) return null;

  return (
    <Accordion.Item value="customize-chat">
      <Accordion.Control>
        <p className="font-semibold">Customize chat</p>
      </Accordion.Control>

      <div
        className="cursor-pointer hover:bg-gray-50"
        onClick={onOpenGroupNameModal}
      >
        <Accordion.Panel>
          <div className="flex items-center gap-2">
            <div className="bg-gray-200 rounded-full p-2">
              <PencilIcon className="size-4" />
            </div>
            <p className="font-medium">Change chat name</p>
          </div>
        </Accordion.Panel>
      </div>

      {isGroup && (
        <div
          className="cursor-pointer hover:bg-gray-50"
          onClick={onOpenPhotoUpload}
        >
          <Accordion.Panel>
            <div className="flex items-center gap-2">
              <div className="bg-gray-200 rounded-full p-2">
                <PhotoIcon className="size-4" />
              </div>
              <p className="font-medium">Change photo</p>
            </div>
          </Accordion.Panel>
        </div>
      )}

      <input
        type="file"
        ref={fileInputRef}
        onChange={onPhotoUpload}
        accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
        className="hidden"
        disabled={isUploadingPhoto}
      />
    </Accordion.Item>
  );
});

ConversationActions.displayName = 'ConversationActions';