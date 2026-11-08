
import React, { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { getStoredToken, getStoredUser, login } from "../services/api";

export default function Login() {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // If already authenticated, skip the login page.
  if (getStoredToken() && getStoredUser()) {
    return <Navigate to="/overview" replace />;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (!username.trim() || !password) {
      setError("Please enter your username and password.");
      return;
    }

    setLoading(true);

    try {
      await login(username.trim(), password);
      navigate("/overview", { replace: true });
    } catch (err) {
      const detail = err.response?.data?.detail;

      setError(
        typeof detail === "string"
          ? detail
          : "Login failed. Check your credentials and try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-2xl font-bold text-white shadow-lg">
            E
          </div>

          <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900">
            EstateMate AI
          </h1>

          <p className="mt-2 text-sm text-slate-600">
            Sign in to manage your real estate workspace.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl sm:p-8"
        >
          <h2 className="text-xl font-semibold text-slate-900">
            Welcome back
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Enter your account credentials to continue.
          </p>

          {error && (
            <div
              role="alert"
              className="mt-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
            >
              {error}
            </div>
          )}

          <div className="mt-6 space-y-5">
            <div>
              <label
                htmlFor="username"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Username
              </label>

              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="Enter your username"
                required
                disabled={loading}
                className="w-full rounded-lg border border-slate-300 px-3.5 py-3 text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-50"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Password
              </label>

              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password"
                required
                disabled={loading}
                className="w-full rounded-lg border border-slate-300 px-3.5 py-3 text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-50"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-indigo-600 px-4 py-3 font-semibold text-white transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </div>

          <p className="mt-6 text-center text-xs leading-5 text-slate-500">
            Access is available to authorized EstateMate AI users.
            Contact your administrator if you need an account.
          </p>
        </form>

        <p className="mt-6 text-center text-xs text-slate-500">
          EstateMate AI · Secure workspace
        </p>
      </div>
    </main>
  );
}
