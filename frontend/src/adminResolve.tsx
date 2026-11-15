import { useState } from "react";
import { useNavigate } from "react-router";
import {
  AlreadyHandledError,
  SessionExpiredError,
  settleQuestion,
} from "./adminAPI";
import type { AdminQuestion, Settlement, SettlementResult } from "./adminAPI";
import {
  CATEGORY_LABELS,
  formatDate,
  QueuePages,
  QueueState,
  useAdminQueue,
} from "./adminQueue";

function coins(amount: number) {
  return `${amount.toLocaleString()} ${amount === 1 ? "coin" : "coins"}`;
}

function bets(count: number) {
  return `${count.toLocaleString()} ${count === 1 ? "bet" : "bets"}`;
}

// explains what the chosen action will do with the coins, before the admin confirms
function describeSettlement(question: AdminQuestion, settlement: Settlement) {
  const total = question.poolYes + question.poolNo;

  if (settlement === "cancel") {
    return total === 0
      ? "Cancel this market? No coins were wagered."
      : `Cancel this market and refund all ${coins(total)} to the bettors?`;
  }

  const side = settlement.toUpperCase();
  const winningPool = settlement === "yes" ? question.poolYes : question.poolNo;

  if (total === 0) {
    return `Resolve as ${side}? No coins were wagered.`;
  }

  if (winningPool === 0) {
    return `Resolve as ${side}? Nobody bet ${side}, so all ${coins(total)} go back to the bettors.`;
  }

  return `Resolve as ${side}? Everyone who bet ${side} splits the ${total.toLocaleString()}-coin pool.`;
}

// what happened, in the admin's words, after the server confirms
function describeResult(
  question: AdminQuestion,
  settlement: Settlement,
  result: SettlementResult,
) {
  const title = `“${question.title}”`;

  if (settlement === "cancel") {
    return result.wagerCount === 0
      ? `Cancelled ${title}.`
      : `Cancelled ${title} and refunded ${coins(result.coins)} across ${bets(result.wagerCount)}.`;
  }

  const side = settlement.toUpperCase();

  if (result.wagerCount === 0) {
    return `Resolved ${title} as ${side}.`;
  }

  if (result.refunded) {
    const verb = result.wagerCount === 1 ? "was" : "were";
    return `Resolved ${title} as ${side}. Nobody bet ${side}, so ${bets(result.wagerCount)} ${verb} refunded (${coins(result.coins)}).`;
  }

  return `Resolved ${title} as ${side}. Paid out ${coins(result.coins)} to the winners.`;
}

const ACTION_LABELS: Record<Settlement, string> = {
  yes: "Resolve YES",
  no: "Resolve NO",
  cancel: "Cancel & refund",
};

const CONFIRM_LABELS: Record<Settlement, string> = {
  yes: "Yes, resolve YES",
  no: "Yes, resolve NO",
  cancel: "Yes, cancel & refund",
};

const SAVING_LABELS: Record<Settlement, string> = {
  yes: "Resolving...",
  no: "Resolving...",
  cancel: "Cancelling...",
};

