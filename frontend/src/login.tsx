import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { login } from "./authAPI";
import "./auth.css";

// displays login form
export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  // true while waiting on the server, so the button can't be clicked twice
  const [submitting, setSubmitting] = useState(false);

  const navigate = useNavigate();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const result = await login(email, password);

      if (result.needVerification) {
        // account exists but the email isn't verified yet
        navigate(`/verify-email?uid=${result.uid}`);
      } else {
        navigate("/");
      }
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to log in. Please try again.",
      );
    } finally {
      // runs after success, failure, or a thrown error
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <h1 className="auth-title">Prediction Market</h1>
      <h2 className="auth-heading">Log in</h2>

      <form className="auth-form" onSubmit={handleSubmit}>
        <label htmlFor="login-email">Email</label>
        <input
          id="login-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />

        <label htmlFor="login-password">Password</label>
        <input
          id="login-password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />

        {error && (
          <p className="auth-error" role="alert">
            {error}
          </p>
        )}

        <button className="auth-submit" type="submit" disabled={submitting}>
          {submitting ? "Logging in…" : "Log In"}
        </button>
      </form>

      <p className="auth-footer">
        <Link className="auth-link" to="/forgot-password">
          Forgot password?
        </Link>
      </p>
      <p className="auth-footer">
        New here?{" "}
        <Link className="auth-link" to="/register">
          Create an account
        </Link>
      </p>
    </main>
  );
}
