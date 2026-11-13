import { Link, useNavigate } from "react-router";
import "./home.css";
import "./browseMarkets.css";
import "./admin.css";
import { useEffect, useState } from "react";
import {
  AlreadyReviewedError,
  getPendingQuestions,
  reviewQuestion,
  SessionExpiredError,
} from "./adminAPI";
import type {
  PendingQuestion,
  PendingQuestionPage,
  ReviewDecision,
} from "./adminAPI";

const CATEGORY_LABELS: Record<string, string> = {
  campus: "UCF/Campus",
};

function formatDate(value: string) {
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

// admin queue for approving or rejecting user-submitted questions
export default function Admin() {
  const navigate = useNavigate();

  const [queue, setQueue] = useState<PendingQuestionPage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [page, setPage] = useState(1);
  const [reloadCount, setReloadCount] = useState(0);

  // which question is being saved, and which one is asking "are you sure?" before rejecting
  const [savingId, setSavingId] = useState("");
  const [confirmRejectId, setConfirmRejectId] = useState("");
  const [cardErrors, setCardErrors] = useState<Record<string, string>>({});

  // confirmation of the most recent review, read out by screen readers
  const [lastReview, setLastReview] = useState("");

  function handleLogout() {
    sessionStorage.removeItem("authToken");
    sessionStorage.removeItem("authRole");
    navigate("/login", { replace: true });
  }

  // load the current page of pending questions
  useEffect(() => {
    let ignore = false;

    async function loadQueue() {
      setIsLoading(true);
      setLoadError("");

      try {
        const result = await getPendingQuestions(page);

        if (ignore) return;

        // the last item on a later page was reviewed, so step back a page
        if (result.results.length === 0 && page > 1) {
          setPage(page - 1);
          return;
        }

        setQueue(result);
      } catch (error) {
        if (ignore) return;

        if (error instanceof SessionExpiredError) {
          navigate("/login", { replace: true });
          return;
        }

        setLoadError(
          error instanceof Error ? error.message : "Unable to load submitted questions.",
        );
      } finally {
        if (!ignore) setIsLoading(false);
      }
    }

    loadQueue();

    return () => {
      ignore = true;
    };
  }, [page, reloadCount, navigate]);

  // take a card out of the queue without reloading the whole page
  function removeFromQueue(questionId: string) {
    const remaining = (queue?.results ?? []).filter(
      (item) => item._id !== questionId,
    );
    setQueue((current) =>
      current
        ? { ...current, results: remaining, total: Math.max(0, current.total - 1) }
        : current,
    );

    // fetch the next batch once this page is cleared
    if (remaining.length === 0) {
      setReloadCount((count) => count + 1);
    }
  }

  async function handleReview(question: PendingQuestion, decision: ReviewDecision) {
    setSavingId(question._id);
    setConfirmRejectId("");
    setCardErrors((errors) => ({ ...errors, [question._id]: "" }));

    try {
      await reviewQuestion(question._id, decision);

      setLastReview(
        `${decision === "approve" ? "Approved" : "Rejected"}: “${question.title}”`,
      );
      removeFromQueue(question._id);
    } catch (error) {
      if (error instanceof SessionExpiredError) {
        navigate("/login", { replace: true });
        return;
      }

      // nothing left to do for this one, so move on
      if (error instanceof AlreadyReviewedError) {
        setLastReview(`“${question.title}” ${error.message}.`);
        removeFromQueue(question._id);
        return;
      }

      setCardErrors((errors) => ({
        ...errors,
        [question._id]:
          error instanceof Error ? error.message : "Unable to save your review.",
      }));
    } finally {
      setSavingId("");
    }
  }

  const pendingCount = queue?.total ?? 0;

  return (
    <>
      {/* shared navigation */}
      <header className="site-header">
        <nav className="site-nav" aria-label="Main navigation">
          <Link className="site-brand" to="/">
            Prediction Market
          </Link>

          <div className="site-nav-links">
            <Link className="nav-link" to="/">
              Home
            </Link>
            <Link className="nav-link" to="/browse-markets">
              Browse Markets
            </Link>
            <Link className="nav-link" to="/account">
              Account
            </Link>
            <Link className="nav-link active" to="/admin" aria-current="page">
              Admin
            </Link>
            <button className="nav-link" type="button" onClick={handleLogout}>
              Log out
            </button>
          </div>
        </nav>
      </header>

      <main className="home-page">
        <header className="home-heading admin-heading">
          <div>
            <h1>Review Questions</h1>
            <p>
              Approve a question to open it for wagering, or reject it if it's
              unclear, inappropriate, or can't be resolved.
            </p>
          </div>

          <div className="admin-count" aria-live="polite">
            <strong>{isLoading && !queue ? "–" : pendingCount}</strong>
            <span>waiting for review</span>
          </div>
        </header>

        <p className="admin-confirmation" role="status">
          {lastReview}
        </p>

        {loadError && (
          <div className="market-empty">
            <h2>Couldn't load submitted questions</h2>
            <p role="alert">{loadError}</p>
            <button
              className="market-search-button"
              type="button"
              onClick={() => setReloadCount((count) => count + 1)}
            >
              Retry
            </button>
          </div>
        )}

        {isLoading && !queue && !loadError && (
          <p className="admin-loading">Loading submitted questions...</p>
        )}

        {queue && !loadError && queue.results.length === 0 && !isLoading && (
          <div className="market-empty">
            <h2>All caught up</h2>
            <p>No questions are waiting for review right now.</p>
            <button
              className="market-search-button"
              type="button"
              onClick={() => setReloadCount((count) => count + 1)}
            >
              Check again
            </button>
          </div>
        )}

        <ul className="admin-queue" aria-label="Questions waiting for review">
          {queue?.results.map((question) => {
            const expired = Date.parse(question.closesAt) <= Date.now();
            const isSaving = savingId === question._id;
            const isConfirmingReject = confirmRejectId === question._id;
            const cardError = cardErrors[question._id];
            const titleId = `review-title-${question._id}`;

            return (
              <li key={question._id}>
                <article className="admin-card" aria-labelledby={titleId}>
                  <div className="market-card-header">
                    <span className="market-category">
                      {CATEGORY_LABELS[question.category] ?? question.category}
                    </span>
                    {expired ? (
                      <span className="admin-flag">Closing time passed</span>
                    ) : (
                      <span className="market-status">Pending</span>
                    )}
                  </div>

                  <h2 className="market-card-title" id={titleId}>
                    {question.title}
                  </h2>

                  {/* the description is where the creator explains how it resolves */}
                  <h3 className="admin-label">Description and resolution criteria</h3>
                  <p className="admin-description">{question.description}</p>

                  <dl className="admin-details">
                    <div>
                      <dt>Submitted by</dt>
                      <dd>{question.creator?.displayName ?? "Unknown user"}</dd>
                    </div>
                    {question.createdAt && (
                      <div>
                        <dt>Submitted</dt>
                        <dd>{formatDate(question.createdAt)}</dd>
                      </div>
                    )}
                    <div>
                      <dt>Wagering closes</dt>
                      <dd>{formatDate(question.closesAt)}</dd>
                    </div>
                  </dl>

                  {cardError && (
                    <p className="admin-card-error" role="alert">
                      {cardError}
                    </p>
                  )}

                  {isConfirmingReject ? (
                    <div className="admin-actions admin-confirm">
                      <p>Reject this question? This can't be undone.</p>
                      <button
                        className="admin-reject"
                        type="button"
                        disabled={isSaving}
                        onClick={() => handleReview(question, "reject")}
                      >
                        {isSaving ? "Rejecting..." : "Yes, reject"}
                      </button>
                      <button
                        className="admin-secondary"
                        type="button"
                        disabled={isSaving}
                        onClick={() => setConfirmRejectId("")}
                      >
                        Keep reviewing
                      </button>
                    </div>
                  ) : (
                    <div className="admin-actions">
                      <button
                        className="admin-approve"
                        type="button"
                        disabled={isSaving || savingId !== "" || expired}
                        onClick={() => handleReview(question, "approve")}
                      >
                        {isSaving ? "Approving..." : "Approve"}
                      </button>
                      <button
                        className="admin-reject"
                        type="button"
                        disabled={isSaving || savingId !== ""}
                        onClick={() => setConfirmRejectId(question._id)}
                      >
                        Reject
                      </button>
                      {expired && (
                        <p className="admin-hint">
                          Can't approve after the closing time. Reject it instead.
                        </p>
                      )}
                    </div>
                  )}
                </article>
              </li>
            );
          })}
        </ul>

        {queue && queue.totalPages > 1 && (
          <nav className="market-pagination" aria-label="Review queue pages">
            <button
              type="button"
              disabled={page <= 1 || isLoading}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </button>

            <span>
              Page {queue.page} of {queue.totalPages}
            </span>

            <button
              type="button"
              disabled={page >= queue.totalPages || isLoading}
              onClick={() => setPage(page + 1)}
            >
              Next
            </button>
          </nav>
        )}
      </main>
    </>
  );
}
