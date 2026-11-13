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

async function getHomeData(path: string, failureMessage: string): Promise<unknown> {
  const token = sessionStorage.getItem("authToken");

  if (!token) {
    throw new Error("Please log in to view your account.");
  }

  const response = await fetch(path, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (response.status === 401) {
    sessionStorage.removeItem("authToken");
    throw new Error("Your session has expired. Please log in again.");
  }

  if (!response.ok) {
    throw new Error(failureMessage);
  }

  return response.json();
}

export async function getBalance() {
  const result = await getHomeData("/api/balance", "Unable to load your balance.");

  if (!result || typeof result !== "object" ||
      !("balance" in result) || typeof result.balance !== "number") {
    throw new Error("The server returned an invalid balance.");
  }

  return result.balance;
}

export async function getDailyClaimStatus() {
  const result = await getHomeData(
    "/api/daily-claim",
    "Unable to load your daily claim status.",
  );

  if (!result || typeof result !== "object" ||
      !("nextClaimAt" in result) || typeof result.nextClaimAt !== "string" ||
      !("claimEligible" in result) || typeof result.claimEligible !== "boolean") {
    throw new Error("The server returned an invalid daily claim status.");
  }

  return {
    nextClaimAt: result.nextClaimAt,
    claimEligible: result.claimEligible,
  };
}


export type Wager = {
  wagerId: string;
  side: "yes" | "no";
  amount: number;
  payout: number | null;
  createdAt: string;
  outcome: "undecided" | "correct" | "incorrect";
  question: {
    questionId: string;
    title: string;
    description: string;
    category: string;
    status: string;
    closesAt: string;
    poolYes: number;
    poolNo: number;
    outcome: "yes" | "no" | null;
  };
};

export async function getWagers(): Promise<Wager[]> {
  const result = await getHomeData("/api/wagers", "Unable to load your bets.");

  if (!Array.isArray(result)) {
    throw new Error("The server returned an invalid bets list.");
  }

  return result as Wager[];
}


type NewMarket = {
  title: string;
  description: string;
  closesAt: string;
  category: string;
};

export async function submitMarket(market: NewMarket): Promise<void> {
  const token = sessionStorage.getItem("authToken");

  if (!token) {
    throw new Error("Please log in to create a market.");
  }

  const response = await fetch("/api/questions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(market),
  });

  if (response.status === 401) {
    sessionStorage.removeItem("authToken");
    sessionStorage.removeItem("authRole");
    throw new Error("Your session has expired. Please log in again.");
  }

  if (response.status !== 201) {
    const error = await response.json().catch(() => null);
    throw new Error(
      typeof error?.message === "string"
        ? error.message
        : "Unable to submit your market. Please try again.",
    );
  }
}