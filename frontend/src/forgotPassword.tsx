import { useState } from "react";
import type { FormEvent } from "react";
import { requestPasswordResetCode } from "./authAPI";
import { useNavigate } from "react-router";
import "./auth.css";

// displays password-reset email form
export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  
  // request password reset code for the entered email
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const submittedEmail = email.trim();
      await requestPasswordResetCode(submittedEmail);
      navigate(`/reset-password?email=${encodeURIComponent(submittedEmail)}`);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to request a reset code. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="auth-page">
      {/* page title and reset instructions */}
      <h1 className="auth-title">Prediction Market</h1>
      <h2 className="auth-heading">Reset your password</h2>
      <p className="auth-description">
        Enter your account email to request a password-reset code.
      </p>

      <form
        className="auth-form"
        onSubmit={handleSubmit}
      >
        <label htmlFor="reset-email">Email</label>
        <input
          id="reset-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
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
          {isLoading ? "Requesting..." : "Send reset code"}
        </button>
      </form>
    </main>
  );
}