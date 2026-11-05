import { Link } from "react-router";

export default function Home() {
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

        {/* sample balance until API is connected */}
        <section className="balance-panel" aria-labelledby="balance-heading">
          <div>
            <h2 id="balance-heading">Balance</h2>
            <p className="balance-amount">100 coins</p>
            <p>Fictional currency only</p>
            <small>Sample balance</small>
          </div>

          <div className="daily-coins">
            <p>Daily coins</p>
            <button type="button" disabled>
              Claim daily coins
            </button>
          </div>
        </section>

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

          <div className="section-filters">
            <button type="button" aria-pressed="true">
              Current
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

          <a className="create-market-button" href="#create-market">
            Create market
          </a>
        </section>

        {/* Market submission will be connected to the API later */}
        <section id="create-market" className="create-market-panel" aria-labelledby="create-market-heading">
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
        </section>
      </main>
    </>
  );
}