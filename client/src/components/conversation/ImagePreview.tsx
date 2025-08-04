import { XMarkIcon, DocumentPlusIcon } from "@heroicons/react/24/outline";
import { useRef } from "react";

interface ImagePreviewProps {
  images: File[];
  onRemoveImage: (index: number) => void;
  onAddImages: (files: File[]) => void;
  maxFiles: number;
  maxTotalSize: number;
  isSubmitting?: boolean;
}

export default function ImagePreview({
  images,
  onRemoveImage,
  onAddImages,
  maxFiles,
  maxTotalSize,
}: ImagePreviewProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAddClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      onAddImages(files);
    }
    // Reset the input value so the same file can be selected again
    e.target.value = "";
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getTotalSize = (): number => {
    return images.reduce((total, image) => total + image.size, 0);
  };

  const isAtMaxFiles = images.length >= maxFiles;
  const totalSize = getTotalSize();
  const isOverSizeLimit = totalSize > maxTotalSize;

  if (images.length === 0) return null;

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700">
          Images ({images.length}/{maxFiles})
        </span>
        <span
          className={`text-xs ${isOverSizeLimit ? "text-red-500" : "text-gray-500"}`}
        >
          {formatFileSize(totalSize)} / {formatFileSize(maxTotalSize)}
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        {images.map((image, index) => (
          <div key={index} className="relative group">
            <img
              src={URL.createObjectURL(image)}
              alt={`Preview ${index + 1}`}
              className="w-16 h-16 object-cover rounded-lg border"
            />
            <button
              onClick={() => onRemoveImage(index)}
              className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <XMarkIcon className="w-3 h-3" />
            </button>
          </div>
        ))}

        {!isAtMaxFiles && (
          <button
            onClick={handleAddClick}
            className="w-16 h-16 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center hover:border-gray-400 transition-colors"
          >
            <DocumentPlusIcon className="w-6 h-6 text-gray-400" />
          </button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}
