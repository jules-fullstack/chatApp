import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { useForm } from "react-hook-form";
import FormField from "./ui/FormField";

interface SearchFormData {
  search: string;
}

export default function SearchBar() {
  const {
    register,
    formState: { errors },
  } = useForm<SearchFormData>();

  return (
    <div className="flex justify-center">
      <div className="w-[95%]">
        <FormField
          name="search"
          type="text"
          placeholder="Search"
          register={register}
          errors={errors}
          containerClassName="bg-gray-200 p-2 rounded-2xl"
          inputClassName="w-[95%] focus:outline-none ml-2"
          leftIcon={<MagnifyingGlassIcon className="size-6 text-gray-400" />}
          showError={false}
        />
      </div>
    </div>
  );
}
