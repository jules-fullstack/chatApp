import { notifications } from "@mantine/notifications";
import { messageSchema } from "../schemas/messageSchema";

const MAX_FILES = 10;
const MAX_TOTAL_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
];

export function useMessageValidation() {
  const validateMessage = (message: string): boolean => {
    try {
      messageSchema.parse({ message });
      return true;
    } catch (error: unknown) {
      // Zod error structure: error.issues[0].message
      const errorMessage =
        (error as { issues?: { message: string }[] })?.issues?.[0]?.message ||
        "Invalid message";
      notifications.show({
        title: "Message Validation Error",
        message: errorMessage,
        color: "red",
        autoClose: 3000,
      });
      return false;
    }
  };

  const validateImages = (files: File[], selectedImages: File[]): boolean => {
    const currentTotal = selectedImages.length;
    const newTotal = currentTotal + files.length;

    if (newTotal > MAX_FILES) {
      notifications.show({
        title: "Too Many Files",
        message: `Maximum ${MAX_FILES} images allowed. You can add ${MAX_FILES - currentTotal} more.`,
        color: "red",
        autoClose: 3000,
      });
      return false;
    }

    for (const file of files) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        notifications.show({
          title: "Invalid File Type",
          message: `Only JPEG, PNG, GIF, and WebP images are allowed.`,
          color: "red",
          autoClose: 3000,
        });
        return false;
      }
    }

    const currentSize = selectedImages.reduce(
      (total, img) => total + img.size,
      0
    );
    const newSize = files.reduce((total, file) => total + file.size, 0);
    const totalSize = currentSize + newSize;

    if (totalSize > MAX_TOTAL_SIZE) {
      notifications.show({
        title: "Files Too Large",
        message: `Total file size cannot exceed 5MB.`,
        color: "red",
        autoClose: 3000,
      });
      return false;
    }

    return true;
  };

  return {
    validateMessage,
    validateImages,
    MAX_FILES,
    MAX_TOTAL_SIZE,
    ALLOWED_TYPES,
  };
}