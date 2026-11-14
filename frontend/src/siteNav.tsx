import { Link, NavLink, useNavigate } from "react-router";
import "./home.css";

// highlights the link for the page you're on (NavLink also sets aria-current="page")
function navLinkClass({ isActive }: { isActive: boolean }) {
  return isActive ? "nav-link active" : "nav-link";
}

// navigation bar shared by every logged-in page
export default function SiteNav() {
  const navigate = useNavigate();

  // only shows the link; the API still checks the role on every admin request
  const isAdmin = sessionStorage.getItem("authRole") === "admin";

  function handleLogout() {
    sessionStorage.removeItem("authToken");
    sessionStorage.removeItem("authRole");
    navigate("/login", { replace: true });
  }

  return (
    <header className="site-header">
      <nav className="site-nav" aria-label="Main navigation">
        <Link className="site-brand" to="/">
          Prediction Market
        </Link>

        <div className="site-nav-links">
          {/* end: "/" is only active on Home itself, not on every page */}
          <NavLink className={navLinkClass} to="/" end>
            Home
          </NavLink>
          <NavLink className={navLinkClass} to="/browse-markets">
            Browse Markets
          </NavLink>
          <NavLink className={navLinkClass} to="/account">
            Account
          </NavLink>
          {isAdmin && (
            <NavLink className={navLinkClass} to="/admin">
              Admin
            </NavLink>
          )}
          <button className="nav-link" type="button" onClick={handleLogout}>
            Log out
          </button>
        </div>
      </nav>
    </header>
  );
}
