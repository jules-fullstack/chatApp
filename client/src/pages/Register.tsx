import { useForm, type SubmitHandler } from "react-hook-form";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { API_BASE_URL } from "../config";
import AuthLayout from "../layouts/AuthLayout";
import AuthForm from "../components/AuthForm";
import FormField from "../components/ui/FormField";
import AuthLink from "../components/AuthLink";
import Head from "../components/ui/Head";

interface RegisterInputs {
  email: string;
  firstName: string;
  lastName: string;
  userName: string;
  password: string;
  confirmPassword: string;
}

interface ApiResponse {
  message: string;
  user?: {
    id: string;
    email: string;
  };
}

export default function Register() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/register" });
  const [invitationInfo, setInvitationInfo] = useState<{
    groupName?: string;
    inviterName?: string;
  } | null>(null);
  const [invitationError, setInvitationError] = useState<string | null>(null);

  // Get invitation token from search parameters
  const invitationToken = search.invitation;

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    setError,
  } = useForm<RegisterInputs>();

  // Check invitation token on component mount
  useEffect(() => {
    const checkInvitation = async () => {
      if (invitationToken) {
        try {
          const response = await fetch(
            `${API_BASE_URL}/auth/check-invitation?token=${invitationToken}`,
            {
              credentials: "include",
            }
          );

          if (response.ok) {
            const data = await response.json();
            setInvitationInfo({
              groupName: data.groupName,
              inviterName: data.inviterName,
            });
          } else {
            const error = await response.json();
            setInvitationError(error.message || "Invalid invitation link");
          }
        } catch {
          setInvitationError("Failed to validate invitation");
        }
      }
    };

    checkInvitation();
  }, [invitationToken]);

  const onSubmit: SubmitHandler<RegisterInputs> = async (data) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          firstName: data.firstName,
          lastName: data.lastName,
          userName: data.userName,
          email: data.email,
          password: data.password,
          invitationToken: invitationToken,
        }),
      });

      const result: ApiResponse = await response.json();

      if (response.ok) {
        localStorage.setItem("pendingEmail", data.email);
        navigate({ to: "/verify", replace: true });
      } else {
        setError("root", { message: result.message });
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Network error. Please try again.";
      setError("root", { message: errorMessage });
    }
  };

  return (
    <AuthLayout>
      <Head>Register for ChatApp</Head>

      {invitationInfo && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>{invitationInfo.inviterName}</strong> has invited you to
            join the group chat <strong>"{invitationInfo.groupName}"</strong>.
            Complete your registration to automatically join the group.
          </p>
        </div>
      )}

      {invitationError && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800">{invitationError}</p>
        </div>
      )}

      <AuthForm
        onSubmit={onSubmit}
        handleSubmit={handleSubmit}
        submitLabel={invitationInfo ? "Register & Join Group" : "Register"}
      >
        <div className="flex gap-4">
          <FormField
            name="firstName"
            type="text"
            placeholder="First Name"
            register={register}
            errors={errors}
            validation={{ required: "First Name is required." }}
          />

          <FormField
            name="lastName"
            type="text"
            placeholder="Last Name"
            register={register}
            errors={errors}
            validation={{ required: "Last Name is required." }}
          />
        </div>

        <FormField
          name="email"
          type="email"
          placeholder="Email"
          register={register}
          errors={errors}
          validation={{ required: "Email is required." }}
        />

        <FormField
          name="userName"
          type="text"
          placeholder="Username"
          register={register}
          errors={errors}
          validation={{ required: "Username is required." }}
        />

        <FormField
          name="password"
          type="password"
          placeholder="Password"
          register={register}
          errors={errors}
          validation={{ required: "Password is required" }}
        />

        <FormField
          name="confirmPassword"
          type="password"
          placeholder="Confirm Password"
          register={register}
          errors={errors}
          validation={{
            required: "Password is required",
            validate: (val: string) => {
              if (watch("password") !== val) {
                return "Your passwords do not match";
              }
            },
          }}
        />

        {errors.root && <p className="text-red-900">{errors.root.message}</p>}
      </AuthForm>

      <AuthLink
        to="/login"
        text="Already have an account?"
        linkText="Login here"
      />
    </AuthLayout>
  );
}
