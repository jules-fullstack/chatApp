import { Button, Head } from "../components/ui";
import AuthLayout from "../layouts/AuthLayout";
import { PinInput } from "@mantine/core";
import { useState, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { userStore } from "../store/userStore";
import { API_BASE_URL } from "../config";

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
  remainingAttempts?: number;
  timeUntilReset?: number;
}

export default function OTPVerify() {
  const [pin, setPin] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(
    null
  );
  const [timeUntilReset, setTimeUntilReset] = useState<number | null>(null);
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
      const response = await fetch(`${API_BASE_URL}/auth/verify-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          email,
          otp: pin,
        }),
      });

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
    setResendLoading(true);
    setError("");
    setSuccessMessage("");

    try {
      const response = await fetch(`${API_BASE_URL}/auth/resend-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          email,
        }),
      });

      const result: ApiResponse = await response.json();

      if (response.ok) {
        setError("");
        setSuccessMessage(result.message);
        setRemainingAttempts(result.remainingAttempts ?? null);
        setTimeout(() => {
          setSuccessMessage("");
        }, 5000);
      } else {
        setError(result.message);
        if (result.timeUntilReset) {
          setTimeUntilReset(result.timeUntilReset);
        }
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Network error. Please try again.";
      setError(errorMessage);
    } finally {
      setResendLoading(false);
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
        placeholder=""
        type="number"
        length={6}
        size="lg"
        aria-label="One time code"
        className="my-8"
      />

      {error && <p className="text-red-900 text-center mb-4">{error}</p>}
      {successMessage && (
        <p className="text-green-600 text-center mb-4">{successMessage}</p>
      )}

      <Button
        onClick={handleSubmit}
        disabled={loading || pin.length !== 6}
        className="w-full mb-4"
      >
        {loading ? "Verifying..." : "Submit"}
      </Button>

      <div className="text-center">
        {remainingAttempts !== null && (
          <p className="text-gray-600 text-sm mb-2">
            Remaining OTP resend attempts: {remainingAttempts}
          </p>
        )}
        <button
          onClick={handleResendOTP}
          disabled={loading || resendLoading || timeUntilReset !== null}
          className="w-full text-blue-600 hover:text-blue-800 hover:cursor-pointer underline disabled:cursor-not-allowed disabled:text-gray-400 disabled:no-underline"
        >
          {resendLoading ? "Sending..." : "Resend OTP"}
        </button>
        {timeUntilReset && (
          <p className="text-red-600 text-sm mt-2">
            Too many attempts. Try again in {Math.ceil(timeUntilReset / 60)}{" "}
            minutes.
          </p>
        )}
      </div>
    </AuthLayout>
  );
}
