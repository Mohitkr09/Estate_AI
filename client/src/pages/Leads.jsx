
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Users,
  UserRound,
  Phone,
  Building2,
  CalendarDays,
  Search,
  Plus,
  RefreshCw,
  Pencil,
  AlertCircle,
  CheckCircle2,
  Filter,
  X,
  Wallet,
  ArrowUpRight,
  Clock3,
  TrendingUp,
  SlidersHorizontal,
  CircleDollarSign,
} from "lucide-react";

import AddLeadModal from "../components/AddLeadModal";
import { api } from "../services/api";

const LEAD_STATUSES = ["New", "Contacted", "Qualified", "Visited"];

function getErrorMessage(error) {
  const detail = error?.response?.data?.detail;

  if (typeof detail === "string") return detail;

  if (Array.isArray(detail)) {
    return detail.map((item) => item.msg || "Invalid input").join(", ");
  }

  if (error?.response?.status === 401) {
    return "Your session has expired. Please sign in again.";
  }

  if (error?.response?.status === 403) {
    return "You do not have permission to access these leads.";
  }

  if (error?.code === "ERR_NETWORK") {
    return "Cannot connect to the backend. Check your connection and try again.";
  }

  return error?.message || "Something went wrong. Please try again.";
}

function normalizeLeads(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.leads)) return data.leads;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatBudget(value) {
  if (value === null || value === undefined || value === "") {
    return "Not specified";
  }

  const amount = Number(value);
  if (!Number.isFinite(amount)) return String(value);

  if (amount >= 10000000) {
    return `₹${(amount / 10000000).toLocaleString("en-IN", {
      maximumFractionDigits: 2,
    })} Cr`;
  }

  if (amount >= 100000) {
    return `₹${(amount / 100000).toLocaleString("en-IN", {
      maximumFractionDigits: 2,
    })} L`;
  }

  return `₹${amount.toLocaleString("en-IN")}`;
}

function getInitials(name) {
  return String(name || "Lead")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");
}

