// client/src/components/AuthForm.tsx
import { type ReactNode } from "react";
import {
  type FieldValues,
  type UseFormHandleSubmit,
  type SubmitHandler,
} from "react-hook-form";

interface AuthFormProps<T extends FieldValues> {
  onSubmit: SubmitHandler<T>;
  handleSubmit: UseFormHandleSubmit<T>;
  children: ReactNode;
  submitLabel: string;
}

export default function AuthForm<T extends FieldValues>({
  onSubmit,
  handleSubmit,
  children,
  submitLabel,
}: AuthFormProps<T>) {
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      {children}
      <button
        type="submit"
        className="p-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
      >
        {submitLabel}
      </button>
    </form>
  );
}
