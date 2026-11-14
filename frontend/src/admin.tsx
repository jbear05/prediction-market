import { useNavigate, useSearchParams } from "react-router";
import SiteNav from "./siteNav";
import "./home.css";
import "./browseMarkets.css";
import "./admin.css";
import { useState } from "react";
import {
  AlreadyHandledError,
  reviewQuestion,
  SessionExpiredError,
} from "./adminAPI";
import type { AdminQuestion, ReviewDecision } from "./adminAPI";
import {
  CATEGORY_LABELS,
  formatDate,
  QueuePages,
  QueueState,
  useAdminQueue,
} from "./adminQueue";
import ResolveQueue from "./adminResolve";

type AdminTab = "review" | "resolve";

// admin tools: review user-submitted questions, and resolve markets once wagering closes
export default function Admin() {
  // the tab lives in the URL (?tab=resolve) so a refresh stays on the same tab
  const [searchParams, setSearchParams] = useSearchParams();
  const tab: AdminTab = searchParams.get("tab") === "resolve" ? "resolve" : "review";

  return (
    <>
      <SiteNav />

      <main className="home-page">
        <header className="home-heading">
          <h1>Admin</h1>
          <p>Review new questions and settle markets once wagering closes.</p>
        </header>

        <div className="section-filters admin-tabs" role="group" aria-label="Admin tools">
          <button
            type="button"
            aria-pressed={tab === "review"}
            onClick={() => setSearchParams({}, { replace: true })}
          >
            Review submissions
          </button>
          <button
            type="button"
            aria-pressed={tab === "resolve"}
            onClick={() => setSearchParams({ tab: "resolve" }, { replace: true })}
          >
            Resolve markets
          </button>
        </div>

        {/* key resets each queue's state when switching tabs */}
        {tab === "review" ? <ReviewQueue key="review" /> : <ResolveQueue key="resolve" />}
      </main>
    </>
  );
}

// user-submitted questions waiting for approval
function ReviewQueue() {
  const navigate = useNavigate();
  const queue = useAdminQueue("pending");
  const { data, isLoading } = queue;

  // which question is being saved, and which one is asking "are you sure?" before rejecting
  const [savingId, setSavingId] = useState("");
  const [confirmRejectId, setConfirmRejectId] = useState("");
  const [cardErrors, setCardErrors] = useState<Record<string, string>>({});

  // confirmation of the most recent review, read out by screen readers
  const [lastAction, setLastAction] = useState("");

  async function handleReview(question: AdminQuestion, decision: ReviewDecision) {
    setSavingId(question._id);
    setConfirmRejectId("");
    setCardErrors((errors) => ({ ...errors, [question._id]: "" }));

    try {
      await reviewQuestion(question._id, decision);

      setLastAction(
        `${decision === "approve" ? "Approved" : "Rejected"}: “${question.title}”`,
      );
      queue.remove(question._id);
    } catch (error) {
      if (error instanceof SessionExpiredError) {
        navigate("/login", { replace: true });
        return;
      }

      // nothing left to do for this one, so move on
      if (error instanceof AlreadyHandledError) {
        setLastAction(`“${question.title}” ${error.message}.`);
        queue.remove(question._id);
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

  return (
    <section aria-labelledby="review-heading">
      <header className="admin-section-heading">
        <div>
          <h2 id="review-heading">Review submissions</h2>
          <p>
            Approve a question to open it for wagering, or reject it if it's
            unclear, inappropriate, or can't be resolved.
          </p>
        </div>

        <div className="admin-count" aria-live="polite">
          <strong>{isLoading && !data ? "–" : data?.total ?? 0}</strong>
          <span>waiting for review</span>
        </div>
      </header>

      <p className="admin-confirmation" role="status">
        {lastAction}
      </p>

      <QueueState
        {...queue}
        loadingText="Loading submitted questions..."
        emptyText="No questions are waiting for review right now."
      />

      <ul className="admin-queue" aria-label="Questions waiting for review">
        {data?.results.map((question) => {
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

                <h3 className="market-card-title" id={titleId}>
                  {question.title}
                </h3>

                {/* the description is where the creator explains how it resolves */}
                <h4 className="admin-label">Description and resolution criteria</h4>
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
                      disabled={savingId !== "" || expired}
                      onClick={() => handleReview(question, "approve")}
                    >
                      {isSaving ? "Approving..." : "Approve"}
                    </button>
                    <button
                      className="admin-reject"
                      type="button"
                      disabled={savingId !== ""}
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

      <QueuePages label="Review queue pages" {...queue} />
    </section>
  );
}
