
import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  CalendarCheck,
  CalendarClock,
  CheckCircle2,
  Clock3,
  RefreshCw,
  Target,
  Users,
  UserRoundCheck,
  XCircle,
  AlertTriangle,
} from "lucide-react";

import {
  api,
  getApiErrorMessage,
} from "../services/api";

const INITIAL_METRICS = {
  total_leads: 0,
  new_leads: 0,
  contacted_leads: 0,
  qualified_leads: 0,
  booked_visits: 0,
  attended_visits: 0,
  completed_visits: 0,
  cancelled_visits: 0,
  no_show_visits: 0,
  visits_with_known_attendance: 0,
  show_up_rate_percent: null,
  leads_with_recorded_response: 0,
  average_response_time_seconds: null,
  average_response_time_minutes: null,
  converted_leads: 0,
  lead_conversion_rate_percent: 0,
};

/**
 * Fetch analytics using the shared Axios instance.
 *
 * The shared API client:
 * - Uses VITE_API_BASE_URL.
 * - Adds the stored bearer token.
 * - Handles authentication failures.
 */
async function fetchAnalytics() {
  const response = await api.get("/api/analytics/overview");
  return response.data;
}

function formatNumber(value) {
  if (
    value === null ||
    value === undefined ||
    value === "" ||
    !Number.isFinite(Number(value))
  ) {
    return "—";
  }

  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 2,
  }).format(Number(value));
}

function formatResponseTime(minutes) {
  if (
    minutes === null ||
    minutes === undefined ||
    !Number.isFinite(Number(minutes))
  ) {
    return "—";
  }

  const totalMinutes = Math.max(
    0,
    Math.round(Number(minutes))
  );

  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const mins = totalMinutes % 60;

  if (days > 0) {
    return `${days}d ${hours}h`;
  }

  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }

  return `${mins}m`;
}

function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  accent = "blue",
}) {
  const accents = {
    blue: "bg-blue-50 text-blue-700 ring-blue-100",
    violet: "bg-violet-50 text-violet-700 ring-violet-100",
    emerald: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    amber: "bg-amber-50 text-amber-700 ring-amber-100",
  };

  return (
    <article className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">
            {title}
          </p>

          <p className="mt-3 break-words text-3xl font-bold tracking-tight text-slate-900">
            {value}
          </p>
        </div>

        <div
          className={`shrink-0 rounded-xl p-3 ring-1 ${accents[accent]}`}
        >
          <Icon size={21} />
        </div>
      </div>

      {subtitle && (
        <p className="mt-3 text-xs leading-5 text-slate-500">
          {subtitle}
        </p>
      )}
    </article>
  );
}

function BreakdownRow({
  label,
  value,
  total,
  color = "bg-blue-500",
}) {
  const safeValue = Math.max(0, Number(value) || 0);
  const safeTotal = Math.max(0, Number(total) || 0);

  const width =
    safeTotal > 0
      ? Math.min(100, (safeValue / safeTotal) * 100)
      : 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="text-slate-600">{label}</span>

        <span className="font-semibold tabular-nums text-slate-900">
          {formatNumber(safeValue)}
        </span>
      </div>

      <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}

