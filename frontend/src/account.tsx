import { Link } from "react-router";
import SiteNav from "./siteNav";
import "./home.css";

export default function Account() {


  return (
    <>
      <SiteNav />

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