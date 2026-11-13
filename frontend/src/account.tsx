import { Link, useNavigate } from "react-router";
import "./home.css";

export default function Account() {
  const navigate = useNavigate();

  function handleLogout() {
    sessionStorage.removeItem("authToken");
    navigate("/login", { replace: true });
  }

  return (
    <>
      <header className="site-header">
        <nav className="site-nav" aria-label="Main navigation">
          <Link className="site-brand" to="/">Prediction Market</Link>

          <div className="site-nav-links">
            <Link className="nav-link" to="/">Home</Link>
            <Link className="nav-link" to="/browse-markets">Browse Markets</Link>
            <Link className="nav-link active" to="/account" aria-current="page">
              Account
            </Link>
            <button className="nav-link" type="button" onClick={handleLogout}>
              Log out
            </button>
          </div>
        </nav>
      </header>

      <main className="home-page">
        <header className="home-heading">
          <h1>Account</h1>
        </header>

        <div className="account-cards">
          <section
            className="account-card account-password"
            aria-labelledby="account-password-heading"
          >
            <div>
              <h2 id="account-password-heading">Password</h2>
              <p>Request a reset code by email to choose a new password.</p>
            </div>
            <Link className="account-reset" to="/forgot-password">
              Reset password
            </Link>
          </section>

          <section className="account-card" aria-labelledby="account-activity-heading">
            <h2 id="account-activity-heading">Your activity</h2>
            <ul className="account-activity">
              <li>
                <Link to="/#my-bets-heading">
                  View My Bets <span aria-hidden="true">→</span>
                </Link>
              </li>
              <li>
                <Link to="/#my-markets-heading">
                  View My Markets <span aria-hidden="true">→</span>
                </Link>
              </li>
            </ul>
          </section>
        </div>
      </main>
    </>
  );
}