// markets whose wagering has closed and need a result
export default function ResolveQueue() {
  const navigate = useNavigate();
  const queue = useAdminQueue("closed");
  const { data, isLoading } = queue;

  const [savingId, setSavingId] = useState("");
  // the card and action waiting for "are you sure?"
  const [pending, setPending] = useState<{ id: string; settlement: Settlement } | null>(null);
  const [cardErrors, setCardErrors] = useState<Record<string, string>>({});
  const [lastAction, setLastAction] = useState("");

  async function handleSettle(question: AdminQuestion, settlement: Settlement) {
    setSavingId(question._id);
    setCardErrors((errors) => ({ ...errors, [question._id]: "" }));

    try {
      const result = await settleQuestion(question._id, settlement);

      setPending(null);
      setLastAction(describeResult(question, settlement, result));
      queue.remove(question._id);
    } catch (error) {
      if (error instanceof SessionExpiredError) {
        navigate("/login", { replace: true });
        return;
      }

      if (error instanceof AlreadyHandledError) {
        setPending(null);
        setLastAction(`“${question.title}” ${error.message}.`);
        queue.remove(question._id);
        return;
      }

      setCardErrors((errors) => ({
        ...errors,
        [question._id]:
          error instanceof Error ? error.message : "Unable to settle this market.",
      }));
    } finally {
      setSavingId("");
    }
  }

  return (
    <section aria-labelledby="resolve-heading">
      <header className="admin-section-heading">
        <div>
          <h2 id="resolve-heading">Resolve markets</h2>
          <p>
            Wagering has closed on these markets. Pick the side that happened
            to pay out the winners, or cancel the market to refund everyone.
          </p>
        </div>

        <div className="admin-count" aria-live="polite">
          <strong>{isLoading && !data ? "–" : data?.total ?? 0}</strong>
          <span>waiting for a result</span>
        </div>
      </header>

      <p className="admin-confirmation" role="status">
        {lastAction}
      </p>

      <QueueState
        {...queue}
        loadingText="Loading closed markets..."
        emptyText="No closed markets are waiting for a result right now."
      />

      <ul className="admin-queue" aria-label="Markets waiting for a result">
        {data?.results.map((question) => {
          const total = question.poolYes + question.poolNo;
          // an empty bar when nobody bet, rather than a misleading 50/50
          const yesShare = total === 0 ? 0 : Math.round((question.poolYes / total) * 100);
          const isSaving = savingId === question._id;
          const confirming = pending?.id === question._id ? pending.settlement : null;
          const cardError = cardErrors[question._id];
          const titleId = `resolve-title-${question._id}`;

          return (
            <li key={question._id}>
              <article className="admin-card" aria-labelledby={titleId}>
                <div className="market-card-header">
                  <span className="market-category">
                    {CATEGORY_LABELS[question.category] ?? question.category}
                  </span>
                  <span className="admin-flag admin-flag-neutral">Wagering closed</span>
                </div>

                <h3 className="market-card-title" id={titleId}>
                  {question.title}
                </h3>

                <h4 className="admin-label">Resolution criteria</h4>
                <p className="admin-description">{question.description}</p>

                <dl className="admin-details">
                  <div>
                    <dt>Created by</dt>
                    <dd>{question.creator?.displayName ?? "Unknown user"}</dd>
                  </div>
                  <div>
                    <dt>Wagering closed</dt>
                    <dd>{formatDate(question.closesAt)}</dd>
                  </div>
                  <div>
                    <dt>Total wagered</dt>
                    <dd>{coins(total)}</dd>
                  </div>
                </dl>

                {/* how the pool is split, so the admin can see who wins what */}
                <div className="admin-pools">
                  <div className="admin-pool-bar" aria-hidden="true">
                    <span className="admin-pool-yes" style={{ width: `${yesShare}%` }} />
                  </div>
                  <p>
                    <span>YES pool: {coins(question.poolYes)}</span>
                    <span>NO pool: {coins(question.poolNo)}</span>
                  </p>
                </div>

                {cardError && (
                  <p className="admin-card-error" role="alert">
                    {cardError}
                  </p>
                )}

                {confirming ? (
                  <div className="admin-actions admin-confirm">
                    <p>
                      {describeSettlement(question, confirming)} This can't be undone.
                    </p>
                    <button
                      className={confirming === "cancel" ? "admin-reject" : "admin-approve"}
                      type="button"
                      disabled={isSaving}
                      onClick={() => handleSettle(question, confirming)}
                    >
                      {isSaving ? SAVING_LABELS[confirming] : CONFIRM_LABELS[confirming]}
                    </button>
                    <button
                      className="admin-secondary"
                      type="button"
                      disabled={isSaving}
                      onClick={() => setPending(null)}
                    >
                      Go back
                    </button>
                  </div>
                ) : (
                  <div className="admin-actions">
                    {(["yes", "no"] as const).map((side) => (
                      <button
                        key={side}
                        className="admin-approve"
                        type="button"
                        disabled={savingId !== ""}
                        onClick={() => setPending({ id: question._id, settlement: side })}
                      >
                        {ACTION_LABELS[side]}
                      </button>
                    ))}
                    <button
                      className="admin-reject"
                      type="button"
                      disabled={savingId !== ""}
                      onClick={() => setPending({ id: question._id, settlement: "cancel" })}
                    >
                      {ACTION_LABELS.cancel}
                    </button>
                  </div>
                )}
              </article>
            </li>
          );
        })}
      </ul>

      <QueuePages label="Resolve queue pages" {...queue} />
    </section>
  );
}
