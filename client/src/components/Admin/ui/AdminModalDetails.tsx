import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
export default function AdminModalDetails({
  title,
  message,
  color,
}: {
  title: string;
  message: string;
  color: "red" | "amber";
}) {
  const colorClasses = {
    red: { background: "bg-red-100", text: "text-red-600" },
    amber: { background: "bg-amber-100", text: "text-amber-600" },
  };
  return (
    <div className="flex flex-col items-center text-center space-y-3">
      <div className={`${colorClasses[color].background} rounded-full p-3`}>
        <ExclamationTriangleIcon
          className={`size-8 ${colorClasses[color].text}`}
        />
      </div>
      <div className="space-y-2">
        <h3 className="font-semibold text-gray-900">{title}</h3>
        <p className="text-sm text-gray-600">{message}</p>
      </div>
    </div>
  );
}
