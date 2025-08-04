import { useState, useRef } from "react";
import { useMessageValidation } from "./useMessageValidation";
import { notifications } from "@mantine/notifications";

export function useImageUpload() {
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { validateImages } = useMessageValidation();

  const handlePhotoClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0 && validateImages(files, selectedImages)) {
      setSelectedImages((prev) => [...prev, ...files]);
    }
    // Reset the input value so the same file can be selected again
    e.target.value = "";
  };

  const handleRemoveImage = (index: number) => {
    setSelectedImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddImages = (files: File[]) => {
    if (validateImages(files, selectedImages)) {
      setSelectedImages((prev) => [...prev, ...files]);
    }
  };

  const uploadImages = async (images: File[]): Promise<string[]> => {
    const formData = new FormData();
    images.forEach((image) => {
      formData.append("images", image);
    });

    const response = await fetch(
      `${import.meta.env.VITE_API_BASE_URL}/media/upload-images`,
      {
        method: "POST",
        body: formData,
        credentials: "include",
      }
    );

    if (!response.ok) {
      try {
        const errorData = await response.json();
        const errorMessage = errorData.error || "Failed to upload images";

        notifications.show({
          title: "Upload Failed",
          message: errorMessage,
          color: "red",
          autoClose: 5000,
        });
      } catch (parseError) {
        notifications.show({
          title: "Upload Failed",
          message: "Failed to upload images",
          color: "red",
          autoClose: 5000,
        });
      }
      throw new Error("Failed to upload images");
    }

    const result = await response.json();
    return result.images;
  };

  const clearImages = () => {
    setSelectedImages([]);
  };

  return {
    selectedImages,
    fileInputRef,
    handlePhotoClick,
    handleFileChange,
    handleRemoveImage,
    handleAddImages,
    uploadImages,
    clearImages,
    setSelectedImages,
  };
}
