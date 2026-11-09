
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { api, getStoredUser } from "../services/api";

const STATUSES = ["pending", "in_progress", "resolved", "cancelled"];

const STATUS_STYLES = {
  pending: "bg-amber-50 text-amber-800 ring-amber-600/20",
  in_progress: "bg-emerald-50 text-emerald-800 ring-emerald-600/20",
  resolved: "bg-green-100 text-green-800 ring-green-600/20",
  cancelled: "bg-slate-100 text-slate-600 ring-slate-500/20",
};

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusLabel(status) {
  return (status || "unknown")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function getApiError(error, fallback) {
  const detail = error.response?.data?.detail;

  if (typeof detail === "string") return detail;

  if (Array.isArray(detail)) {
    return detail.map((item) => item.msg || "Invalid input").join(", ");
  }

  if (error.response?.status === 401) {
    return "Your session may have expired. Please sign in again.";
  }

  if (error.response?.status === 403) {
    return "You do not have permission to perform this action.";
  }

  if (!error.response && error.request) {
    return "Unable to connect to the server. Check your connection and try again.";
  }

  return error.message || fallback;
}

function Icon({ name, size = 20, className = "" }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    className,
    "aria-hidden": true,
  };

  const paths = {
    inbox: (
      <>
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <path d="M3 13h5l2 3h4l2-3h5" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    activity: <path d="M3 12h4l3-8 4 16 3-8h4" />,
    check: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="m8 12 2.5 2.5L16 9" />
      </>
    ),
    close: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="m9 9 6 6m0-6-6 6" />
      </>
    ),
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m16 16 4 4" />
      </>
    ),
    refresh: (
      <>
        <path d="M20 7v5h-5" />
        <path d="M4 17v-5h5" />
        <path d="M5.5 9A7 7 0 0 1 18 6l2 6" />
        <path d="M18.5 15A7 7 0 0 1 6 18l-2-6" />
      </>
    ),
    user: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M5 21a7 7 0 0 1 14 0" />
      </>
    ),
    building: (
      <>
        <rect x="4" y="3" width="16" height="18" rx="2" />
        <path d="M9 7h2m2 0h2M9 11h2m2 0h2M9 15h2m2 0h2M10 21v-3h4v3" />
      </>
    ),
    calendar: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M16 3v4M8 3v4M3 10h18" />
      </>
    ),
    shield: (
      <>
        <path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" />
        <path d="m9 12 2 2 4-4" />
      </>
    ),
  };

  return <svg {...common}>{paths[name] || paths.inbox}</svg>;
}

function StatusBadge({ status }) {
  const normalized = STATUSES.includes(status) ? status : "cancelled";

  const dotStyles = {
    pending: "bg-amber-500",
    in_progress: "bg-emerald-600",
    resolved: "bg-green-600",
    cancelled: "bg-slate-400",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-inset ${STATUS_STYLES[normalized]}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dotStyles[normalized]}`} />
      {statusLabel(status)}
    </span>
  );
}

function StatCard({ label, value, icon, tone, active, onClick }) {
  const tones = {
    emerald: "bg-emerald-50 text-emerald-800",
    amber: "bg-amber-50 text-amber-700",
    green: "bg-green-50 text-green-800",
    slate: "bg-slate-100 text-slate-600",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`group rounded-2xl border bg-white p-4 text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-4 focus:ring-emerald-100 sm:p-5 ${
        active
          ? "border-emerald-500 ring-2 ring-emerald-100"
          : "border-slate-200 hover:border-emerald-300"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
            {value}
          </p>
        </div>

        <span
          className={`rounded-xl p-3 transition group-hover:scale-105 ${tones[tone] || tones.emerald}`}
        >
          <Icon name={icon} size={21} />
        </span>
      </div>

      <p className="mt-3 text-xs font-medium text-slate-400">
        View matching requests
      </p>
    </button>
  );
}

