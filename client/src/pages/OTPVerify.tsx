import Button from "../components/ui/button";
import Head from "../components/ui/Head";
import AuthLayout from "../layouts/AuthLayout";
import { PinInput } from "@mantine/core";
import { useState, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { userStore } from "../store/userStore";

interface ApiResponse {
  message: string;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    userName: string;
    email: string;
    role: "user" | "superAdmin";
  };
}

export default function OTPVerify() {
  const [pin, setPin] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const setUser = userStore((state) => state.setUser);

  useEffect(() => {
    const pendingEmail = localStorage.getItem("pendingEmail");
    if (pendingEmail) {
      setEmail(pendingEmail);
    } else {
      navigate({ to: "/login", replace: true });
    }
  }, [navigate]);

  const handleSubmit = async () => {
    if (pin.length !== 6) {
      setError("Please enter a 6-digit OTP");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        "http://localhost:3000/api/auth/verify-otp",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            email,
            otp: pin,
          }),
        }
      );

      const result: ApiResponse = await response.json();

      if (response.ok && result.user) {
        setUser(result.user);
        localStorage.removeItem("pendingEmail");
        navigate({ to: "/dashboard", replace: true });
      } else {
        setError(result.message);
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Network error. Please try again.";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setLoading(true);
    setError("");

    try {
      setError(
        "Please wait for the current OTP to expire before requesting a new one."
      );
    } catch (error) {
      console.error(error);
      setError("Failed to resend OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <Head>Verify Your Email</Head>
      <h3 className="text-center text-gray-800 mb-4">
        We have sent an email to {email}. Please check your inbox and enter the
        code below
      </h3>

      <PinInput
        value={pin}
        onChange={setPin}
        type="number"
        length={6}
        size="lg"
        aria-label="One time code"
        className="my-8"
      />

      {error && <p className="text-red-900 text-center mb-4">{error}</p>}

      <Button
        onClick={handleSubmit}
        disabled={loading || pin.length !== 6}
        className="w-full mb-4"
      >
        {loading ? "Verifying..." : "Submit"}
      </Button>

      <button
        onClick={handleResendOTP}
        disabled={loading}
        className="w-full text-blue-600 hover:text-blue-800 underline"
      >
        Resend OTP
      </button>
    </AuthLayout>
  );
}
