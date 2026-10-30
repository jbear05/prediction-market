import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useSearchParams,
} from "react-router";
import Login from "./login";
import Register from "./register";
import ForgotPassword from "./forgotPassword";
import ResetPassword from "./resetPassword";
import VerifyEmail from "./verifyEmail";

// login and register send the user to /verify-email?uid=...
// this reads the uid from the URL and hands it to Adam's page as a prop
function VerifyEmailRoute() {
  const [searchParams] = useSearchParams();
  return <VerifyEmail uid={searchParams.get("uid") ?? ""} />;
}

// read users email from URL and pass it to the reset page
function ResetPasswordRoute() {
  const [searchParams] = useSearchParams();
  return <ResetPassword email={searchParams.get("email") ?? ""} />;
}

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element was not found.");
}

createRoot(rootElement).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        {/* placeholder until the home page exists */}
        <Route
          path="/"
          element={
            <main className="auth-page">
              <h2 className="auth-heading">Home page coming soon</h2>
            </main>
          }
        />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPasswordRoute />} />
        <Route path="/verify-email" element={<VerifyEmailRoute />} />
        {/* any unknown URL goes to login */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
