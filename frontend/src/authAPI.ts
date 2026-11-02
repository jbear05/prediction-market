// send email and verification code to API
export async function verifyEmail(email: string, authCode: string) {
  const response = await fetch("/api/verify", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({email, authCode}),
  });

  if (!response.ok) {
    throw new Error(
      response.status === 400 ? "This code is invalid or has expired." : "Unable to verify your email. Please try again.",);
  }

  const result = await response.json();

  if (result.success !== true) {
    throw new Error("Unable to verify your email. Please try again.");
  }
}

// request a new verification code for user
export async function resendVerificationCode(email: string) {
  const response = await fetch("/api/verify/resend", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({email}),
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
  const response = await fetch("/api/password/reset", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({email}),
  });

  if (!response.ok) {
    throw new Error("Unable to request a reset code. Please try again.");
  }

  const result = await response.json();

  if (result.success !== true) {
    throw new Error("Unable to request a reset code. Please try again.");
  }
}

// submit the reset code and new password
export async function resetPassword(email: string, authCode: string, newPassword: string) {
  const response = await fetch("/api/password/update", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({email, authCode, newPassword}),
  });

  if (!response.ok) {
    throw new Error(response.status === 400 ? "This code is invalid or has expired." : "Unable to reset your password. Please try again.");
  }

  const result = await response.json();

  if (result.success !== true) {
    throw new Error("Unable to reset your password. Please try again.");
  }
}

export async function login(email: string, password: string) {
  const response = await fetch("/api/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },    
    body: JSON.stringify({ email: email.trim(), rawPassword: password }),
  });
 
  // unverified accounts recieve HTTP 403
  if(response.status === 403) {
    const result = await response.json();

    if(result.error === "EMAIL_NOT_VERIFIED") {
      return {
        needVerification: true,
        userId: "",
        token: ""
      };
    }
    
    throw new Error("Unable to log in. Please try again.")
  }


  if (!response.ok) {
    throw new Error(
      response.status >= 500
        ? "Unable to reach the server. Please try again."
        : "Incorrect email or password.",
    );
  }
 
  const result = await response.json();
 
  if (typeof result.userId !== "string" || typeof result.token !== "string") {
    throw new Error("Incorrect email or password.");
  }
 
  return {
    needVerification: false, 
    userId: result.userId,
    token: result.token
  };
}
 
export async function register(
  email: string,
  displayName: string,
  password: string,
) {
  const response = await fetch("/api/register", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email: email.trim(), displayName, rawPassword: password }),
  });
 
  if (!response.ok) {
    throw new Error(
      response.status >= 500
        ? "Unable to reach the server. Please try again."
        : "Unable to create your account. That email or display name may already be in use.",
    );
  }
 
  const result = await response.json();
 
  if (typeof result.userId !== "string") {
    throw new Error(
      "Unable to create your account. That email or display name may already be in use.",
    );
  }
 
  return {userId: result.userId}
}

