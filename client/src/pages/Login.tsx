import { useForm, type SubmitHandler } from "react-hook-form";
import { useNavigate } from "@tanstack/react-router";
import { API_BASE_URL } from "../config";
import AuthLayout from "../layouts/AuthLayout";
import { AuthForm, AuthLink } from "../components/auth";
import { FormField, Head } from "../components/ui";
import { userStore } from "../store/userStore";

interface LoginInputs {
  email: string;
  password: string;
}

interface ApiResponse {
  message: string;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    userName: string;
    email: string;
    role: "user" | "superAdmin";
    avatar?: string;
  };
}

export default function Login() {
  const navigate = useNavigate();
  const setUser = userStore((state) => state.setUser);
  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<LoginInputs>();

  const onSubmit: SubmitHandler<LoginInputs> = async (data) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(data),
      });

      const result: ApiResponse = await response.json();

      if (response.ok) {
        if (result.user) {
          setUser(result.user);
          navigate({ to: "/dashboard", replace: true });
        }
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
      <Head>
        Echo helps you stay close to the people who matter, share real moments,
        and spark lasting connections.
      </Head>

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
        text="New to Echo? Click"
        linkText="here to register"
      />
    </AuthLayout>
  );
}
