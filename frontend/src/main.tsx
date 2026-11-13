import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useSearchParams,
  Outlet
} from "react-router";
import Login from "./login";
import Register from "./register";
import ForgotPassword from "./forgotPassword";
import ResetPassword from "./resetPassword";
import VerifyEmail from "./verifyEmail";
import Home from "./home";
import BrowseMarkets from "./browseMarkets";
import Account from "./account";
import Admin from "./admin";

// read email from the URL and pass it to the verification page
function VerifyEmailRoute() {
  const [searchParams] = useSearchParams();
  return <VerifyEmail email={searchParams.get("email") ?? ""} />;
}

// read users email from URL and pass it to the reset page
function ResetPasswordRoute() {
  const [searchParams] = useSearchParams();
  return <ResetPassword email={searchParams.get("email") ?? ""} />;
}

// users must be logged in
function RequireLogin() {
  const token = sessionStorage.getItem("authToken");

  if (token) {
    try {
      const [, payload] = token.split(".");
      const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
      const claims = JSON.parse(atob(base64));

      if (typeof claims?.exp === "number" && claims.exp * 1000 > Date.now()) {
        return <Outlet />;
      }
    } catch {
      // An unreadable token requires a fresh login.
    }
  }

  return <Navigate to="/login" replace />;
}

// admin pages: hides them from regular users (the API also rejects non-admins)
function RequireAdmin() {
  if (sessionStorage.getItem("authRole") === "admin") {
    return <Outlet />;
  }

  return <Navigate to="/" replace />;
}

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element was not found.");
}

createRoot(rootElement).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route element={<RequireLogin />}>
          <Route path="/" element={<Home />} />
          <Route path="/browse-markets" element={<BrowseMarkets />} />
          <Route path="/account" element={<Account />} />

          <Route element={<RequireAdmin />}>
            <Route path="/admin" element={<Admin />} />
          </Route>
        </Route>

        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPasswordRoute />} />
        <Route path="/verify-email" element={<VerifyEmailRoute />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
