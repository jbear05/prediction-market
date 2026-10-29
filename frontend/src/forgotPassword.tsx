import { useState } from "react";
import "./auth.css";

// displays password-reset email form
export default function ForgotPassword() {
  const [email, setEmail] = useState("");

  return (
    <main className="auth-page">
      {/* page title and reset instructions */}
      <h1 className="auth-title">Prediction Market</h1>
      <h2 className="auth-heading">Reset your password</h2>
      <p className="auth-description">
        Enter your account email to request a password-reset code.
      </p>

      {/* API will be added later */}
      <form
        className="auth-form"
        onSubmit={(event) => event.preventDefault()}
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

        <button className="auth-submit" type="submit">
          Send reset code
        </button>
      </form>
    </main>
  );
}