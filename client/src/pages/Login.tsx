import { useForm, type SubmitHandler } from "react-hook-form";
import { useNavigate } from "@tanstack/react-router";
import AuthLayout from "../layouts/AuthLayout";
import AuthForm from "../components/AuthForm";
import FormField from "../components/ui/FormField";
import AuthLink from "../components/AuthLink";
import Head from "../components/ui/Head";

interface LoginInputs {
  email: string;
  password: string;
}

interface ApiResponse {
  message: string;
  user?: {
    id: string;
    email: string;
  };
}

export default function Login() {
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<LoginInputs>();

  const onSubmit: SubmitHandler<LoginInputs> = async (data) => {
    try {
      const response = await fetch("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(data),
      });

      const result: ApiResponse = await response.json();

      if (response.ok) {
        // Store email in localStorage for OTP verification
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
      <Head>Welcome to ChatApp</Head>

      <AuthForm
        onSubmit={onSubmit}
        handleSubmit={handleSubmit}
        submitLabel="Login"
      >
        <FormField
          name="email"
          type="email"
          placeholder="Email"
          register={register}
          errors={errors}
          validation={{ required: "Email is required." }}
        />

        <FormField
          name="password"
          type="password"
          placeholder="Password"
          register={register}
          errors={errors}
          validation={{ required: "Password is required" }}
        />

        {errors.root && <p className="text-red-900">{errors.root.message}</p>}
      </AuthForm>

      <AuthLink
        to="/register"
        text="New to ChatApp? Click"
        linkText="here to register"
      />
    </AuthLayout>
  );
}