function LoadingCards() {
  return (
    <div className="space-y-4 p-4 sm:p-6" aria-label="Loading requests">
      {[1, 2, 3].map((item) => (
        <div
          key={item}
          className="animate-pulse rounded-2xl border border-slate-200 p-5"
        >
          <div className="h-4 w-40 rounded bg-slate-200" />
          <div className="mt-4 h-3 w-64 max-w-full rounded bg-slate-100" />
          <div className="mt-3 h-3 w-48 max-w-full rounded bg-slate-100" />
          <div className="mt-5 h-10 rounded-lg bg-slate-100" />
        </div>
      ))}
    </div>
  );
}

export default function Handoffs() {
  const [user, setUser] = useState(null);
  const [handoffs, setHandoffs] = useState([]);
  const [filter, setFilter] = useState("pending");
  const [search, setSearch] = useState("");
  const [assignments, setAssignments] = useState({});
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    try {
      setUser(getStoredUser());
    } catch (err) {
      console.error("Unable to read current user:", err);
      setUser(null);
    }
  }, []);

  const isAdmin = user?.role?.toLowerCase() === "admin";

  const loadHandoffs = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    setError("");

    try {
      const response = await api.get("/api/handoffs");
      const result = response.data;

      if (!Array.isArray(result)) {
        throw new Error("The server returned an unexpected handoff response.");
      }

      setHandoffs(result);
    } catch (err) {
      setError(getApiError(err, "Failed to load handoff requests."));
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHandoffs();
  }, [loadHandoffs]);

  const counts = useMemo(() => {
    const result = {
      all: handoffs.length,
      pending: 0,
      in_progress: 0,
      resolved: 0,
      cancelled: 0,
    };

    handoffs.forEach((item) => {
      if (Object.prototype.hasOwnProperty.call(result, item.status)) {
        result[item.status] += 1;
      }
    });

    return result;
  }, [handoffs]);

  const visibleHandoffs = useMemo(() => {
    const query = search.trim().toLowerCase();

    return handoffs.filter((item) => {
      const matchesStatus = filter === "all" || item.status === filter;

      const searchableText = [
        item.buyer_name,
        item.buyer_phone,
        item.project,
        item.reason,
        item.assigned_to,
        item.id,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return matchesStatus && (!query || searchableText.includes(query));
    });
  }, [handoffs, filter, search]);

  async function updateHandoff(id, changes) {
    if (updatingId !== null) return;

    setUpdatingId(id);
    setError("");
    setNotice("");

    try {
      await api.patch(
        `/api/handoffs/${encodeURIComponent(id)}`,
        changes
      );

      setNotice("Handoff request updated successfully.");
      await loadHandoffs({ silent: true });
    } catch (err) {
      setError(getApiError(err, "Failed to update the handoff request."));
    } finally {
      setUpdatingId(null);
    }
  }

  async function assignHandoff(id) {
    if (!isAdmin) {
      setError("Only administrators can assign handoff requests.");
      return;
    }

    const assignedTo = (
      assignments[id] ??
      handoffs.find((item) => item.id === id)?.assigned_to ??
      ""
    ).trim();

    if (!assignedTo) {
      setError("Enter a sales executive name before assigning.");
      return;
    }

    await updateHandoff(id, { assigned_to: assignedTo });
  }

  function handleFilterChange(nextFilter) {
    setFilter(nextFilter);
    setNotice("");
  }

  return (
    <main className="min-h-screen bg-[#f4f8f5] text-slate-900">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        {/* Page header */}
        <header className="relative mb-8 overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-950 via-emerald-900 to-green-800 shadow-xl">
          <div className="pointer-events-none absolute -right-12 -top-24 h-64 w-64 rounded-full bg-emerald-300/15 blur-3xl" />
          <div className="pointer-events-none absolute bottom-0 right-1/4 h-32 w-32 rounded-full bg-lime-300/10 blur-3xl" />

          <div className="relative px-5 py-7 sm:px-8 sm:py-9 lg:px-10">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="max-w-2xl">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold tracking-wide text-emerald-100">
                  <Icon name="shield" size={15} />
                  ESTATEMATE AI · SALES OPERATIONS
                </div>

                <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                  Human Handoffs
                </h1>

                <p className="mt-3 max-w-xl text-sm leading-6 text-emerald-50/80 sm:text-base">
                  Keep buyer assistance requests moving. Assign ownership,
                  track progress, and resolve every handoff from one workspace.
                </p>

                <div className="mt-5 flex flex-wrap items-center gap-2 text-sm text-emerald-50/90">
                  <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5">
                    <Icon name="user" size={15} />
                    {user?.username || "User"}
                  </span>

                  <span className="rounded-full border border-white/15 px-3 py-1.5 capitalize">
                    {user?.role || "Role unavailable"}
                  </span>

                  <span className="inline-flex items-center gap-2 rounded-full border border-white/15 px-3 py-1.5">
                    <span className="h-2 w-2 rounded-full bg-lime-300" />
                    Handoff workspace
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => loadHandoffs()}
                disabled={loading}
                className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Icon
                  name="refresh"
                  size={17}
                  className={loading ? "animate-spin" : ""}
                />
                {loading ? "Refreshing..." : "Refresh requests"}
              </button>
            </div>
          </div>
        </header>

        {/* Error feedback */}
        {error && (
          <div
            role="alert"
            className="mb-5 flex flex-col gap-3 rounded-2xl border border-red-200 bg-white p-4 shadow-sm sm:flex-row sm:items-start sm:justify-between"
          >
            <div className="flex items-start gap-3">
              <span className="rounded-xl bg-red-50 p-2 text-red-700">
                <Icon name="close" size={20} />
              </span>
              <div>
                <p className="font-semibold text-red-900">
                  Something needs your attention
                </p>
                <p className="mt-1 text-sm leading-5 text-red-800">{error}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => loadHandoffs()}
              disabled={loading}
              className="shrink-0 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-800 transition hover:bg-red-50 disabled:opacity-50"
            >
              Try again
            </button>
          </div>
        )}

        {/* Success feedback */}
        {notice && (
          <div
            role="status"
            aria-live="polite"
            className="mb-5 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900"
          >
            <Icon name="check" size={20} className="mt-0.5 shrink-0" />
            <p className="font-semibold">{notice}</p>
            <button
              type="button"
              onClick={() => setNotice("")}
              aria-label="Dismiss success message"
              className="ml-auto rounded-lg px-2 py-1 text-emerald-800 transition hover:bg-emerald-100"
            >
              ×
            </button>
          </div>
        )}

        {/* Summary cards */}
        <section
          aria-label="Handoff request summary"
          className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
        >
          <StatCard
            label="Pending"
            value={counts.pending}
            icon="clock"
            tone="amber"
            active={filter === "pending"}
            onClick={() => handleFilterChange("pending")}
          />

          <StatCard
            label="In progress"
            value={counts.in_progress}
            icon="activity"
            tone="emerald"
            active={filter === "in_progress"}
            onClick={() => handleFilterChange("in_progress")}
          />

          <StatCard
            label="Resolved"
            value={counts.resolved}
            icon="check"
            tone="green"
            active={filter === "resolved"}
            onClick={() => handleFilterChange("resolved")}
          />

          <StatCard
            label="Cancelled"
            value={counts.cancelled}
            icon="close"
            tone="slate"
            active={filter === "cancelled"}
            onClick={() => handleFilterChange("cancelled")}
          />
        </section>

        {/* Request management */}
        <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-5 sm:p-6">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex items-center gap-3">
                <span className="rounded-xl bg-emerald-50 p-2.5 text-emerald-800">
                  <Icon name="inbox" size={21} />
                </span>

                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Request management
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Review and manage buyer assistance requests.
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <label className="relative block min-w-0 sm:min-w-64">
                  <span className="sr-only">Search requests</span>
                  <Icon
                    name="search"
                    size={18}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search buyer, project, ID..."
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-50"
                  />
                </label>

                <label className="flex items-center gap-2">
                  <span className="sr-only">Filter by status</span>
                  <select
                    value={filter}
                    onChange={(event) => handleFilterChange(event.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50 sm:w-auto"
                  >
                    <option value="all">All statuses ({counts.all})</option>
                    {STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {statusLabel(status)} ({counts[status]})
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-slate-500" aria-live="polite">
                {loading
                  ? "Loading requests..."
                  : `Showing ${visibleHandoffs.length} of ${counts.all} requests`}
              </p>

              {(search || filter !== "pending") && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setFilter("pending");
                  }}
                  className="rounded-lg px-3 py-1.5 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-50"
                >
                  Reset filters
                </button>
              )}
            </div>
          </div>

          {/* Requests */}
          {loading ? (
            <LoadingCards />
          ) : visibleHandoffs.length === 0 ? (
            <div className="px-5 py-16 text-center sm:px-8">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                <Icon name="inbox" size={30} />
              </div>

              <h3 className="mt-5 text-lg font-bold text-slate-900">
                {search ? "No matching requests" : "No requests in this view"}
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                {search
                  ? "Try another name, project, reference ID, or clear your search."
                  : "When requests match the selected status, they will appear here."}
              </p>

              {(search || filter !== "pending") && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setFilter("all");
                  }}
                  className="mt-5 rounded-xl bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-900 focus:outline-none focus:ring-4 focus:ring-emerald-100"
                >
                  View all requests
                </button>
              )}

              {error && (
                <button
                  type="button"
                  onClick={() => loadHandoffs()}
                  className="ml-2 mt-5 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Retry loading
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {visibleHandoffs.map((item) => {
                const isUpdating = updatingId === item.id;
                const assignmentValue =
                  assignments[item.id] ?? item.assigned_to ?? "";

                return (
                  <article
                    key={item.id}
                    className="p-5 transition-colors hover:bg-emerald-50/20 sm:p-6"
                  >
                    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
                      {/* Request details */}
                      <div className="min-w-0">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2.5">
                              <h3 className="break-words text-base font-bold text-slate-900 sm:text-lg">
                                {item.buyer_name || "Buyer name not provided"}
                              </h3>
                              <StatusBadge status={item.status} />
                            </div>

                            <p className="mt-2 break-all text-xs text-slate-400">
                              Reference ID: {item.id}
                            </p>
                          </div>

                          <div className="flex shrink-0 items-center gap-2 text-xs text-slate-500">
                            <Icon name="calendar" size={15} />
                            <span>{formatDate(item.created_at)}</span>
                          </div>
                        </div>

                        <div className="mt-5 grid gap-4 sm:grid-cols-2">
                          <div className="rounded-xl border border-slate-100 bg-white p-3.5">
                            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                              <Icon name="building" size={15} />
                              Project
                            </div>
                            <p className="mt-2 break-words text-sm font-semibold text-slate-800">
                              {item.project || "Not specified"}
                            </p>
                          </div>

                          <div className="rounded-xl border border-slate-100 bg-white p-3.5">
                            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                              <Icon name="user" size={15} />
                              Assigned executive
                            </div>
                            <p className="mt-2 break-words text-sm font-semibold text-slate-800">
                              {item.assigned_to || "Awaiting assignment"}
                            </p>
                          </div>
                        </div>

                        <div className="mt-4">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                            Reason for handoff
                          </p>
                          <p className="mt-1.5 whitespace-pre-wrap break-words text-sm leading-6 text-slate-600">
                            {item.reason || "No reason provided."}
                          </p>
                        </div>

                        <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50/50 p-4">
                          <div className="flex items-start gap-3">
                            <span className="rounded-lg bg-white p-2 text-emerald-800 shadow-sm">
                              <Icon name="shield" size={18} />
                            </span>

                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-slate-800">
                                Contact information
                              </p>

                              {item.consent ? (
                                <p className="mt-1 break-all text-sm text-slate-600">
                                  {item.buyer_phone || "Phone number not provided"}
                                </p>
                              ) : (
                                <p className="mt-1 text-sm leading-5 text-slate-500">
                                  Consent was not recorded. Follow your
                                  organization's contact policy before outreach.
                                </p>
                              )}

                              <p className="mt-1 text-xs text-slate-400">
                                {item.consent
                                  ? "Consent recorded for this request."
                                  : "Contact details may be unavailable."}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Request actions */}
                      <aside className="h-fit space-y-4 rounded-2xl border border-emerald-100 bg-gradient-to-b from-emerald-50/70 to-white p-4 sm:p-5">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="rounded-lg bg-emerald-100 p-2 text-emerald-800">
                              <Icon name="activity" size={17} />
                            </span>
                            <h4 className="text-sm font-bold text-slate-900">
                              Request actions
                            </h4>
                          </div>
                          <p className="mt-2 text-xs leading-5 text-slate-500">
                            Update ownership and track progress.
                          </p>
                        </div>

                        {isAdmin && (
                          <div>
                            <label
                              htmlFor={`assignee-${item.id}`}
                              className="mb-2 block text-sm font-semibold text-slate-700"
                            >
                              Assign sales executive
                            </label>

                            <input
                              id={`assignee-${item.id}`}
                              type="text"
                              value={assignmentValue}
                              onChange={(event) =>
                                setAssignments((current) => ({
                                  ...current,
                                  [item.id]: event.target.value,
                                }))
                              }
                              onKeyDown={(event) => {
                                if (event.key === "Enter") {
                                  event.preventDefault();
                                  assignHandoff(item.id);
                                }
                              }}
                              placeholder="Enter executive name"
                              maxLength={100}
                              disabled={isUpdating || updatingId !== null}
                              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50 disabled:cursor-not-allowed disabled:bg-slate-50"
                            />

                            <button
                              type="button"
                              onClick={() => assignHandoff(item.id)}
                              disabled={
                                isUpdating ||
                                updatingId !== null ||
                                !assignmentValue.trim() ||
                                assignmentValue.trim() ===
                                  (item.assigned_to || "").trim()
                              }
                              className="mt-2 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-100 px-3 py-2 text-sm font-semibold text-emerald-900 transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {isUpdating ? (
                                <>
                                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-300 border-t-emerald-800" />
                                  Saving changes...
                                </>
                              ) : (
                                "Save assignment"
                              )}
                            </button>
                          </div>
                        )}

                        <div>
                          <label
                            htmlFor={`status-${item.id}`}
                            className="mb-2 block text-sm font-semibold text-slate-700"
                          >
                            Update status
                          </label>

                          <select
                            id={`status-${item.id}`}
                            value={item.status || "pending"}
                            disabled={updatingId !== null}
                            onChange={(event) =>
                              updateHandoff(item.id, {
                                status: event.target.value,
                              })
                            }
                            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50 disabled:cursor-not-allowed disabled:bg-slate-50"
                          >
                            {STATUSES.map((status) => (
                              <option key={status} value={status}>
                                {statusLabel(status)}
                              </option>
                            ))}
                          </select>

                          <p className="mt-2 text-xs leading-5 text-slate-400">
                            Status changes are saved to the server.
                          </p>
                        </div>
                      </aside>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {!loading && handoffs.length > 0 && (
            <footer className="flex flex-col gap-2 border-t border-slate-200 bg-emerald-50/40 px-5 py-4 text-xs text-slate-600 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <span>
                {counts.all} total request{counts.all === 1 ? "" : "s"}
              </span>
              <span>
                {counts.pending} pending · {counts.in_progress} in progress ·{" "}
                {counts.resolved} resolved
              </span>
            </footer>
          )}
        </section>

        <footer className="mt-6 flex flex-col items-center justify-between gap-2 border-t border-slate-200 pt-5 text-xs text-slate-400 sm:flex-row">
          <span>EstateMate AI · Human handoff management</span>
          <span>Manage every buyer request with confidence.</span>
        </footer>
      </div>
    </main>
  );
}
