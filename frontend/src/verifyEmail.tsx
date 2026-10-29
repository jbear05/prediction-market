import "./auth.css";

// displays email verification form
export default function VerifyEmail() {
  return (
    <main className="auth-page">
      {/* page title and verification instructions */}
      <h1 className="auth-title">Prediction Market</h1>
      <h2 className="auth-heading">Verify your email</h2>
      <p className="auth-description">
        Enter the 6-digit code sent to your email.
      </p>

      {/* prevent page reload until API implemented */}
      <form
        className="auth-form"
        onSubmit={(event) => event.preventDefault()}
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
        />

        <button className="auth-submit" type="submit">
          Verify Email
        </button>
      </form>
      {/* API will be added later */}
      <p className="auth-footer">
        Didn’t receive a code?{" "}
        <button className="auth-link" type="button">
          Resend code
        </button>
      </p>
    </main>
  );
}