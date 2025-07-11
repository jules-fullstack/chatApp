import { MagnifyingGlassIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useForm } from "react-hook-form";
import FormField from "./ui/FormField";
import useUserSearchStore from "../store/userSearchStore";
import useDebounce from "../hooks/useDebounce";
import { useEffect } from "react";

interface SearchFormData {
  search: string;
}

export default function SearchBar() {
  const {
    register,
    formState: { errors },
    watch,
    setValue,
  } = useForm<SearchFormData>();

  const searchQuery = watch("search", "");
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  const { setSearchQuery, clearSearch, isSearchActive } = useUserSearchStore();

  useEffect(() => {
    setSearchQuery(debouncedSearchQuery);
  }, [debouncedSearchQuery, setSearchQuery]);

  const handleClearSearch = () => {
    setValue("search", "");
    clearSearch();
  };

  const showClearButton = isSearchActive && searchQuery.trim().length > 0;

  return (
    <div className="flex justify-center">
      <div className="w-[95%] relative">
        <FormField
          name="search"
          type="text"
          placeholder="Search users..."
          register={register}
          errors={errors}
          containerClassName="bg-gray-200 p-2 rounded-2xl"
          inputClassName="w-[95%] focus:outline-none ml-2 pr-8"
          leftIcon={<MagnifyingGlassIcon className="size-6 text-gray-400" />}
          showError={false}
        />
        {showClearButton && (
          <button
            type="button"
            onClick={handleClearSearch}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="size-5" />
          </button>
        )}
      </div>
    </div>
  );
}
