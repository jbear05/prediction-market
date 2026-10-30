import { useState } from "react";
import type { FormEvent } from "react";
import { resetPassword } from "./authAPI";
import "./auth.css";

// the reset request page will pass the submitted email
type ResetPasswordProps = {
  email: string;
};

// dispays form for resetting user password
export default function ResetPassword({ email }: ResetPasswordProps) {  
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isReset, setIsReset] = useState(false);

  // validate the password then submit the reset request
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("Email is missing. Please request a new code.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsLoading(true);

    try {
      await resetPassword(email.trim(), code, password);
      setIsReset(true);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to reset your password. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  if (isReset) {
    return (
      <main className="auth-page">
        <h1 className="auth-title">Prediction Market</h1>
        <h2 className="auth-heading">Password reset</h2>
        <p className="auth-description">
          Your password has been reset. You can now log in with your new password.
        </p>
      </main>
    );
  }

  return (
    <main className="auth-page">
      <h1 className="auth-title">Prediction Market</h1>
      <h2 className="auth-heading">Choose a new password</h2>
      <p className="auth-description">
        Enter the code sent to your email and choose a new password.
      </p>

      {/* submit new password and reset code */}
      <form
        className="auth-form"
        onSubmit={handleSubmit}
      >
        <label htmlFor="reset-code">Reset code</label>
        <input
          id="reset-code"
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

        {/* new password and confirmation */}
        <label htmlFor="new-password">New password</label>
        <input
          id="new-password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />

        <label htmlFor="confirm-password">Confirm new password</label>
        <input
          id="confirm-password"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
        />

        {error && (
          <p className="auth-error" role="alert">
            {error}
          </p>
        )}

        <button 
          className="auth-submit" 
          type="submit"
          disabled={isLoading}
        >
          {isLoading ? "Resetting..." : "Reset Password"}
        </button>
      </form>
    </main>
  );
}