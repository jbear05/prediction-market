import { Link } from "react-router";
import "./home.css";
import "./browseMarkets.css";
import { useEffect, useState } from "react";
import { searchMarkets } from "./marketAPI";
import type { MarketSearchResult } from "./marketAPI";

export default function BrowseMarkets() {

  const [marketData, setMarketData] = useState<MarketSearchResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // load the first page of open markets
  useEffect(() => {
    let ignore = false;

    async function loadMarkets() {
      try {
        const result = await searchMarkets("", "", "newest", 1);

        if (!ignore) {
          setMarketData(result);
        }
      } catch (error) {
        if (!ignore) {
          setError(
            error instanceof Error
              ? error.message
              : "Unable to load markets. Please try again.",
          );
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    loadMarkets();

    // ignore results if the user leaves this page
    return () => {
      ignore = true;
    };
  }, []);

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
            <Link
              className="nav-link active"
              to="/browse-markets"
              aria-current="page"
            >
              Browse Markets
            </Link>
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
        <header className="home-heading">
          <h1>Browse Markets</h1>
          <p>Find a question. Choose a side. Use fictional coins.</p>
        </header>
        {/* search controls */}
        <form
          className="market-search"
          onSubmit={(event) => event.preventDefault()}
        >
          <label htmlFor="market-search">Search questions</label>

          <div className="market-search-row">
            <input
              id="market-search"
              name="search"
              type="search"
              placeholder="Search titles or descriptions"
              maxLength={100}
            />

            <button className="market-search-button" type="submit">
              Search
            </button>

            <button className="market-clear-button" type="reset">
              Clear
            </button>
          </div>
        </form>

        {/* categories and sorting */}
        <div className="market-toolbar">
          <div className="market-categories" role="group" aria-label="Market categories">
            <button type="button" aria-pressed="true">
              All
            </button>
            <button type="button" aria-pressed="false">
              Sports
            </button>
            <button type="button" aria-pressed="false">
              UCF/Campus
            </button>
            <button type="button" aria-pressed="false">
              Other
            </button>
          </div>

          <div className="market-sort">
            <label htmlFor="market-sort">Sort by</label>
            <select id="market-sort" name="sort" defaultValue="newest">
              <option value="newest">Newest</option>
              <option value="popular">Most popular</option>
              <option value="closing">Closing soon</option>
            </select>
          </div>
        </div>

        {/* display the server response */}
        <section className="market-results" aria-label="Market results">
          <div className="market-results-summary">
            <p>
              {isLoading ? "Loading markets..." : marketData ? `${marketData.results.length} of ${marketData.total} open markets` : "Markets unavailable"}
            </p>
            <p>Fictional currency only</p>
          </div>

          {error && (
            <p className="auth-error" role="alert">
              {error}
            </p>
          )}

          {!isLoading && !error && marketData?.results.length === 0 && (
            <p>No open markets are available right now.</p>
          )}

          <div className="market-grid">
            {marketData?.results.map((market) => (
              <article className="market-card" key={market._id}>
                {/* category and market status */}
                <div className="market-card-header">
                  <span className="market-category">
                    {market.category === "campus" ? "UCF/Campus" : market.category}
                  </span>
                  <span className="market-status">Open</span>
                </div>

                <h2 className="market-card-title">{market.title}</h2>
                <p className="market-card-description">{market.description}</p>

                {/* creator and closing time */}
                <div className="market-card-info">
                  <p>Created by {market.creator?.displayName ?? "Unknown user"}</p>
                  <p>
                    Closes{" "}
                    {new Date(market.closesAt).toLocaleString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                      timeZoneName: "short",
                    })}
                  </p>
                </div>

                {/* coin totals returned by the server */}
                <div className="market-card-pools">
                  <div className="market-total">
                    <span>Total wagered</span>
                    <strong>{market.totalPool.toLocaleString()} coins</strong>
                  </div>

                  <div className="market-pool-sides">
                    <span>YES pool {market.poolYes.toLocaleString()} coins</span>
                    <span>NO pool {market.poolNo.toLocaleString()} coins</span>
                  </div>
                </div>

                {/* enabled when the wager popup is connected */}
                <div className="market-card-actions">
                  <button className="market-yes" type="button" disabled>
                    YES
                  </button>
                  <button className="market-no" type="button" disabled>
                    NO
                  </button>
                </div>

                <button className="market-details" type="button" disabled>
                  View details
                </button>
              </article>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}