import { type ReactNode, useState } from "react";
import {
  type FieldValues,
  type UseFormHandleSubmit,
  type SubmitHandler,
} from "react-hook-form";
import { Button } from "../ui";
import { Loader } from "@mantine/core";

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
  const [isLoading, setIsLoading] = useState(false);

  const handleFormSubmit = handleSubmit(async (data) => {
    try {
      setIsLoading(true);
      await onSubmit(data);
    } finally {
      setIsLoading(false);
    }
  });

  return (
    <form onSubmit={handleFormSubmit} className="flex flex-col gap-4">
      {children}
      <Button>{isLoading ? <Loader size="xs" /> : submitLabel}</Button>
    </form>
  );
}