function StatusBadge({ status }) {
  const normalized =
    LEAD_STATUSES.find(
      (item) => item.toLowerCase() === String(status || "").toLowerCase()
    ) || status || "New";

  const styles = {
    New: "bg-emerald-50 text-emerald-800 ring-emerald-200",
    Contacted: "bg-lime-50 text-lime-800 ring-lime-200",
    Qualified: "bg-teal-50 text-teal-800 ring-teal-200",
    Visited: "bg-green-100 text-green-800 ring-green-200",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-inset ${
        styles[normalized] || "bg-slate-100 text-slate-600 ring-slate-200"
      }`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {normalized}
    </span>
  );
}

function MetricCard({
  title,
  value,
  description,
  icon: Icon,
  tone = "emerald",
  percentage,
}) {
  const tones = {
    emerald: "bg-emerald-50 text-emerald-800 ring-emerald-100",
    green: "bg-green-50 text-green-800 ring-green-100",
    teal: "bg-teal-50 text-teal-800 ring-teal-100",
    lime: "bg-lime-50 text-lime-800 ring-lime-100",
  };

  return (
    <article className="group relative overflow-hidden rounded-2xl border border-emerald-950/5 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-emerald-200 hover:shadow-lg hover:shadow-emerald-950/5 sm:p-6">
      <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-emerald-50 opacity-0 blur-2xl transition group-hover:opacity-100" />

      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">{title}</p>

          <p className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
            {value}
          </p>
        </div>

        <div
          className={`rounded-2xl p-3 ring-1 transition duration-200 group-hover:scale-105 ${
            tones[tone] || tones.emerald
          }`}
        >
          <Icon size={22} strokeWidth={1.8} />
        </div>
      </div>

      <div className="relative mt-5 flex items-center gap-2 border-t border-slate-100 pt-3">
        <ArrowUpRight size={15} className="shrink-0 text-emerald-700" />
        <p className="text-xs leading-5 text-slate-500">{description}</p>
        {percentage !== undefined && (
          <span className="ml-auto text-xs font-bold text-emerald-800">
            {percentage}%
          </span>
        )}
      </div>
    </article>
  );
}

function LoadingState() {
  return (
    <div className="space-y-3 p-5 sm:p-7" aria-label="Loading leads">
      {[1, 2, 3, 4].map((item) => (
        <div
          key={item}
          className="flex animate-pulse items-center gap-4 rounded-xl border border-slate-100 p-4"
        >
          <div className="h-11 w-11 shrink-0 rounded-xl bg-emerald-100" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-36 max-w-full rounded bg-slate-200" />
            <div className="h-3 w-52 max-w-full rounded bg-slate-100" />
          </div>
          <div className="hidden h-7 w-20 rounded-full bg-emerald-50 sm:block" />
        </div>
      ))}
    </div>
  );
}

export default function Leads() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sourceFilter, setSourceFilter] = useState("All");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState(null);

  const loadLeads = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      const response = await api.get("/api/leads");
      setLeads(normalizeLeads(response.data));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadLeads();
  }, [loadLeads]);

  const sources = useMemo(
    () =>
      [...new Set(leads.map((lead) => lead.source).filter(Boolean))].sort(),
    [leads]
  );

  const filteredLeads = useMemo(() => {
    const query = search.trim().toLowerCase();

    return leads.filter((lead) => {
      const matchesSearch = [
        lead.id,
        lead.name,
        lead.phone,
        lead.project,
        lead.source,
      ].some((value) =>
        String(value ?? "").toLowerCase().includes(query)
      );

      const matchesStatus =
        statusFilter === "All" ||
        String(lead.status || "New").toLowerCase() ===
          statusFilter.toLowerCase();

      const matchesSource =
        sourceFilter === "All" || lead.source === sourceFilter;

      return matchesSearch && matchesStatus && matchesSource;
    });
  }, [leads, search, statusFilter, sourceFilter]);

  const stats = useMemo(() => {
    const count = (status) =>
      leads.filter(
        (lead) =>
          String(lead.status || "New").toLowerCase() === status.toLowerCase()
      ).length;

    const total = leads.length;
    const qualified = count("Qualified");

    return {
      total,
      newLeads: count("New"),
      contacted: count("Contacted"),
      qualified,
      qualifiedRate: total ? Math.round((qualified / total) * 100) : 0,
    };
  }, [leads]);

  function openAddModal() {
    setEditingLead(null);
    setModalOpen(true);
    setNotice(null);
  }

  function openEditModal(lead) {
    setEditingLead(lead);
    setModalOpen(true);
    setNotice(null);
  }

  async function handleCreated() {
    setModalOpen(false);
    setEditingLead(null);
    await loadLeads();
    setNotice("Lead created successfully.");
  }

  async function handleUpdated() {
    setModalOpen(false);
    setEditingLead(null);
    await loadLeads();
    setNotice("Lead updated successfully.");
  }

  function clearFilters() {
    setSearch("");
    setStatusFilter("All");
    setSourceFilter("All");
  }

  const filtersActive =
    Boolean(search) || statusFilter !== "All" || sourceFilter !== "All";

  return (
    <main className="min-h-screen w-full bg-[#f3f8f4] px-4 py-5 text-slate-900 sm:px-6 sm:py-7 lg:px-8">
      <div className="mx-auto w-full max-w-[1600px] space-y-7">
        {/* Premium page header */}
        <header className="relative isolate overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-800 px-5 py-7 shadow-xl shadow-emerald-950/10 sm:px-8 sm:py-9 lg:px-10">
          <div
            className="pointer-events-none absolute -right-12 -top-20 -z-10 h-64 w-64 rounded-full bg-emerald-300/15 blur-3xl"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute bottom-0 right-1/3 -z-10 h-32 w-32 rounded-full bg-lime-300/10 blur-3xl"
            aria-hidden="true"
          />

          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
            <div className="max-w-2xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-100">
                <Building2 size={15} />
                EstateMate AI / CRM
              </div>

              <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Lead Management
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-emerald-50/80 sm:text-base">
                Turn property enquiries into lasting client relationships.
                Track prospects, understand buyer budgets, and manage your
                property sales pipeline from one workspace.
              </p>

              <div className="mt-5 flex flex-wrap gap-2 text-xs font-medium text-emerald-50/90">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-2">
                  <span className="h-2 w-2 rounded-full bg-lime-300" />
                  Lead pipeline
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-2">
                  <Users size={14} />
                  {stats.total} total leads
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-2">
                  <TrendingUp size={14} />
                  {stats.qualifiedRate}% qualified
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => loadLeads(true)}
                disabled={refreshing || loading}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-white/20 focus:outline-none focus:ring-4 focus:ring-white/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RefreshCw
                  size={16}
                  className={refreshing ? "animate-spin" : ""}
                />
                {refreshing ? "Refreshing..." : "Refresh"}
              </button>

              <button
                type="button"
                onClick={openAddModal}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-lime-300 px-5 py-3 text-sm font-bold text-emerald-950 shadow-md shadow-black/10 transition hover:bg-lime-200 focus:outline-none focus:ring-4 focus:ring-lime-200/40"
              >
                <Plus size={18} />
                Add new lead
              </button>
            </div>
          </div>
        </header>

        {/* Analytics cards */}
        <section aria-label="Lead analytics" className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-800">
                Performance overview
              </p>
              <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-900">
                Your sales pipeline
              </h2>
            </div>
            <p className="text-xs text-slate-500">
              Based on currently loaded lead records
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              title="Total leads"
              value={stats.total}
              description="All accessible lead records"
              icon={Users}
              tone="emerald"
            />

            <MetricCard
              title="New leads"
              value={stats.newLeads}
              description="Awaiting further contact"
              icon={UserRound}
              tone="green"
            />

            <MetricCard
              title="Contacted"
              value={stats.contacted}
              description="Marked as contacted"
              icon={Phone}
              tone="lime"
            />

            <MetricCard
              title="Qualified"
              value={stats.qualified}
              description="Qualified buyer enquiries"
              icon={CheckCircle2}
              tone="teal"
              percentage={stats.qualifiedRate}
            />
          </div>
        </section>

        {/* Error state */}
        {error && (
          <div
            role="alert"
            className="flex flex-col gap-3 rounded-2xl border border-red-200 bg-white p-4 shadow-sm sm:flex-row sm:items-start"
          >
            <span className="rounded-xl bg-red-50 p-2 text-red-700">
              <AlertCircle size={21} />
            </span>

            <div className="min-w-0 flex-1">
              <p className="font-semibold text-red-900">
                Unable to load leads
              </p>
              <p className="mt-1 break-words text-sm leading-6 text-red-800">
                {error}
              </p>
            </div>

            <button
              type="button"
              onClick={() => loadLeads()}
              disabled={loading}
              className="rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-800 transition hover:bg-red-50 disabled:opacity-50"
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
            className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
          >
            <CheckCircle2 size={19} className="shrink-0" />
            <span className="flex-1 font-medium">{notice}</span>
            <button
              type="button"
              aria-label="Dismiss message"
              onClick={() => setNotice(null)}
              className="rounded-lg p-1.5 transition hover:bg-emerald-100"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Lead directory */}
        <section className="overflow-hidden rounded-3xl border border-emerald-950/5 bg-white shadow-sm shadow-emerald-950/[0.03]">
          <div className="border-b border-slate-100 p-5 sm:p-6 lg:p-7">
            <div className="flex flex-col justify-between gap-5 xl:flex-row xl:items-center">
              <div className="flex items-start gap-3">
                <span className="rounded-2xl bg-emerald-100 p-3 text-emerald-900">
                  <Users size={22} />
                </span>

                <div>
                  <h2 className="text-lg font-bold text-slate-950">
                    Lead directory
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Search, filter, and manage your property prospects.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:flex">
                <label className="relative block">
                  <span className="sr-only">Search leads</span>
                  <Search
                    size={17}
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search name, phone, ID..."
                    aria-label="Search leads"
                    className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-10 pr-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100 sm:w-64"
                  />
                </label>

                <label className="relative block">
                  <span className="sr-only">Filter by status</span>
                  <Filter
                    size={16}
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <select
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value)}
                    aria-label="Filter by lead status"
                    className="h-12 w-full appearance-none rounded-xl border border-slate-200 bg-slate-50/70 pl-10 pr-9 text-sm outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100 sm:w-44"
                  >
                    <option value="All">All statuses</option>
                    {LEAD_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="relative block">
                  <span className="sr-only">Filter by lead source</span>
                  <SlidersHorizontal
                    size={16}
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <select
                    value={sourceFilter}
                    onChange={(event) => setSourceFilter(event.target.value)}
                    aria-label="Filter by lead source"
                    className="h-12 w-full appearance-none rounded-xl border border-slate-200 bg-slate-50/70 pl-10 pr-8 text-sm outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100 sm:w-44"
                  >
                    <option value="All">All sources</option>
                    {sources.map((source) => (
                      <option key={source} value={source}>
                        {source}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-slate-500" aria-live="polite">
                Showing{" "}
                <span className="font-bold text-slate-900">
                  {filteredLeads.length}
                </span>{" "}
                of{" "}
                <span className="font-bold text-slate-900">
                  {leads.length}
                </span>{" "}
                leads
              </p>

              {filtersActive && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-50"
                >
                  <X size={15} />
                  Clear filters
                </button>
              )}
            </div>
          </div>

          {/* Loading */}
          {loading ? (
            <LoadingState />
          ) : filteredLeads.length === 0 ? (
            <div className="flex min-h-80 flex-col items-center justify-center px-6 py-14 text-center">
              <div className="rounded-2xl bg-emerald-50 p-5 text-emerald-800 ring-1 ring-emerald-100">
                <Users size={32} />
              </div>

              <h3 className="mt-5 text-lg font-bold text-slate-950">
                {leads.length === 0 ? "Your lead directory is empty" : "No matching leads"}
              </h3>

              <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
                {leads.length === 0
                  ? "Create your first lead to start organizing property enquiries and building your sales pipeline."
                  : "Try changing your search, status, or source filter to find the lead you're looking for."}
              </p>

              {leads.length === 0 && !error ? (
                <button
                  type="button"
                  onClick={openAddModal}
                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-emerald-800 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-900 focus:outline-none focus:ring-4 focus:ring-emerald-100"
                >
                  <Plus size={17} />
                  Create your first lead
                </button>
              ) : filtersActive ? (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="mt-5 rounded-xl border border-emerald-200 px-4 py-2.5 text-sm font-semibold text-emerald-900 transition hover:bg-emerald-50"
                >
                  Clear filters
                </button>
              ) : null}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px] text-left">
                <thead>
                  <tr className="border-b border-emerald-100 bg-emerald-50/60">
                    {[
                      "Lead details",
                      "Contact",
                      "Project",
                      "Budget",
                      "Source",
                      "Status",
                      "Created",
                      "Actions",
                    ].map((heading) => (
                      <th
                        key={heading}
                        scope="col"
                        className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-emerald-950/65"
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredLeads.map((lead, index) => (
                    <tr
                      key={lead.id || lead.phone || index}
                      className="group transition-colors hover:bg-emerald-50/40"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-100 to-green-50 text-sm font-bold text-emerald-900 ring-1 ring-emerald-200/70">
                            {getInitials(lead.name)}
                          </div>

                          <div className="min-w-0">
                            <p className="max-w-48 truncate text-sm font-bold text-slate-900">
                              {lead.name || "Unnamed lead"}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              ID: {lead.id || "Not available"}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2 text-sm text-slate-700">
                          <Phone
                            size={14}
                            className="shrink-0 text-emerald-700"
                          />
                          {lead.phone || "—"}
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2 text-sm text-slate-700">
                          <Building2
                            size={15}
                            className="shrink-0 text-emerald-700"
                          />
                          <span className="max-w-40 truncate">
                            {lead.project || "—"}
                          </span>
                        </div>

                        {lead.bhk && (
                          <p className="mt-1 pl-6 text-xs text-slate-500">
                            {lead.bhk}
                          </p>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2 whitespace-nowrap text-sm font-semibold text-slate-800">
                          <CircleDollarSign
                            size={15}
                            className="shrink-0 text-emerald-700"
                          />
                          {formatBudget(lead.budget)}
                        </div>
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-600">
                        {lead.source || "—"}
                      </td>

                      <td className="px-5 py-4">
                        <StatusBadge status={lead.status} />
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2 whitespace-nowrap text-sm text-slate-600">
                          <CalendarDays
                            size={14}
                            className="text-emerald-700"
                          />
                          {formatDate(lead.created_at)}
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <button
                          type="button"
                          onClick={() => openEditModal(lead)}
                          aria-label={`Edit lead ${lead.name || lead.id || ""}`}
                          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-700 shadow-sm transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-900 focus:outline-none focus:ring-4 focus:ring-emerald-100"
                        >
                          <Pencil size={14} />
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!loading && leads.length > 0 && (
            <footer className="flex flex-col justify-between gap-3 border-t border-emerald-100 bg-emerald-50/40 px-5 py-4 text-xs text-slate-600 sm:flex-row sm:items-center sm:px-6">
              <span>
                {filteredLeads.length} matching record
                {filteredLeads.length === 1 ? "" : "s"}
              </span>

              <span className="inline-flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <Clock3 size={14} className="text-emerald-700" />
                Data from EstateMate AI
              </span>
            </footer>
          )}
        </section>

        <footer className="flex flex-col items-center justify-between gap-2 border-t border-emerald-900/10 pt-5 text-xs text-slate-400 sm:flex-row">
          <span>EstateMate AI · Property sales CRM</span>
          <span>Every enquiry is an opportunity.</span>
        </footer>
      </div>

      {/* Add / edit lead modal */}
      {modalOpen && (
        <AddLeadModal
          lead={editingLead}
          onClose={() => {
            setModalOpen(false);
            setEditingLead(null);
          }}
          onCreated={handleCreated}
          onUpdated={handleUpdated}
        />
      )}
    </main>
  );
}
