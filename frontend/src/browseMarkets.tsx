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

  // keep typed text separate from the submitted search
  const [searchText, setSearchText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  
  const [category, setCategory] = useState("");
  const [sort, setSort] = useState("newest");

  const [page, setPage] = useState(1);
  // load markets for the current search, filters, and page
  useEffect(() => {
    let ignore = false;

    async function loadMarkets() {
      setIsLoading(true);
      setError("");
      setMarketData(null);

      try {
        const result = await searchMarkets(searchQuery, category, sort, page);

        if (!ignore) {
          setMarketData(result);
        }
      } catch (error) {
        if (!ignore) {
          setError(
            error instanceof Error ? error.message : "Unable to load markets. Please try again.",
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
  }, [searchQuery, category, sort, page]);

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
          onSubmit={(event) => {
            event.preventDefault();
            setSearchQuery(searchText.trim());
            setPage(1);
          }}
        >
          <label htmlFor="market-search">Search questions</label>

          <div className="market-search-row">
            <input
              id="market-search"
              name="search"
              type="search"
              placeholder="Search titles or descriptions"
              maxLength={100}
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
            />

            <button className="market-search-button" type="submit">
              Search
            </button>

            <button
              className="market-clear-button"
              type="button"
              onClick={() => {
                setSearchText("");
                setSearchQuery("");
                setPage(1);
              }}
            >
              Clear
            </button>
          </div>
        </form>

        {/* categories and sorting */}
        <div className="market-toolbar">
          <div
            className="market-categories"
            role="group"
            aria-label="Market categories"
          >
            <button
              type="button"
              aria-pressed={category === ""}
              onClick={() => {
                setCategory("");
                setPage(1);
              }}
            >
              All
            </button>

            <button
              type="button"
              aria-pressed={category === "sports"}
              onClick={() => {
                setCategory("sports");
                setPage(1);
              }}
            >
              Sports
            </button>

            <button
              type="button"
              aria-pressed={category === "campus"}
              onClick={() => {
                setCategory("campus");
                setPage(1);
              }}
            >
              UCF/Campus
            </button>

            <button
              type="button"
              aria-pressed={category === "other"}
              onClick={() => {
                setCategory("other");
                setPage(1);
              }}
            >
              Other
            </button>
          </div>

          <div className="market-sort">
            <label htmlFor="market-sort">Sort by</label>
            <select
              id="market-sort"
              name="sort"
              value={sort}
              onChange={(event) => {
                setSort(event.target.value);
                setPage(1);
              }}
            >
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
            <p>No markets match your search. Try another word or clear your search.</p>
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
          {/* move between pages of server results */}
          {marketData && marketData.totalPages > 0 && (
            <nav className="market-pagination" aria-label="Market result pages">
              <button
                type="button"
                disabled={page <= 1 || isLoading}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </button>

              <span>
                Page {marketData.page} of {marketData.totalPages}
              </span>

              <button
                type="button"
                disabled={page >= marketData.totalPages || isLoading}
                onClick={() => setPage(page + 1)}
              >
                Next
              </button>
            </nav>
          )}
        </section>
      </main>
    </>
  );
}