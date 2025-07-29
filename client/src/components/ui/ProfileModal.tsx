import { memo } from "react";
import { Modal, LoadingOverlay } from "@mantine/core";
import { AvatarUploadSection } from "./AvatarUploadSection";
import { ProfileForm } from "./ProfileForm";
import { useProfileManagement } from "../../hooks/useProfileManagement";

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProfileModal = memo(({ isOpen, onClose }: ProfileModalProps) => {
  const {
    isUpdating,
    isUploadingAvatar,
    fileInputRef,
    user,
    register,
    handleSubmit,
    errors,
    handleProfileUpdate,
    handleAvatarUpload,
  } = useProfileManagement();

  return (
    <Modal opened={isOpen} onClose={onClose} title="Profile Settings" size="md">
      <div className="relative">
        <LoadingOverlay visible={isUpdating || isUploadingAvatar} />

        {/* Avatar Upload Section */}
        <AvatarUploadSection
          user={user}
          onAvatarUpload={handleAvatarUpload}
          isUploadingAvatar={isUploadingAvatar}
          fileInputRef={fileInputRef}
        />

        {/* Profile Form */}
        <ProfileForm
          register={register}
          handleSubmit={handleSubmit}
          errors={errors}
          onSubmit={handleProfileUpdate}
          onCancel={onClose}
          isUpdating={isUpdating}
        />
      </div>
    </Modal>
  );
});

ProfileModal.displayName = "ProfileModal";