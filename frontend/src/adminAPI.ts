import type { Market, MarketSearchResult } from "./marketAPI";

// thrown when the saved login no longer works, so the page can send the user to log in
export class SessionExpiredError extends Error {}

// thrown when the question left the queue some other way, so the page can drop its card
export class AlreadyReviewedError extends Error {}

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

// a submitted question, plus when it was submitted
export type PendingQuestion = Market & { createdAt?: string };

export type PendingQuestionPage = Omit<MarketSearchResult, "results"> & {
  results: PendingQuestion[];
};

// retrieve one page of questions waiting for admin review, closing soonest first
export async function getPendingQuestions(
  page: number,
): Promise<PendingQuestionPage> {
  const params = new URLSearchParams({
    status: "pending",
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
    throw new Error("Unable to load submitted questions. Please try again.");
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

export type ReviewDecision = "approve" | "reject";

// approve opens the question for wagering; reject removes it from the queue
export async function reviewQuestion(
  questionId: string,
  decision: ReviewDecision,
): Promise<Market> {
  const response = await fetch(
    `/api/questions/${encodeURIComponent(questionId)}/${decision}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${getToken()}`,
      },
    },
  );

  if (response.status === 401) {
    clearSession();
    throw new SessionExpiredError("Your session has expired. Please log in again.");
  }

  if (response.status === 403) {
    throw new Error("Your account doesn't have admin access.");
  }

  // expected review errors include a JSON error code
  if (response.status === 404 || response.status === 409) {
    const result = await response.json();

    if (result.error === "CLOSES_AT_PASSED") {
      throw new Error("Its closing time has already passed, so it can't be approved. Reject it instead.");
    }

    if (result.error === "QUESTION_NOT_PENDING") {
      throw new AlreadyReviewedError("was already reviewed by another admin");
    }

    if (result.error === "QUESTION_NOT_FOUND") {
      throw new AlreadyReviewedError("no longer exists");
    }
  }

  if (!response.ok) {
    throw new Error("Unable to save your review. Please try again.");
  }

  const result = await response.json();

  if (typeof result.question?._id !== "string") {
    throw new Error("The server returned an unexpected response.");
  }

  return result.question;
}
