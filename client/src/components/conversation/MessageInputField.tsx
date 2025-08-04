import type { UseFormRegister, FieldErrors } from "react-hook-form";
import type { MessageFormData } from "../../schemas/messageSchema";
import { FormField } from "../ui";

interface MessageInputFieldProps {
  register: UseFormRegister<MessageFormData>;
  errors: FieldErrors<MessageFormData>;
  hasBlockedUser: boolean;
  isBlockedByUser: boolean;
  onKeyDown: (e: React.KeyboardEvent) => void;
}

export function MessageInputField({
  register,
  errors,
  hasBlockedUser,
  isBlockedByUser,
  onKeyDown,
}: MessageInputFieldProps) {
  return (
    <div className="flex-1 mr-4">
      <FormField
        name="message"
        type="text"
        placeholder={
          hasBlockedUser || isBlockedByUser
            ? "You can no longer reply to this conversation"
            : "Aa"
        }
        register={register}
        errors={errors}
        containerClassName="bg-gray-200 rounded-2xl"
        inputClassName="w-full disabled:cursor-not-allowed focus:outline-none p-2 bg-transparent resize-none"
        showError={false}
        onKeyDown={onKeyDown}
        disabled={hasBlockedUser || isBlockedByUser}
      />
    </div>
  );
}