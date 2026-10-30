import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { register } from "./authAPI";
import "./auth.css";

// same rules as displayName in backend/models/User.js
const DISPLAY_NAME_PATTERN = /^[A-Za-z0-9_]{3,30}$/;
// placeholder until the team agrees on a rule; the backend should enforce the same one
const MIN_PASSWORD_LENGTH = 8;

// displays account registration form
export default function Register() {
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [error, setError] = useState("");
  // true while waiting on the server, so one click can't create two accounts
  const [submitting, setSubmitting] = useState(false);

  const navigate = useNavigate();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!DISPLAY_NAME_PATTERN.test(displayName)) {
      setError(
        "Display name must be 3–30 characters: letters, numbers, and underscores only.",
      );
      return;
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setError("");
    setSubmitting(true);

    try {
      const result = await register(email, displayName, password);

      // the verification code was emailed; that page needs the uid to check it
      navigate(`/verify-email?uid=${result.uid}`);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to create your account. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <h1 className="auth-title">Prediction Market</h1>
      <h2 className="auth-heading">Create an account</h2>

      <form className="auth-form" onSubmit={handleSubmit}>
        <label htmlFor="register-email">Email</label>
        <input
          id="register-email"
          name="email"
          type="email"
          autoComplete="email"
          maxLength={254}
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />

        {/* public name on questions and leaderboards, not used to log in */}
        <label htmlFor="register-display-name">Display name</label>
        <input
          id="register-display-name"
          name="displayName"
          type="text"
          autoComplete="username"
          minLength={3}
          maxLength={30}
          required
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
        />

        <label htmlFor="register-password">Password</label>
        <input
          id="register-password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={MIN_PASSWORD_LENGTH}
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />

        <label htmlFor="register-confirm-password">Confirm password</label>
        <input
          id="register-confirm-password"
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

        <button className="auth-submit" type="submit" disabled={submitting}>
          {submitting ? "Creating account…" : "Create Account"}
        </button>
      </form>

      <p className="auth-footer">
        Already have an account?{" "}
        <Link className="auth-link" to="/login">
          Log in
        </Link>
      </p>
    </main>
  );
}
