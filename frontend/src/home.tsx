import { Link, useNavigate, useLocation } from "react-router";
import "./home.css";
import { useEffect, useRef, useState } from "react";
import { claimDailyCoins, getBalance, getDailyClaimStatus, getWagers, submitMarket} 
from "./homeAPI";
import type { Wager } from "./homeAPI";
import type { FormEvent } from "react";

export default function Home() {
  const navigate = useNavigate();
  const { hash } = useLocation();

  useEffect(() => {
    if (!hash) return;

    const heading = document.getElementById(hash.slice(1));
    heading?.scrollIntoView({ block: "start" });
    heading?.focus({ preventScroll: true });
  }, [hash]);
  function handleLogout() {
    sessionStorage.removeItem("authToken");
    navigate("/login", { replace: true });
  }
  
  const createMarketDialog = useRef<HTMLDialogElement>(null);
  const [isSubmittingMarket, setIsSubmittingMarket] = useState(false);
  const [marketError, setMarketError] = useState("");
  const [marketMessage, setMarketMessage] = useState("");

  async function handleSubmitMarket(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmittingMarket) return;

    const form = event.currentTarget;
    const fields = new FormData(form);
    const title = String(fields.get("question") ?? "").trim();
    const description = String(fields.get("description") ?? "").trim();
    const closingTime = new Date(String(fields.get("closingTime") ?? ""));

    setMarketError("");
    setMarketMessage("");

    if (!title || !description) {
      setMarketError("Enter a question and description.");
      return;
    }

    if (Number.isNaN(closingTime.getTime()) || closingTime.getTime() <= Date.now()) {
      setMarketError("Choose a closing date and time in the future.");
      return;
    }

    setIsSubmittingMarket(true);

    try {
      await submitMarket({
        title,
        description,
        closesAt: closingTime.toISOString(),
      });

      form.reset();
      createMarketDialog.current?.close();
      setMarketMessage("Your market was submitted for admin review.");
    } catch (error) {
      setMarketError(
        error instanceof Error
          ? error.message
          : "Unable to submit your market. Please try again.",
      );
    } finally {
      setIsSubmittingMarket(false);
    }
  }

  const [balance, setBalance] = useState<number | null>(null);
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimError, setClaimError] = useState("");
  const [claimMessage, setClaimMessage] = useState("");

  const [claimStatus, setClaimStatus] = useState<{
    nextClaimAt: string;
    claimEligible: boolean;
  } | null>(null);
  const [isLoadingCoins, setIsLoadingCoins] = useState(true);
  const [coinLoadError, setCoinLoadError] = useState("");

  const claimUnavailable = claimStatus?.claimEligible === false;

  useEffect(() => {
    let ignore = false;

    async function loadCoins() {
      const [balanceResult, statusResult] = await Promise.allSettled([
        getBalance(),
        getDailyClaimStatus(),
      ]);

      if (ignore) return;

      if (balanceResult.status === "fulfilled") {
        setBalance(balanceResult.value);
      }

      if (statusResult.status === "fulfilled") {
        setClaimStatus(statusResult.value);
      }

      const failure =
        balanceResult.status === "rejected" ? balanceResult : statusResult;

      if (failure.status === "rejected") {
        setCoinLoadError(
          failure.reason instanceof Error
            ? failure.reason.message
            : "Unable to load your coin information.",
        );
      }

      setIsLoadingCoins(false);
    }

    void loadCoins();

    return () => {
      ignore = true;
    };
  }, []);
  const [wagers, setWagers] = useState<Wager[]>([]);
  const [betTab, setBetTab] = useState<"active" | "history">("active");
  const [isLoadingWagers, setIsLoadingWagers] = useState(true);
  const [wagerError, setWagerError] = useState("");

  useEffect(() => {
    let ignore = false;

    async function loadWagers() {
      try {
        const result = await getWagers();
        if (!ignore) setWagers(result);
      } catch (error) {
        if (!ignore) {
          setWagerError(
            error instanceof Error ? error.message : "Unable to load your bets.",
          );
        }
      } finally {
        if (!ignore) setIsLoadingWagers(false);
      }
    }

    void loadWagers();

    return () => {
      ignore = true;
    };
  }, []);

  const visibleWagers = wagers.filter(({ question }) => {
    const isHistorical =
      question.status === "resolved" || question.status === "cancelled";

    return betTab === "history" ? isHistorical : !isHistorical;
  });

  // claim coins and show the balance returned by the server
  async function handleDailyClaim() {
    if (isClaiming || isLoadingCoins || claimUnavailable) return;

    setClaimError("");
    setClaimMessage("");
    setIsClaiming(true);

    try {
      const result = await claimDailyCoins();

      setBalance(result.balance);
      setCoinLoadError("");
      setClaimStatus({
        nextClaimAt: result.nextClaimAt,
        claimEligible: false,
      });
      setClaimMessage(`You received ${result.amount} coins!`);
    } catch (error) {
      setClaimError(
        error instanceof Error
          ? error.message
          : "Unable to claim daily coins. Please try again.",
      );
    } finally {
      setIsClaiming(false);
    }
  }
  return (
    <>
      <header className="site-header">
        <nav className="site-nav" aria-label="Main navigation">
          <Link className="site-brand" to="/">
            Prediction Market
          </Link>

          <div className="site-nav-links">
            <Link className="nav-link active" to="/" aria-current="page">
              Home
            </Link>
            <Link className="nav-link" to="/browse-markets">
              Browse Markets
            </Link>
            <Link className="nav-link" to="/account">
              Account
            </Link>
            <button className="nav-link" type="button" onClick={handleLogout}>
              Log out
            </button>
          </div>
        </nav>
      </header>

      <main className="home-page">
        {/* page heading */}
        <header className="home-heading">
          <h1>Home</h1>
          <p>Your coins, predictions, and created markets in one place.</p>
        </header>

        {/* balance updates after a successful claim */}
        <section className="balance-panel" aria-labelledby="balance-heading">
          <div>
            <h2 id="balance-heading">Balance</h2>
            <p className="balance-amount">
              {balance === null ? "—" : `${balance} coins`}
            </p>
            <p>Fictional currency only</p>
            {isLoadingCoins && <small>Loading coin information…</small>}
            {coinLoadError && <small role="alert">{coinLoadError}</small>}
          </div>

          <div className="daily-coins">
            <p>Daily coins</p>
            {claimUnavailable && claimStatus && (
              <p>Next claim: {new Date(claimStatus.nextClaimAt).toLocaleString()}</p>
            )}
            <button
              type="button"
              onClick={handleDailyClaim}
              disabled={isClaiming || isLoadingCoins || claimUnavailable}
            >
              {isClaiming ? "Claiming..." : "Claim daily coins"}
            </button>
          </div>
        </section>

        {claimError && (
          <p className="auth-error" role="alert">
            {claimError}
          </p>
        )}

        {claimMessage && (
          <p role="status">{claimMessage}</p>
        )}
        {/* wagers will be loaded from the API later */}
        <section className="home-section" aria-labelledby="my-bets-heading">
          <h2 id="my-bets-heading" tabIndex={-1}>My Bets</h2>

          <div className="section-filters">
            <button
              type="button"
              aria-pressed={betTab === "active"}
              onClick={() => setBetTab("active")}
            >
              Active
            </button>
            <button
              type="button"
              aria-pressed={betTab === "history"}
              onClick={() => setBetTab("history")}
            >
              History
            </button>
          </div>

          <div className="table-container">
            <table className="home-table">
              <thead>
                <tr>
                  <th scope="col">Question</th>
                  <th scope="col">Your prediction</th>
                  <th scope="col">Coins wagered</th>
                  <th scope="col">Wagering closes</th>
                  <th scope="col">Market status</th>
                  <th scope="col">Payout</th>
                </tr>
              </thead>
              <tbody>
                {visibleWagers.length === 0 && (
                  <tr>
                    <td colSpan={6}>
                      {isLoadingWagers ? (
                        <span role="status">Loading your bets…</span>
                      ) : wagerError ? (
                        <span role="alert">{wagerError}</span>
                      ) : betTab === "active" ? (
                        "You don’t have any active bets."
                      ) : (
                        "You don’t have any settled bets yet."
                      )}
                    </td>
                  </tr>
                )}

                {visibleWagers.map((wager) => {
                  const { question } = wager;
                  const status =
                    question.status === "open" && Date.parse(question.closesAt) <= Date.now()
                      ? "closed"
                      : question.status;

                  return (
                    <tr key={wager.wagerId}>
                      <td>{question.title}</td>
                      <td>
                        <span className={`bet-prediction bet-prediction-${wager.side}`}>
                          {wager.side === "yes" ? "Yes" : "No"}
                        </span>
                      </td>
                      <td>{wager.amount.toLocaleString()} coins</td>
                      <td>{new Date(question.closesAt).toLocaleString()}</td>
                      <td>
                        <span className={`bet-status bet-status-${status}`}>
                          {status === "closed"
                            ? "Closed—awaiting result"
                            : status.charAt(0).toUpperCase() + status.slice(1)}
                        </span>
                      </td>
                      <td>
                        {wager.payout === null ? "Pending" : `${wager.payout.toLocaleString()} coins`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>


        {/* Questions created by this user */}
        <section className="home-section" aria-labelledby="my-markets-heading">
        <h2 id="my-markets-heading" tabIndex={-1}>My Markets</h2>

        <div role="status">
          {marketMessage && <p>{marketMessage}</p>}
        </div>

        <div className="market-controls">
          <div className="section-filters">
            <button type="button" aria-pressed="true">
              Current
            </button>
            <button type="button" aria-pressed="false" disabled>
              History
            </button>
          </div>

          <button
            className="create-market-button"
            type="button"
            onClick={() => createMarketDialog.current?.showModal()}
          >
            Create market
          </button>
        </div>

          <div className="table-container">
            <table className="home-table">
              <thead>
                <tr>
                  <th scope="col">Question</th>
                  <th scope="col">Wagering closes</th>
                  <th scope="col">Status</th>
                  <th scope="col">View market</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan={4}>
                    Your created markets will appear here once account data is connected.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* market submission will be connected to the API later */}
        <dialog
          ref={createMarketDialog}
          className="create-market-panel create-market-dialog"
          aria-labelledby="create-market-heading"
          onCancel={(event) => {
            if (isSubmittingMarket) event.preventDefault();
          }}
          onClose={() => setMarketError("")}
        >
          {/* close the popup */}
          <button
            className="dialog-close"
            type="button"
            aria-label="Close create market"
            onClick={() => createMarketDialog.current?.close()}
            disabled={isSubmittingMarket}
          >
            ×
          </button>
          <h2 id="create-market-heading">Create a market</h2>
          <p>
            Submit a prediction question for admin review. Once approved, the
            market will open for wagering.
          </p>

          <form className="create-market-form" onSubmit={handleSubmitMarket}>
            <label htmlFor="market-question">Question</label>
            <input
              id="market-question"
              name="question"
              type="text"
              placeholder="Enter a clear prediction question"
              required
              maxLength={150}
            />

            <label htmlFor="market-description">
              Description and resolution criteria
            </label>
            <textarea
              id="market-description"
              name="description"
              rows={5}
              placeholder="Explain what the question means, how it will be resolved, and what evidence will determine the outcome."
              required
              maxLength={2000}
            />

            <label htmlFor="market-closing-time">Closing date and time</label>
            <input
              id="market-closing-time"
              name="closingTime"
              type="datetime-local"
              aria-describedby="closing-time-help"
              required
            />
            <small id="closing-time-help">
              Enter the closing time in your local timezone.
            </small>

            {marketError && (
              <p className="auth-error" role="alert">{marketError}</p>
            )}

            <button type="submit" disabled={isSubmittingMarket}>
              {isSubmittingMarket ? "Submitting…" : "Submit for review"}
            </button>
          </form>
        </dialog>
      </main>
    </>
  );
}