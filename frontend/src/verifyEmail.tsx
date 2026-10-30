import { useState } from "react";
import type { FormEvent } from "react";
import { verifyEmail, resendVerificationCode } from "./authAPI";
import "./auth.css";

// registration will pass the users id to this page.
type VerifyEmailProps = {
  uid: string;
};

// displays email verification form
export default function VerifyEmail({ uid }: VerifyEmailProps) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [message, setMessage] = useState("");
  // submit the code and display the API result
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!uid) {
      setError("Your account information is missing. Please return to registration.");
      return;
    }

    setIsLoading(true);

    try {
      await verifyEmail(uid, code);
      setIsVerified(true);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to verify your email. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  // request another verification code
  async function handleResend() {
    setError("");
    setMessage("");

    if (!uid) {
      setError("Your account information is missing. Please return to registration.");
      return;
    }

    setIsResending(true);

    try {
      await resendVerificationCode(uid);
      setMessage("A new code was requested. Please check your email.");
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to request a new code. Please try again.",
      );
    } finally {
      setIsResending(false);
    }
  }

  if (isVerified) {
    return (
      <main className="auth-page">
        <h1 className="auth-title">Prediction Market</h1>
        <h2 className="auth-heading">Email verified</h2>
        <p className="auth-description">
          Your email is verified. You can now log in.
        </p>
      </main>
    );
  }

  return (
    <main className="auth-page">
      {/* page title and verification instructions */}
      <h1 className="auth-title">Prediction Market</h1>
      <h2 className="auth-heading">Verify your email</h2>
      <p className="auth-description">
        Enter the 6-digit code sent to your email.
      </p>

      {/* submit the verification code to the API */}
      <form
        className="auth-form"
        onSubmit={handleSubmit}
      >
        <label htmlFor="verification-code">Verification code</label>
        <input
          id="verification-code"
          name="code"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]{6}"
          maxLength={6}
          required
          value={code}
          onChange={(event) => setCode(event.target.value)}
        />
        {error && (
          <p className="auth-error" role="alert">
            {error}
          </p>
        )}
        <button className="auth-submit" type="submit" disabled={isLoading || isResending}>
          {isLoading ? "Verifying..." : "Verify Email"}
        </button>
      </form>
      {/* request a new verification code */}
      <p className="auth-footer">
        Didn’t receive a code?{" "}
        <button 
          className="auth-link" 
          type="button" 
          onClick={handleResend} 
          disabled={isLoading || isResending}  
        >
          {isResending ? "Requesting..." : "Resend code"}
        </button>
      </p>
      {message && (
        <p className="auth-footer" role="status">
          {message}
        </p>
      )}
    </main>
  );
}