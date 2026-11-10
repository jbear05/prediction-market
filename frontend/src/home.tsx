import { Link } from "react-router";
import "./home.css";
import { useRef, useState } from "react";
import { claimDailyCoins } from "./homeAPI";

export default function Home() {
  const createMarketDialog = useRef<HTMLDialogElement>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimError, setClaimError] = useState("");
  const [claimMessage, setClaimMessage] = useState("");

  // claim coins and show the balance returned by the server
  async function handleDailyClaim() {
    if (isClaiming) return;

    setClaimError("");
    setClaimMessage("");
    setIsClaiming(true);

    try {
      const result = await claimDailyCoins();

      setBalance(result.balance);
      setClaimMessage(
        `You received ${result.amount} coins! Next claim: ${
          new Date(result.nextClaimAt).toLocaleString()
        }.`,
      );
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
            <button className="nav-link" type="button" disabled>
              Browse Markets
            </button>
            <button className="nav-link" type="button" disabled>
              Account
            </button>
            <button className="nav-link" type="button" disabled>
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
            {balance === null && (
              <small>Balance will appear after a successful claim.</small>
            )}
          </div>

          <div className="daily-coins">
            <p>Daily coins</p>
            <button
              type="button"
              onClick={handleDailyClaim}
              disabled={isClaiming}
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
          <h2 id="my-bets-heading">My Bets</h2>

          <div className="section-filters">
            <button type="button" aria-pressed="true">
              Active
            </button>
            <button type="button" aria-pressed="false" disabled>
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
                  <th scope="col">View market</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan={6}>
                    Your bets will appear here once account data is connected.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>


        {/* Questions created by this user */}
        <section className="home-section" aria-labelledby="my-markets-heading">
        <h2 id="my-markets-heading">My Markets</h2>

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
        >
          {/* close the popup */}
          <button
            className="dialog-close"
            type="button"
            aria-label="Close create market"
            onClick={() => createMarketDialog.current?.close()}
          >
            ×
          </button>
          <h2 id="create-market-heading">Create a market</h2>
          <p>
            Submit a prediction question for admin review. Once approved, the
            market will open for wagering.
          </p>

          <form className="create-market-form" onSubmit={(event) => event.preventDefault()}>
            <label htmlFor="market-question">Question</label>
            <input
              id="market-question"
              name="question"
              type="text"
              placeholder="Enter a clear prediction question"
              required
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

            <p>
              Submitted questions appear in My Markets as Pending review.
              Admin approval is required before wagering opens.
            </p>

            <button type="submit" disabled>
              Submit for review
            </button>
          </form>
        </dialog>
      </main>
    </>
  );
}