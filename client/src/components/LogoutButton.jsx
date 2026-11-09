
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { logout } from "../services/api";

export default function LogoutButton() {
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = () => {
    if (loggingOut) return;

    setLoggingOut(true);

    try {
      // Clear the stored authentication session.
      logout();

      // Prevent returning to the authenticated page with Back.
      navigate("/login", {
        replace: true,
      });
    } catch (error) {
      console.error("EstateMate AI logout error:", error);

      // Still redirect if logout encounters an unexpected error.
      navigate("/login", {
        replace: true,
      });
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loggingOut}
      aria-label="Log out of EstateMate AI"
      className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-600 shadow-sm transition hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-300 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <polyline points="16 17 21 12 16 7" />
        <line x1="21" y1="12" x2="9" y2="12" />
      </svg>

      {loggingOut ? "Logging out..." : "Logout"}
    </button>
  );
}
