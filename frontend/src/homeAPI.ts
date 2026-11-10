type DailyClaimResult = {
  balance: number;
  amount: number;
  nextClaimAt: string;
};

// request daily coins for the logged-in user
export async function claimDailyCoins(): Promise<DailyClaimResult> {
  const token = sessionStorage.getItem("authToken");

  if (!token) {
    throw new Error("Please log in before claiming daily coins.");
  }

  const response = await fetch("/api/daily-claim", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (response.status === 401) {
    sessionStorage.removeItem("authToken");
    throw new Error("Your session has expired. Please log in again.");
  }

  if (response.status === 409) {
    throw new Error("You have already claimed your daily coins. Try again later.");
  }

  if (!response.ok) {
    throw new Error("Unable to claim daily coins. Please try again.");
  }

  const result = await response.json();

  // check the values needed by the Home page
  if (
    typeof result.balance !== "number" ||
    typeof result.amount !== "number" ||
    typeof result.nextClaimAt !== "string"
  ) {
    throw new Error("The server returned an unexpected daily-claim response.");
  }

  return {
    balance: result.balance,
    amount: result.amount,
    nextClaimAt: result.nextClaimAt,
  };
}