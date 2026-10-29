import { useState } from "react";
import type { FormEvent } from "react";
import "./auth.css";

// displays login form
export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    // connect login API here
  }

  return (
    <main className="auth-page">
      <h1 className="auth-title">Prediction Market</h1>
      <h2 className="auth-heading">Log in</h2>

      {/* API added later */}
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

        {/* shows wrong email/password once the API is connected */}
        {error && (
          <p className="auth-error" role="alert">
            {error}
          </p>
        )}

        <button className="auth-submit" type="submit">
          Log In
        </button>
      </form>

      {/* swap <a> for react-router's <Link> once routing is added */}
      <p className="auth-footer">
        <a className="auth-link" href="/forgot-password">
          Forgot password?
        </a>
      </p>
      <p className="auth-footer">
        New here?{" "}
        <a className="auth-link" href="/register">
          Create an account
        </a>
      </p>
    </main>
  );
}
