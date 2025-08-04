import { formatTimeSeparator } from "../../utils/dateUtils";

interface TimestampSeparatorProps {
  timestamp: string;
}

export default function TimestampSeparator({
  timestamp,
}: TimestampSeparatorProps) {
  return (
    <div className="flex items-center justify-center my-4">
      <div className="px-3 py-1 bg-gray-100 text-gray-600 text-xs rounded-full font-medium">
        {formatTimeSeparator(timestamp)}
      </div>
    </div>
  );
}
