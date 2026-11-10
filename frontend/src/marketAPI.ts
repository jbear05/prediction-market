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