// send user id and verification code to API
export async function verifyEmail(uid: string, authCode: string) {
  const response = await fetch("/api/verifyUser", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ uid, authCode }),
  });

  if (!response.ok) {
    throw new Error("Unable to verify your email. Please try again.");
  }

  const result = await response.json();

  if (result.success !== true || result.data?.success !== true) {
    throw new Error("This code is invalid or has expired.");
  }
}

// request a new verification code for user
export async function resendVerificationCode(uid: string) {
  const response = await fetch("/api/newVerificationCode", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ uid }),
  });

  if (!response.ok) {
    throw new Error("Unable to request a new code. Please try again.");
  }

  const result = await response.json();

  if (result.success !== true) {
    throw new Error("Unable to request a new code. Please try again.");
  }
}

// request password reset code for the users email
export async function requestPasswordResetCode(email: string) {
  const response = await fetch("/api/getpasswordCode", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email }),
  });

  if (!response.ok) {
    throw new Error("Unable to request a reset code. Please try again.");
  }

  const result = await response.json();

  if (result.success !== true || result.data?.success !== true) {
    throw new Error("Unable to request a reset code. Please try again.");
  }
}

// submit the reset code and new password
export async function resetPassword(
  email: string,
  authCode: string,
  newPassword: string,
) {
  const response = await fetch("/api/passwordReset", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, authCode, newPassword }),
  });

  if (!response.ok) {
    throw new Error("Unable to reset your password. Please try again.");
  }

  const result = await response.json();

  if (result.success !== true || result.data?.success !== true) {
    throw new Error("This code is invalid or has expired.");
  }
}