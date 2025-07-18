import { Modal } from "@mantine/core";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { useState, useEffect } from "react";

interface ImageModalProps {
  opened: boolean;
  onClose: () => void;
  images: string[];
  initialIndex?: number;
}

export default function ImageModal({
  opened,
  onClose,
  images,
  initialIndex = 0,
}: ImageModalProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex, opened]);

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") {
      goToNext();
    } else if (e.key === "ArrowLeft") {
      goToPrevious();
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  if (!opened || images.length === 0) return null;

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      size="90%"
      centered
      withCloseButton={false}
      styles={{
        content: { background: "transparent" },
        body: { padding: 0 },
        overlay: { backgroundColor: "rgba(0, 0, 0, 0.8)" },
      }}
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      <div className="relative flex items-center justify-center min-h-[80vh]">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 bg-black bg-opacity-50 text-white rounded-full p-2 cursor-pointer hover:bg-opacity-70 transition-all"
        >
          <XMarkIcon className="w-6 h-6" />
        </button>

        {/* Previous button */}
        {images.length > 1 && (
          <button
            onClick={goToPrevious}
            className="absolute left-4 z-10 bg-black bg-opacity-50 text-white rounded-full p-2 cursor-pointer hover:bg-opacity-70 transition-all"
          >
            <ChevronLeftIcon className="w-6 h-6" />
          </button>
        )}

        {/* Image */}
        <img
          src={images[currentIndex]}
          alt={`Image ${currentIndex + 1} of ${images.length}`}
          className="max-w-full max-h-[80vh] object-contain rounded-lg"
          onError={(e) => {
            console.error("Failed to load image:", images[currentIndex]);
            e.currentTarget.src =
              "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2Y1ZjVmNSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjE0IiBmaWxsPSIjOTk5IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+SW1hZ2UgZmFpbGVkIHRvIGxvYWQ8L3RleHQ+PC9zdmc+";
          }}
        />

        {/* Next button */}
        {images.length > 1 && (
          <button
            onClick={goToNext}
            className="absolute right-4 z-10 bg-black bg-opacity-50 text-white rounded-full p-2 cursor-pointer hover:bg-opacity-70 transition-all"
          >
            <ChevronRightIcon className="w-6 h-6" />
          </button>
        )}

        {/* Image counter */}
        {images.length > 1 && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-50 text-white px-3 py-1 rounded-full text-sm">
            {currentIndex + 1} of {images.length}
          </div>
        )}

        {/* Thumbnail navigation for multiple images */}
        {images.length > 1 && (
          <div className="absolute bottom-16 left-1/2 transform -translate-x-1/2 flex space-x-2 max-w-full overflow-x-auto px-4">
            {images.map((image, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden border-2 transition-all ${
                  index === currentIndex
                    ? "border-white"
                    : "border-transparent opacity-70 hover:opacity-100"
                }`}
              >
                <img
                  src={image}
                  alt={`Thumbnail ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
