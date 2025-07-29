import { memo } from "react";
import type { UseFormRegister, FieldErrors, UseFormHandleSubmit } from "react-hook-form";
import { Button, Group } from "@mantine/core";
import FormField from "./FormField";
import type { ProfileUpdateForm } from "../../schemas/profileSchema";

interface ProfileFormProps {
  register: UseFormRegister<ProfileUpdateForm>;
  handleSubmit: UseFormHandleSubmit<ProfileUpdateForm>;
  errors: FieldErrors<ProfileUpdateForm>;
  onSubmit: (data: ProfileUpdateForm) => Promise<void>;
  onCancel: () => void;
  isUpdating: boolean;
}

export const ProfileForm = memo(({
  register,
  handleSubmit,
  errors,
  onSubmit,
  onCancel,
  isUpdating,
}: ProfileFormProps) => {
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          First Name
        </label>
        <FormField
          name="firstName"
          type="text"
          placeholder="Enter your first name"
          register={register}
          errors={errors}
          containerClassName="bg-gray-100 rounded p-3 flex items-center"
          inputClassName="w-full focus:outline-none bg-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Last Name
        </label>
        <FormField
          name="lastName"
          type="text"
          placeholder="Enter your last name"
          register={register}
          errors={errors}
          containerClassName="bg-gray-100 rounded p-3 flex items-center"
          inputClassName="w-full focus:outline-none bg-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Username
        </label>
        <FormField
          name="userName"
          type="text"
          placeholder="Enter your username"
          register={register}
          errors={errors}
          containerClassName="bg-gray-100 rounded p-3 flex items-center"
          inputClassName="w-full focus:outline-none bg-transparent"
        />
      </div>

      <div className="border-t pt-4">
        <h3 className="text-lg font-medium text-gray-900 mb-3">
          Change Password
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          Leave all password fields blank to keep your current password
        </p>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Current Password
            </label>
            <FormField
              name="currentPassword"
              type="password"
              placeholder="Enter your current password"
              register={register}
              errors={errors}
              containerClassName="bg-gray-100 rounded p-3 flex items-center"
              inputClassName="w-full focus:outline-none bg-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              New Password
            </label>
            <FormField
              name="newPassword"
              type="password"
              placeholder="Enter your new password"
              register={register}
              errors={errors}
              containerClassName="bg-gray-100 rounded p-3 flex items-center"
              inputClassName="w-full focus:outline-none bg-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirm New Password
            </label>
            <FormField
              name="confirmPassword"
              type="password"
              placeholder="Confirm your new password"
              register={register}
              errors={errors}
              containerClassName="bg-gray-100 rounded p-3 flex items-center"
              inputClassName="w-full focus:outline-none bg-transparent"
            />
          </div>
        </div>
      </div>

      <Group justify="flex-end" mt="md">
        <Button variant="light" onClick={onCancel} disabled={isUpdating}>
          Cancel
        </Button>
        <Button type="submit" loading={isUpdating}>
          Update Profile
        </Button>
      </Group>
    </form>
  );
});

ProfileForm.displayName = "ProfileForm";