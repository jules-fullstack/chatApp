import {
  type UseFormRegister,
  type FieldErrors,
  type FieldValues,
  type Path,
} from "react-hook-form";

import { type ReactNode } from "react";

interface FormFieldProps<T extends FieldValues> {
  name: Path<T>;
  type: string;
  placeholder: string;
  register: UseFormRegister<T>;
  errors: FieldErrors<T>;
  validation?: object;
  containerClassName?: string;
  inputClassName?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  showError?: boolean;
}

export default function FormField<T extends FieldValues>({
  name,
  type,
  placeholder,
  register,
  errors,
  validation = {},
  containerClassName = "bg-gray-100 rounded p-2",
  inputClassName = "w-full focus:outline-none",
  leftIcon,
  rightIcon,
  showError = true,
}: FormFieldProps<T>) {
  const error = errors[name];
  return (
    <div>
      <div className={`flex items-center ${containerClassName}`}>
        {leftIcon && <div className="mr-2">{leftIcon}</div>}
        <input
          type={type}
          placeholder={placeholder}
          {...register(name, validation)}
          className={inputClassName}
        />
        {rightIcon && <div className="ml-2">{rightIcon}</div>}
      </div>
      {showError && error && (
        <p className="text-red-900 mt-1">{String(error.message)}</p>
      )}
    </div>
  );
}
