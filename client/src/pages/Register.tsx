import { useForm, type SubmitHandler } from "react-hook-form";
import { useNavigate } from "@tanstack/react-router";
import AuthLayout from "../layouts/AuthLayout";
import AuthForm from "../components/AuthForm";
import FormField from "../components/FormField";
import AuthLink from "../components/AuthLink";

interface RegisterInputs {
  email: string;
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
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    setError
  } = useForm<RegisterInputs>();

  const onSubmit: SubmitHandler<RegisterInputs> = async (data) => {
    try {
      const response = await fetch('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          email: data.email,
          password: data.password
        }),
      });

      const result: ApiResponse = await response.json();

      if (response.ok) {
        navigate({ to: '/dashboard', replace: true });
      } else {
        setError('root', { message: result.message });
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Network error. Please try again.';
      setError('root', { message: errorMessage });
    }
  };

  return (
    <AuthLayout>
      <h2 className="text-gray-800 text-4xl/12 font-bold text-center mb-4">
        Register for ChatApp
      </h2>

      <AuthForm
        onSubmit={onSubmit}
        handleSubmit={handleSubmit}
        submitLabel="Register"
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
        
        {errors.root && (
          <p className="text-red-900">{errors.root.message}</p>
        )}
      </AuthForm>

      <AuthLink
        to="/login"
        text="Already have an account?"
        linkText="Login here"
      />
    </AuthLayout>
  );
}