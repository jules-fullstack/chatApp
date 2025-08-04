import { memo } from "react";
import { CameraIcon } from "@heroicons/react/24/outline";
import Avatar from "./Avatar";
import { transformUserForAvatar } from "../../utils/profileUtils";

import type { Media } from "../../types";

interface UserStoreUser {
  id: string;
  firstName: string;
  lastName: string;
  userName: string;
  email: string;
  role: "user" | "superAdmin";
  avatar?: Media | string;
}

interface AvatarUploadSectionProps {
  user: UserStoreUser | null;
  onAvatarUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  isUploadingAvatar: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
}

export const AvatarUploadSection = memo(({
  user,
  onAvatarUpload,
  isUploadingAvatar,
  fileInputRef,
}: AvatarUploadSectionProps) => {
  return (
    <div className="flex flex-col items-center mb-6">
      <div className="relative">
        <Avatar
          user={transformUserForAvatar(user)}
          size="xl"
          className="border-4 border-gray-200"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploadingAvatar}
          className="absolute bottom-0 right-0 bg-blue-500 cursor-pointer hover:bg-blue-600 disabled:bg-gray-400 text-white p-2 rounded-full shadow-lg transition-colors"
        >
          <CameraIcon className="w-4 h-4" />
        </button>
      </div>
      <p className="text-sm text-gray-600 mt-2">
        Click the camera icon to upload a new avatar
      </p>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={onAvatarUpload}
        className="hidden"
      />
    </div>
  );
});

AvatarUploadSection.displayName = "AvatarUploadSection";