import {
  type UseFormRegister,
  type FieldErrors,
  type FieldValues,
  type Path,
} from "react-hook-form";

interface FormFieldProps<T extends FieldValues> {
  name: Path<T>;
  type: string;
  placeholder: string;
  register: UseFormRegister<T>;
  errors: FieldErrors<T>;
  validation?: object;
}

export default function FormField<T extends FieldValues>({
  name,
  type,
  placeholder,
  register,
  errors,
  validation = {},
}: FormFieldProps<T>) {
  const error = errors[name];
  return (
    <div>
      <input
        type={type}
        placeholder={placeholder}
        {...register(name, validation)}
        className="p-2 w-full bg-gray-100 rounded"
      />
      {error && <p className="text-red-900">{String(error.message)}</p>}
    </div>
  );
}
