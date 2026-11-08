
import React, { useCallback, useEffect, useState } from "react";
import { api, getStoredUser } from "../services/api";

const STATUSES = [
  "all",
  "pending",
  "in_progress",
  "resolved",
  "cancelled",
];

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleString();
}

function statusLabel(status) {
  return (status || "").replaceAll("_", " ");
}

function getApiError(error, fallback) {
  const detail = error.response?.data?.detail;

  if (typeof detail === "string") return detail;

  if (Array.isArray(detail)) {
    return detail.map((item) => item.msg).join(", ");
  }

  return error.message || fallback;
}

export default function Handoffs() {
  const user = getStoredUser();
  const isAdmin = user?.role === "admin";

  const [handoffs, setHandoffs] = useState([]);
  const [filter, setFilter] = useState("pending");
  const [assignments, setAssignments] = useState({});
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadHandoffs = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/api/handoffs", {
        params: filter === "all" ? {} : { status: filter },
      });

      const data = response.data;

      if (!Array.isArray(data)) {
        throw new Error("Unexpected handoff API response.");
      }

      setHandoffs(data);
    } catch (err) {
      setError(
        getApiError(err, "Failed to load handoff requests.")
      );
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    loadHandoffs();
  }, [loadHandoffs]);

  async function updateHandoff(id, changes) {
    setUpdatingId(id);
    setError("");
    setNotice("");

    try {
      await api.patch(
        `/api/handoffs/${encodeURIComponent(id)}`,
        changes
      );

      setNotice("Handoff request updated successfully.");

      await loadHandoffs();
    } catch (err) {
      setError(getApiError(err, "Failed to update handoff."));
    } finally {
      setUpdatingId(null);
    }
  }

  async function assignHandoff(id) {
    if (!isAdmin) {
      setError("Only administrators can assign handoff requests.");
      return;
    }

    const assignedTo = (assignments[id] || "").trim();

    if (!assignedTo) {
      setError("Enter a sales executive name before assigning.");
      return;
    }

    await updateHandoff(id, {
      assigned_to: assignedTo,
    });
  }

  const counts = STATUSES.slice(1).reduce((result, status) => {
    result[status] = handoffs.filter(
      (item) => item.status === status
    ).length;

    return result;
  }, {});

  return (
    <main className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">
              EstateMate AI
            </p>

            <h1 className="mt-1 text-3xl font-bold text-slate-900">
              Human Handoffs
            </h1>

            <p className="mt-2 text-slate-600">
              Manage buyer requests for assistance from the sales team.
            </p>

            <p className="mt-2 text-sm text-slate-500">
              Signed in as{" "}
              <span className="font-semibold">
                {user?.username || "User"}
              </span>{" "}
              · Role:{" "}
              <span className="font-semibold capitalize">
                {user?.role || "unknown"}
              </span>
            </p>
          </div>

          <button
            onClick={loadHandoffs}
            disabled={loading}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
          >
            {loading ? "Refreshing..." : "Refresh requests"}
          </button>
        </header>

        {error && (
          <div
            role="alert"
            className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            {error}

            {error.toLowerCase().includes("token") ||
            error.toLowerCase().includes("credentials") ||
            error.includes("401") ? (
              <p className="mt-2">
                Your session may have expired. Please sign in again.
              </p>
            ) : null}
          </div>
        )}

        {notice && (
          <div
            role="status"
            className="mb-5 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"
          >
            {notice}
          </div>
        )}

        <section className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {STATUSES.slice(1).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`rounded-xl border bg-white p-4 text-left shadow-sm transition hover:border-indigo-300 ${
                filter === status
                  ? "border-indigo-500 ring-2 ring-indigo-100"
                  : "border-slate-200"
              }`}
            >
              <p className="text-sm capitalize text-slate-500">
                {statusLabel(status)}
              </p>

              <p className="mt-2 text-2xl font-bold text-slate-900">
                {filter === status
                  ? handoffs.length
                  : counts[status]}
              </p>
            </button>
          ))}
        </section>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-semibold text-slate-900">
              Requests
            </h2>

            <label className="flex items-center gap-2 text-sm text-slate-600">
              Filter

              <select
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800"
              >
                {STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status === "all"
                      ? "All statuses"
                      : statusLabel(status)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {loading ? (
            <div className="p-10 text-center text-slate-500">
              Loading handoff requests...
            </div>
          ) : handoffs.length === 0 ? (
            <div className="p-10 text-center">
              <h3 className="font-semibold text-slate-800">
                No handoff requests found
              </h3>

              <p className="mt-2 text-sm text-slate-500">
                Requests matching this filter will appear here.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {handoffs.map((item) => (
                <article
                  key={item.id}
                  className="p-5 sm:p-6"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-slate-900">
                          {item.buyer_name ||
                            "Buyer name not provided"}
                        </h3>

                        <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium capitalize text-indigo-700">
                          {statusLabel(item.status)}
                        </span>
                      </div>

                      <p className="mt-2 break-all text-xs text-slate-500">
                        Reference: {item.id}
                      </p>

                      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                        <div>
                          <dt className="text-slate-500">
                            Project
                          </dt>

                          <dd className="mt-1 font-medium text-slate-800">
                            {item.project || "Not specified"}
                          </dd>
                        </div>

                        <div>
                          <dt className="text-slate-500">
                            Created
                          </dt>

                          <dd className="mt-1 text-slate-800">
                            {formatDate(item.created_at)}
                          </dd>
                        </div>

                        <div>
                          <dt className="text-slate-500">
                            Reason
                          </dt>

                          <dd className="mt-1 text-slate-800">
                            {item.reason || "Not specified"}
                          </dd>
                        </div>

                        <div>
                          <dt className="text-slate-500">
                            Assigned to
                          </dt>

                          <dd className="mt-1 text-slate-800">
                            {item.assigned_to || "Unassigned"}
                          </dd>
                        </div>
                      </dl>

                      {item.consent && (
                        <div className="mt-4 rounded-lg bg-slate-50 p-3 text-sm">
                          <p className="font-medium text-slate-700">
                            Contact details (consent provided)
                          </p>

                          <p className="mt-1 text-slate-600">
                            Phone: {item.buyer_phone || "Not provided"}
                          </p>
                        </div>
                      )}

                      {!item.consent && (
                        <p className="mt-4 text-xs text-slate-500">
                          Contact details were not provided or consent
                          was not recorded.
                        </p>
                      )}
                    </div>

                    <div className="w-full space-y-3 lg:max-w-xs">
                      {isAdmin && (
                        <>
                          <label className="block text-sm font-medium text-slate-700">
                            Assign sales executive

                            <input
                              type="text"
                              value={
                                assignments[item.id] ??
                                item.assigned_to ??
                                ""
                              }
                              onChange={(event) =>
                                setAssignments((current) => ({
                                  ...current,
                                  [item.id]: event.target.value,
                                }))
                              }
                              placeholder="Enter executive name"
                              maxLength={100}
                              disabled={updatingId === item.id}
                              className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:opacity-50"
                            />
                          </label>

                          <button
                            onClick={() => assignHandoff(item.id)}
                            disabled={updatingId === item.id}
                            className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                          >
                            {updatingId === item.id
                              ? "Saving..."
                              : "Save assignment"}
                          </button>
                        </>
                      )}

                      <label className="block text-sm font-medium text-slate-700">
                        Update status

                        <select
                          value={item.status}
                          disabled={updatingId === item.id}
                          onChange={(event) =>
                            updateHandoff(item.id, {
                              status: event.target.value,
                            })
                          }
                          className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 capitalize outline-none focus:border-indigo-500 disabled:opacity-50"
                        >
                          {STATUSES.slice(1).map((status) => (
                            <option key={status} value={status}>
                              {statusLabel(status)}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
