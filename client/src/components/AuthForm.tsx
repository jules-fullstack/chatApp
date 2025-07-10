// client/src/components/AuthForm.tsx
import { type ReactNode } from "react";
import {
  type FieldValues,
  type UseFormHandleSubmit,
  type SubmitHandler,
} from "react-hook-form";
import Button from "./ui/button";

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
      <Button>{submitLabel}</Button>
    </form>
  );
}
