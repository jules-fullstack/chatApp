import { PhotoIcon } from "@heroicons/react/24/outline";
import { HandThumbUpIcon, PaperAirplaneIcon } from "@heroicons/react/24/solid";

interface MessageActionsProps {
  messageValue: string;
  selectedImages: File[];
  isSubmitting: boolean;
  hasBlockedUser: boolean;
  isBlockedByUser: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onPhotoClick: () => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onLikeClick: () => void;
}

export function MessageActions({
  messageValue,
  selectedImages,
  isSubmitting,
  hasBlockedUser,
  isBlockedByUser,
  fileInputRef,
  onPhotoClick,
  onFileChange,
  onLikeClick,
}: MessageActionsProps) {
  return (
    <>
      <PhotoIcon
        className={`size-6 mr-4 transition-colors ${
          hasBlockedUser || isBlockedByUser
            ? "cursor-not-allowed text-gray-400"
            : "cursor-pointer text-gray-500 hover:text-gray-700"
        }`}
        onClick={
          hasBlockedUser || isBlockedByUser ? undefined : onPhotoClick
        }
      />

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
        onChange={onFileChange}
        className="hidden"
        disabled={hasBlockedUser || isBlockedByUser}
      />

      {(messageValue && messageValue.trim()) ||
      selectedImages.length > 0 ? (
        <button
          type="submit"
          disabled={isSubmitting || hasBlockedUser || isBlockedByUser}
          className={`p-2 transition-colors ${
            isSubmitting || hasBlockedUser || isBlockedByUser
              ? "text-gray-400 cursor-not-allowed"
              : "text-blue-500 hover:text-blue-700"
          }`}
        >
          <PaperAirplaneIcon className="size-6 cursor-pointer" />
        </button>
      ) : (
        <button
          type="button"
          onClick={
            hasBlockedUser || isBlockedByUser ? undefined : onLikeClick
          }
          disabled={isSubmitting || hasBlockedUser || isBlockedByUser}
          className={`p-2 transition-colors ${
            isSubmitting || hasBlockedUser || isBlockedByUser
              ? "text-gray-400 cursor-not-allowed"
              : "text-blue-500 hover:text-blue-700"
          }`}
        >
          <HandThumbUpIcon className="size-6 cursor-pointer" />
        </button>
      )}
    </>
  );
}