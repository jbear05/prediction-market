import { Link } from "react-router";
import "./home.css";
import "./browseMarkets.css";
export default function BrowseMarkets() {
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
        {/* results will come from the search API */}
        <section className="market-results" aria-label="Market results">
          <div className="market-results-summary">
            <p>Markets will appear here once connected.</p>
            <p>Fictional currency only</p>
          </div>

          <div className="market-grid">
            {/* market cards will go here */}
          </div>
        </section>
      </main>
    </>
  );
}