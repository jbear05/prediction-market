import type { Market, MarketSearchResult } from "./marketAPI";

// thrown when the saved login no longer works, so the page can send the user to log in
export class SessionExpiredError extends Error {}

// thrown when the question left the queue some other way (for example another
// admin handled it first), so the page can drop its card
export class AlreadyHandledError extends Error {}

function getToken() {
  const token = sessionStorage.getItem("authToken");

  if (!token) {
    throw new SessionExpiredError("Please log in again.");
  }

  return token;
}

function clearSession() {
  sessionStorage.removeItem("authToken");
  sessionStorage.removeItem("authRole");
}

// a question as the admin queues show it, plus when it was submitted
export type AdminQuestion = Market & { createdAt?: string };

export type AdminQuestionPage = Omit<MarketSearchResult, "results"> & {
  results: AdminQuestion[];
};

// which queue to load: submissions waiting for review, or markets waiting for a result
export type AdminQueue = "pending" | "closed";

// retrieve one page of a queue, oldest closing time first
export async function getAdminQuestions(
  queue: AdminQueue,
  page: number,
): Promise<AdminQuestionPage> {
  const params = new URLSearchParams({
    status: queue,
    sort: "closing",
    page: String(page),
    limit: "10",
  });

  const response = await fetch(`/api/questions?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${getToken()}`,
    },
  });

  if (response.status === 401) {
    clearSession();
    throw new SessionExpiredError("Your session has expired. Please log in again.");
  }

  if (!response.ok) {
    throw new Error("Unable to load questions. Please try again.");
  }

  const result = await response.json();

  if (
    !Array.isArray(result.results) ||
    typeof result.page !== "number" ||
    typeof result.total !== "number" ||
    typeof result.totalPages !== "number"
  ) {
    throw new Error("The server returned an unexpected response.");
  }

  return result;
}

// sends an admin action and turns the expected failures into readable errors
async function postAdminAction(path: string, body?: unknown) {
  const response = await fetch(path, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getToken()}`,
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (response.status === 401) {
    clearSession();
    throw new SessionExpiredError("Your session has expired. Please log in again.");
  }

  if (response.status === 403) {
    throw new Error("Your account doesn't have admin access.");
  }

  // expected failures include a JSON error code
  if (response.status === 404 || response.status === 409) {
    const result = await response.json().catch(() => null);

    switch (result?.error) {
      case "CLOSES_AT_PASSED":
        throw new Error("Its closing time has already passed, so it can't be approved. Reject it instead.");
      case "QUESTION_NOT_PENDING":
        throw new AlreadyHandledError("was already reviewed by another admin");
      case "QUESTION_NOT_RESOLVABLE":
      case "QUESTION_NOT_CANCELLABLE":
        throw new AlreadyHandledError("was already resolved or cancelled");
      case "QUESTION_NOT_FOUND":
        throw new AlreadyHandledError("no longer exists");
    }
  }

  if (!response.ok) {
    throw new Error("Unable to save this action. Please try again.");
  }

  return response.json();
}

export type ReviewDecision = "approve" | "reject";

// approve opens the question for wagering; reject removes it from the queue
export async function reviewQuestion(
  questionId: string,
  decision: ReviewDecision,
): Promise<void> {
  const result = await postAdminAction(
    `/api/questions/${encodeURIComponent(questionId)}/${decision}`,
  );

  if (typeof result?.question?._id !== "string") {
    throw new Error("The server returned an unexpected response.");
  }
}

// "yes" or "no" picks the winning side; "cancel" refunds every bet
export type Settlement = "yes" | "no" | "cancel";

export type SettlementResult = {
  wagerCount: number;
  coins: number;
  // true when everyone got their coins back instead of winners being paid
  refunded: boolean;
};

// pays out a closed market, or cancels it and refunds everyone
export async function settleQuestion(
  questionId: string,
  settlement: Settlement,
): Promise<SettlementResult> {
  const id = encodeURIComponent(questionId);
  const result =
    settlement === "cancel"
      ? await postAdminAction(`/api/questions/${id}/cancel`)
      : await postAdminAction(`/api/questions/${id}/resolve`, { outcome: settlement });

  const coins = settlement === "cancel" ? result?.totalRefunded : result?.totalPaid;

  if (typeof result?.wagerCount !== "number" || typeof coins !== "number") {
    throw new Error("The market was settled, but the server's reply was unexpected. Refresh to check.");
  }

  return {
    wagerCount: result.wagerCount,
    coins,
    refunded: settlement === "cancel" || result.refunded === true,
  };
}
