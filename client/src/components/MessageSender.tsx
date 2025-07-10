import { PhotoIcon } from "@heroicons/react/24/outline";
import { HandThumbUpIcon } from "@heroicons/react/24/solid";
import { useForm } from "react-hook-form";
import FormField from "./ui/FormField";

interface MessageFormData {
  message: string;
}

export default function MessageSender() {
  const {
    register,
    formState: { errors },
  } = useForm<MessageFormData>();

  return (
    <div className="absolute bottom-0 w-full flex items-center p-4">
      <PhotoIcon className="size-6 mr-6 cursor-pointer" />
      <div className="flex-1 mr-6">
        <FormField
          name="message"
          type="text"
          placeholder="Aa"
          register={register}
          errors={errors}
          containerClassName="bg-gray-200 p-2 rounded-2xl"
          inputClassName="w-[95%] focus:outline-none ml-2"
          showError={false}
        />
      </div>
      <HandThumbUpIcon className="size-6 rounded-full cursor-pointer hover:bg-gray-200" />
    </div>
  );
}
