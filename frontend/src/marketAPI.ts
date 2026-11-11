// fields used by the market cards and details popup
export type Market = {
  _id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  closesAt: string;
  poolYes: number;
  poolNo: number;
  totalPool: number;
  creatorId: string;
  creator?: {
    _id: string;
    displayName: string;
  };
};

export type MarketSearchResult = {
  results: Market[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

// retrieve one page of open markets
export async function searchMarkets(
  search: string,
  category: string,
  sort: string,
  page: number,
): Promise<MarketSearchResult> {
  const token = sessionStorage.getItem("authToken");

  if (!token) {
    throw new Error("Please log in to browse markets.");
  }

  const params = new URLSearchParams({
    q: search.trim(),
    status: "open",
    sort,
    page: String(page),
    limit: "6",
  });

  // an empty category means all categories
  if (category) {
    params.set("category", category);
  }

  const response = await fetch(`/api/questions?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (response.status === 401) {
    sessionStorage.removeItem("authToken");
    throw new Error("Your session has expired. Please log in again.");
  }

  if (!response.ok) {
    throw new Error("Unable to load markets. Please try again.");
  }

  const result = await response.json();

  // check the list and pagination values we need
  if (
    !Array.isArray(result.results) ||
    typeof result.page !== "number" ||
    typeof result.limit !== "number" ||
    typeof result.total !== "number" ||
    typeof result.totalPages !== "number"
  ) {
    throw new Error("The server returned an unexpected market response.");
  }

  return result;
}


type WagerResult = {
  balance: number;
  question: {
    _id: string;
    poolYes: number;
    poolNo: number;
  };
};

// submit a prediction using fictional coins
export async function placeMarketBet(
  questionId: string,
  side: "yes" | "no",
  amount: number,
): Promise<WagerResult> {
  const token = sessionStorage.getItem("authToken");

  if (!token) {
    throw new Error("Please log in before placing a bet.");
  }

  const response = await fetch(
    `/api/questions/${encodeURIComponent(questionId)}/place-wager`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ side, amount }),
    },
  );

  if (response.status === 401) {
    sessionStorage.removeItem("authToken");
    throw new Error("Your session has expired. Please log in again.");
  }

  // expected validation errors include a JSON error code
  if (response.status === 400 || response.status === 409) {
    const result = await response.json();

    if (result.error === "INSUFFICIENT_BALANCE") {
      throw new Error("Not enough coins for this bet.");
    }

    if (result.error === "QUESTION_NOT_OPEN") {
      throw new Error("This market is closed. No bet was placed.");
    }

    if (result.error === "INVALID_AMOUNT") {
      throw new Error("Enter a whole number of at least 1 coin.");
    }

    throw new Error("Unable to place this bet. Please check your entries.");
  }

  if (!response.ok) {
    throw new Error(
      "Unable to confirm your bet. Check My Bets before trying again.",
    );
  }

  const result = await response.json();

  if (
    typeof result.balance !== "number" ||
    typeof result.question?._id !== "string" ||
    typeof result.question?.poolYes !== "number" ||
    typeof result.question?.poolNo !== "number"
  ) {
    throw new Error(
      "The server returned an unexpected response. Check My Bets before trying again.",
    );
  }

  return {
    balance: result.balance,
    question: result.question,
  };
}