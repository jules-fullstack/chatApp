import { UserCircleIcon } from "@heroicons/react/24/outline";

export default function MessageTab() {
  return (
    <div className="flex pl-2 cursor-pointer hover:bg-gray-50">
      <UserCircleIcon className="size-16" />
      <div className="grid grid-rows-2 h-12 place-self-center">
        <h3 className="font-semibold">Sample Name</h3>
        <p className="text-gray-500">
          Lorem ipsum dolor sit amet consectetur adipisicing elit.
        </p>
      </div>
    </div>
  );
}
