export default function VerifyEmail() {
  return (
    <main>
      <h1>Prediction Market</h1>
      <h2>Verify your email</h2>
      <p>Enter the 6-digit code sent to your email.</p>
      
      <form onSubmit={(event) => event.preventDefault()}>
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

        <button type="submit">Verify Email</button>
      </form>

      <p>
        Didn’t receive a code?{" "}
        <button type="button">Resend code</button>
      </p>
    </main>
  );
}