export default function AnalyticsOverview() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadAnalytics = useCallback(async (isRefresh = false) => {
    setError("");

    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const result = await fetchAnalytics();

      if (!result || !result.metrics) {
        throw new Error(
          "The analytics API returned an unexpected response."
        );
      }

      setData(result);
    } catch (err) {
      setError(
        getApiErrorMessage(err) ||
          "Unable to load analytics."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const metrics = data?.metrics || INITIAL_METRICS;
  const quality = data?.data_quality || {};

  if (loading) {
    return (
      <div className="flex min-h-72 items-center justify-center">
        <div className="flex items-center gap-3 text-slate-600">
          <RefreshCw className="animate-spin" size={20} />
          <span className="text-sm font-medium">
            Loading live analytics...
          </span>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <section className="rounded-2xl border border-red-200 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <AlertTriangle
            className="mt-0.5 shrink-0 text-red-600"
            size={22}
          />

          <div className="min-w-0 flex-1">
            <h2 className="font-semibold text-slate-900">
              Analytics unavailable
            </h2>

            <p className="mt-2 break-words text-sm leading-6 text-slate-600">
              {error}
            </p>

            <button
              type="button"
              onClick={() => loadAnalytics()}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              <RefreshCw size={16} />
              Try again
            </button>
          </div>
        </div>
      </section>
    );
  }

  const leadTotal = Number(metrics.total_leads) || 0;

  const visitTotal =
    Number(metrics.visits_with_known_attendance) || 0;

  const cancelledVisits =
    Number(metrics.cancelled_visits) || 0;

  const bookedVisits =
    Number(metrics.booked_visits) || 0;

  return (
    <section className="space-y-6">
      {/* Page heading */}
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-medium text-blue-700">
            ESTATEMATE AI · PERFORMANCE
          </p>

          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Analytics Overview
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Live lead, response, and site-visit performance from your database.
          </p>
        </div>

        <button
          type="button"
          onClick={() => loadAnalytics(true)}
          disabled={refreshing}
          className="inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 sm:self-auto"
        >
          <RefreshCw
            size={16}
            className={refreshing ? "animate-spin" : ""}
          />

          {refreshing ? "Refreshing..." : "Refresh data"}
        </button>
      </header>

      {/* Refresh warning */}
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
        >
          Refresh failed: {error}. Showing the last successfully loaded data.
        </div>
      )}

      {/* Main KPI cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Total Leads"
          value={formatNumber(metrics.total_leads)}
          subtitle={`${formatNumber(metrics.new_leads)} new leads`}
          icon={Users}
          accent="blue"
        />

        <MetricCard
          title="Booked Visits"
          value={formatNumber(metrics.booked_visits)}
          subtitle="Currently booked appointments"
          icon={CalendarClock}
          accent="violet"
        />

        <MetricCard
          title="Attendance Rate"
          value={
            metrics.show_up_rate_percent == null
              ? "—"
              : `${formatNumber(metrics.show_up_rate_percent)}%`
          }
          subtitle={`${formatNumber(metrics.attended_visits)} attended · ${formatNumber(metrics.no_show_visits)} no-shows`}
          icon={CalendarCheck}
          accent="emerald"
        />

        <MetricCard
          title="Average Response"
          value={formatResponseTime(
            metrics.average_response_time_minutes
          )}
          subtitle={`${formatNumber(metrics.leads_with_recorded_response)} leads with recorded response`}
          icon={Clock3}
          accent="amber"
        />
      </div>

      {/* Lead pipeline and visit outcomes */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-xl bg-blue-50 p-2.5 text-blue-700">
              <Activity size={20} />
            </div>

            <div>
              <h2 className="font-semibold text-slate-900">
                Lead Pipeline
              </h2>

              <p className="text-sm text-slate-500">
                Current lead status distribution
              </p>
            </div>
          </div>

          <div className="space-y-5">
            <BreakdownRow
              label="New"
              value={metrics.new_leads}
              total={leadTotal}
              color="bg-blue-500"
            />

            <BreakdownRow
              label="Contacted"
              value={metrics.contacted_leads}
              total={leadTotal}
              color="bg-violet-500"
            />

            <BreakdownRow
              label="Qualified"
              value={metrics.qualified_leads}
              total={leadTotal}
              color="bg-amber-500"
            />

            <BreakdownRow
              label="Converted"
              value={metrics.converted_leads}
              total={leadTotal}
              color="bg-emerald-500"
            />
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 border-t border-slate-100 pt-5">
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs text-slate-500">
                Conversion rate
              </p>

              <p className="mt-1 text-xl font-bold text-slate-900">
                {formatNumber(
                  metrics.lead_conversion_rate_percent
                )}%
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs text-slate-500">
                Total leads
              </p>

              <p className="mt-1 text-xl font-bold text-slate-900">
                {formatNumber(metrics.total_leads)}
              </p>
            </div>
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-700">
              <CalendarCheck size={20} />
            </div>

            <div>
              <h2 className="font-semibold text-slate-900">
                Site Visit Outcomes
              </h2>

              <p className="text-sm text-slate-500">
                Recorded appointment outcomes
              </p>
            </div>
          </div>

          <div className="space-y-5">
            <BreakdownRow
              label="Attended"
              value={metrics.attended_visits}
              total={visitTotal}
              color="bg-emerald-500"
            />

            <BreakdownRow
              label="No-show"
              value={metrics.no_show_visits}
              total={visitTotal}
              color="bg-rose-500"
            />

            <BreakdownRow
              label="Cancelled"
              value={cancelledVisits}
              total={visitTotal + cancelledVisits}
              color="bg-amber-500"
            />

            <BreakdownRow
              label="Currently booked"
              value={bookedVisits}
              total={visitTotal + cancelledVisits + bookedVisits}
              color="bg-blue-500"
            />
          </div>

          <div className="mt-6 rounded-xl border border-slate-100 bg-slate-50 p-4">
            <div className="flex items-center gap-2">
              <CheckCircle2
                size={18}
                className="text-emerald-600"
              />

              <p className="text-sm font-medium text-slate-700">
                {visitTotal === 0
                  ? "Attendance data is not available yet"
                  : `${formatNumber(visitTotal)} visits have a known attendance outcome`}
              </p>
            </div>
          </div>
        </article>
      </div>

      {/* Additional metrics */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <UserRoundCheck
              className="text-violet-600"
              size={21}
            />

            <p className="text-sm font-medium text-slate-500">
              Contacted Leads
            </p>
          </div>

          <p className="mt-4 text-2xl font-bold text-slate-900">
            {formatNumber(metrics.contacted_leads)}
          </p>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <Target
              className="text-emerald-600"
              size={21}
            />

            <p className="text-sm font-medium text-slate-500">
              Converted Leads
            </p>
          </div>

          <p className="mt-4 text-2xl font-bold text-slate-900">
            {formatNumber(metrics.converted_leads)}
          </p>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <XCircle
              className="text-rose-600"
              size={21}
            />

            <p className="text-sm font-medium text-slate-500">
              Cancelled Visits
            </p>
          </div>

          <p className="mt-4 text-2xl font-bold text-slate-900">
            {formatNumber(metrics.cancelled_visits)}
          </p>
        </article>
      </div>

      {/* Data quality and access scope */}
      <footer className="flex flex-col gap-1 border-t border-slate-200 pt-4 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
        <span>
          Access scope:{" "}
          <strong>{data?.scope || "unknown"}</strong>
        </span>

        <span>
          Response tracking: {quality.response_time || "unknown"}
          {" · "}
          Attendance tracking: {quality.show_up_rate || "unknown"}
        </span>
      </footer>
    </section>
  );
}
