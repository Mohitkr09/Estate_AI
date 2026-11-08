
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
} from "lucide-react";

import AddLeadModal from "../components/AddLeadModal";
import { api } from "../services/api";

const LEAD_STATUSES = [
  "New",
  "Contacted",
  "Qualified",
  "Visited",
];

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
    return "Cannot connect to the backend. Make sure FastAPI is running.";
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

  if (amount >= 100000) {
    return `₹${(amount / 100000).toLocaleString("en-IN", {
      maximumFractionDigits: 2,
    })}L`;
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
  const styles = {
    New: "bg-blue-50 text-blue-700 ring-blue-200",
    Contacted: "bg-amber-50 text-amber-700 ring-amber-200",
    Qualified: "bg-violet-50 text-violet-700 ring-violet-200",
    Visited: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  };

  const normalized = LEAD_STATUSES.find(
    (item) => item.toLowerCase() === String(status || "").toLowerCase()
  ) || status || "New";

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

function MetricCard({ title, value, description, icon: Icon, color }) {
  const iconColors = {
    blue: "bg-blue-50 text-blue-700",
    violet: "bg-violet-50 text-violet-700",
    amber: "bg-amber-50 text-amber-700",
    emerald: "bg-emerald-50 text-emerald-700",
  };

  return (
    <article className="group rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
            {value}
          </p>
        </div>

        <div
          className={`rounded-xl p-3 transition group-hover:scale-105 ${
            iconColors[color] || iconColors.blue
          }`}
        >
          <Icon size={21} />
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-3">
        <ArrowUpRight size={14} className="text-emerald-600" />
        <p className="text-xs text-slate-500">{description}</p>
      </div>
    </article>
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
    () => [
      ...new Set(
        leads.map((lead) => lead.source).filter(Boolean)
      ),
    ].sort(),
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
          String(lead.status || "New").toLowerCase() ===
          status.toLowerCase()
      ).length;

    return {
      total: leads.length,
      newLeads: count("New"),
      contacted: count("Contacted"),
      qualified: count("Qualified"),
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

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-7">
      {/* Page heading */}
      <header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            EstateMate AI / CRM
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Lead Management
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Organize buyer enquiries, track lead progress, and manage
            your property sales pipeline in one place.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => loadLeads(true)}
            disabled={refreshing || loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw
              size={16}
              className={refreshing ? "animate-spin" : ""}
            />
            Refresh
          </button>

          <button
            type="button"
            onClick={openAddModal}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800 hover:shadow-md focus:outline-none focus:ring-4 focus:ring-emerald-100"
          >
            <Plus size={18} />
            Add new lead
          </button>
        </div>
      </header>

      {/* Summary cards */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Total leads"
          value={stats.total}
          description="All accessible lead records"
          icon={Users}
          color="blue"
        />

        <MetricCard
          title="New leads"
          value={stats.newLeads}
          description="Awaiting further contact"
          icon={UserRound}
          color="violet"
        />

        <MetricCard
          title="Contacted"
          value={stats.contacted}
          description="Marked as contacted"
          icon={Phone}
          color="amber"
        />

        <MetricCard
          title="Qualified"
          value={stats.qualified}
          description="Qualified buyer enquiries"
          icon={CheckCircle2}
          color="emerald"
        />
      </section>

      {/* Alerts */}
      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4"
        >
          <AlertCircle size={20} className="mt-0.5 shrink-0 text-red-600" />

          <div className="min-w-0 flex-1">
            <p className="font-semibold text-red-900">
              Unable to load leads
            </p>
            <p className="mt-1 break-words text-sm leading-6 text-red-800">
              {error}
            </p>
            <button
              type="button"
              onClick={() => loadLeads()}
              className="mt-3 rounded-lg bg-red-700 px-3 py-2 text-sm font-semibold text-white hover:bg-red-800"
            >
              Try again
            </button>
          </div>
        </div>
      )}

      {notice && (
        <div
          role="status"
          className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
        >
          <CheckCircle2 size={18} />
          <span className="flex-1">{notice}</span>
          <button
            type="button"
            aria-label="Dismiss message"
            onClick={() => setNotice(null)}
            className="rounded-lg p-1 hover:bg-emerald-100"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Main lead directory */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-5 sm:p-6">
          <div className="flex flex-col justify-between gap-5 xl:flex-row xl:items-center">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Lead directory
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Search, filter, and manage your prospects.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:flex">
              <div className="relative">
                <Search
                  size={17}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search name, phone, ID..."
                  aria-label="Search leads"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-50 sm:w-64"
                />
              </div>

              <div className="relative">
                <Filter
                  size={16}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  aria-label="Filter by lead status"
                  className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-9 text-sm outline-none transition focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-50 sm:w-44"
                >
                  <option value="All">All statuses</option>
                  {LEAD_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>

              <select
                value={sourceFilter}
                onChange={(event) => setSourceFilter(event.target.value)}
                aria-label="Filter by lead source"
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none transition focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-50"
              >
                <option value="All">All sources</option>
                {sources.map((source) => (
                  <option key={source} value={source}>
                    {source}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-500">
              Showing{" "}
              <span className="font-semibold text-slate-900">
                {filteredLeads.length}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-slate-900">
                {leads.length}
              </span>{" "}
              leads
            </p>

            {(search || statusFilter !== "All" || sourceFilter !== "All") && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setStatusFilter("All");
                  setSourceFilter("All");
                }}
                className="text-sm font-semibold text-emerald-700 hover:text-emerald-800"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>

        {/* Loading state */}
        {loading ? (
          <div className="flex min-h-72 flex-col items-center justify-center gap-3">
            <div className="rounded-2xl bg-emerald-50 p-4 text-emerald-700">
              <RefreshCw size={24} className="animate-spin" />
            </div>
            <p className="text-sm font-medium text-slate-600">
              Loading your leads...
            </p>
          </div>
        ) : filteredLeads.length === 0 ? (
          /* Empty state */
          <div className="flex min-h-72 flex-col items-center justify-center px-6 py-12 text-center">
            <div className="rounded-2xl bg-slate-100 p-5 text-slate-500">
              <Users size={30} />
            </div>

            <h3 className="mt-4 text-lg font-bold text-slate-900">
              {leads.length === 0 ? "No leads found" : "No matching leads"}
            </h3>

            <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
              {leads.length === 0
                ? "Create your first lead to start organizing property enquiries."
                : "Try a different search term or clear your filters."}
            </p>

            {leads.length === 0 && !error && (
              <button
                type="button"
                onClick={openAddModal}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-800"
              >
                <Plus size={17} />
                Create first lead
              </button>
            )}
          </div>
        ) : (
          /* Responsive table */
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] text-left">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/80">
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
                      className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-slate-500"
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
                    className="group transition hover:bg-emerald-50/30"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-50 to-teal-100 text-sm font-bold text-emerald-800 ring-1 ring-emerald-100">
                          {getInitials(lead.name)}
                        </div>

                        <div className="min-w-0">
                          <p className="max-w-48 truncate text-sm font-semibold text-slate-900">
                            {lead.name || "Unnamed lead"}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {lead.id || "No lead ID"}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2 text-sm text-slate-700">
                        <Phone size={14} className="shrink-0 text-slate-400" />
                        {lead.phone || "—"}
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2 text-sm text-slate-700">
                        <Building2
                          size={15}
                          className="shrink-0 text-slate-400"
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
                      <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                        <Wallet size={14} className="text-slate-400" />
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
                          className="text-slate-400"
                        />
                        {formatDate(lead.created_at)}
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <button
                        type="button"
                        onClick={() => openEditModal(lead)}
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-800 focus:outline-none focus:ring-4 focus:ring-emerald-50"
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

        {/* Table footer */}
        {!loading && leads.length > 0 && (
          <footer className="flex flex-col justify-between gap-2 border-t border-slate-100 bg-slate-50/60 px-5 py-4 text-xs text-slate-500 sm:flex-row sm:items-center">
            <span>
              {filteredLeads.length} matching record
              {filteredLeads.length === 1 ? "" : "s"}
            </span>

            <span className="inline-flex items-center gap-2">
              <Clock3 size={14} />
              Live data from EstateMate AI
            </span>
          </footer>
        )}
      </section>

      {/* Add/edit modal */}
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
    </div>
  );
}
