
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Building2,
  CalendarCheck,
  CalendarClock,
  CheckCircle2,
  Clock3,
  RefreshCw,
  Target,
  TrendingUp,
  Users,
  UserRoundCheck,
  XCircle,
  AlertTriangle,
  Home,
  ChartNoAxesCombined,
} from "lucide-react";

import { api, getApiErrorMessage } from "../services/api";

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

const numberFormatter = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 1,
});

function formatNumber(value) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  const number = Number(value);

  return Number.isFinite(number) ? numberFormatter.format(number) : "—";
}

function formatPercent(value) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  const number = Number(value);

  return Number.isFinite(number) ? `${formatNumber(number)}%` : "—";
}

function formatResponseTime(value) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  const minutes = Number(value);

  if (!Number.isFinite(minutes) || minutes < 0) {
    return "—";
  }

  if (minutes < 1) {
    return `${Math.round(minutes * 60)} sec`;
  }

  if (minutes < 60) {
    return `${Math.round(minutes)} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = Math.round(minutes % 60);

  if (hours < 24) {
    return remainingMinutes
      ? `${hours}h ${remainingMinutes}m`
      : `${hours}h`;
  }

  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;

  return remainingHours
    ? `${days}d ${remainingHours}h`
    : `${days}d`;
}

function getPercent(value, total) {
  const numerator = Number(value) || 0;
  const denominator = Number(total) || 0;

  if (denominator <= 0) return 0;

  return Math.min(100, Math.max(0, (numerator / denominator) * 100));
}

function Panel({ children, className = "" }) {
  return (
    <section
      className={`rounded-2xl border border-slate-200/80 bg-white shadow-sm ${className}`}
    >
      {children}
    </section>
  );
}

function SectionHeading({ icon: Icon, title, subtitle }) {
  return (
    <div className="flex items-center gap-3">
      <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-800">
        <Icon size={20} />
      </div>

      <div className="min-w-0">
        <h2 className="font-bold tracking-tight text-slate-900">
          {title}
        </h2>
        {subtitle && (
          <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
        )}
      </div>
    </div>
  );
}

function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  accent = "emerald",
}) {
  const styles = {
    emerald: "bg-emerald-50 text-emerald-800",
    blue: "bg-blue-50 text-blue-700",
    violet: "bg-violet-50 text-violet-700",
    amber: "bg-amber-50 text-amber-700",
    rose: "bg-rose-50 text-rose-700",
  };

  return (
    <article className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-emerald-200 hover:shadow-lg sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">{title}</p>

          <p className="mt-3 break-words text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
            {value}
          </p>
        </div>

        <div
          className={`rounded-2xl p-3 transition group-hover:scale-105 ${
            styles[accent] || styles.emerald
          }`}
        >
          <Icon size={22} strokeWidth={1.8} />
        </div>
      </div>

      {subtitle && (
        <p className="mt-4 text-xs leading-5 text-slate-500">
          {subtitle}
        </p>
      )}

      <div className="absolute bottom-0 left-0 h-1 w-full bg-slate-100">
        <div
          className={`h-full w-1/3 rounded-r-full ${
            accent === "blue"
              ? "bg-blue-500"
              : accent === "violet"
                ? "bg-violet-500"
                : accent === "amber"
                  ? "bg-amber-500"
                  : accent === "rose"
                    ? "bg-rose-500"
                    : "bg-emerald-600"
          }`}
        />
      </div>
    </article>
  );
}

function ProgressRow({
  label,
  value,
  total,
  color = "bg-emerald-600",
}) {
  const count = Math.max(0, Number(value) || 0);
  const percentage = getPercent(count, total);

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-slate-600">{label}</span>

        <div className="flex items-center gap-2">
          <span className="text-sm font-bold tabular-nums text-slate-900">
            {formatNumber(count)}
          </span>
          <span className="w-12 text-right text-xs tabular-nums text-slate-400">
            {formatPercent(percentage)}
          </span>
        </div>
      </div>

      <div
        className="h-2.5 overflow-hidden rounded-full bg-slate-100"
        role="progressbar"
        aria-label={`${label} percentage`}
        aria-valuenow={Math.round(percentage)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={`h-full rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function MiniStat({ label, value, icon: Icon, color = "text-emerald-700" }) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/80 p-4">
      <div className={`shrink-0 ${color}`}>
        <Icon size={20} />
      </div>
      <div className="min-w-0">
        <p className="truncate text-xs font-medium text-slate-500">{label}</p>
        <p className="mt-1 text-xl font-bold text-slate-900">{value}</p>
      </div>
    </div>
  );
}

function LoadingDashboard() {
  return (
    <div className="space-y-6" aria-label="Loading analytics">
      <div className="h-48 animate-pulse rounded-3xl bg-slate-200" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4].map((item) => (
          <div
            key={item}
            className="h-36 animate-pulse rounded-2xl bg-slate-200"
          />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {[1, 2].map((item) => (
          <div
            key={item}
            className="h-72 animate-pulse rounded-2xl bg-slate-200"
          />
        ))}
      </div>
    </div>
  );
}

export default function AnalyticsOverview() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadAnalytics = useCallback(async (refresh = false) => {
    setError("");

    if (refresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const response = await api.get("/api/analytics/overview");
      const result = response.data;

      if (!result || !result.metrics) {
        throw new Error("The analytics API returned an unexpected response.");
      }

      setData(result);
    } catch (err) {
      setError(
        getApiErrorMessage(err) || "Unable to load analytics."
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

  const leadTotal = Number(metrics.total_leads) || 0;
  const visitTotal =
    Number(metrics.visits_with_known_attendance) || 0;

  const pipeline = useMemo(
    () => [
      {
        label: "New leads",
        value: Number(metrics.new_leads) || 0,
        color: "bg-blue-500",
      },
      {
        label: "Contacted",
        value: Number(metrics.contacted_leads) || 0,
        color: "bg-indigo-500",
      },
      {
        label: "Qualified",
        value: Number(metrics.qualified_leads) || 0,
        color: "bg-amber-500",
      },
      {
        label: "Converted",
        value: Number(metrics.converted_leads) || 0,
        color: "bg-emerald-600",
      },
    ],
    [metrics]
  );

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-7xl">
          <LoadingDashboard />
        </div>
      </main>
    );
  }

  if (error && !data) {
    return (
      <main className="min-h-screen bg-slate-50 p-4 sm:p-8">
        <div className="mx-auto max-w-3xl rounded-3xl border border-red-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600">
            <AlertTriangle size={25} />
          </div>

          <h1 className="mt-5 text-2xl font-bold text-slate-900">
            Analytics unavailable
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-600">
            {error}
          </p>

          <button
            type="button"
            onClick={() => loadAnalytics()}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-emerald-800 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-900 focus:outline-none focus:ring-4 focus:ring-emerald-100"
          >
            <RefreshCw size={16} />
            Retry analytics
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f5f7f5] text-slate-900">
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        {/* Real estate analytics header */}
        <header className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-800 px-5 py-7 shadow-xl sm:px-8 sm:py-9 lg:px-10">
          <div className="pointer-events-none absolute -right-12 -top-20 h-64 w-64 rounded-full bg-emerald-300/10 blur-3xl" />
          <div className="pointer-events-none absolute bottom-0 right-1/4 h-36 w-36 rounded-full bg-teal-300/10 blur-3xl" />

          <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold tracking-wider text-emerald-100">
                <Building2 size={14} />
                ESTATEMATE AI · BUSINESS INTELLIGENCE
              </div>

              <h1 className="mt-5 text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
                Real Estate Analytics
              </h1>

              <p className="mt-3 max-w-xl text-sm leading-6 text-emerald-50/80 sm:text-base">
                Understand your sales pipeline, buyer engagement, site visits,
                and lead conversion performance in one place.
              </p>

              <div className="mt-5 flex flex-wrap items-center gap-2 text-xs font-medium text-emerald-50/90">
                <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-300" />
                  Analytics dashboard
                </span>
                <span className="rounded-full border border-white/15 px-3 py-2">
                  {formatNumber(leadTotal)} total leads tracked
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col lg:items-end">
              <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
                <p className="text-xs font-medium text-emerald-100/75">
                  Lead conversion rate
                </p>
                <p className="mt-1 text-3xl font-bold text-white">
                  {formatPercent(metrics.lead_conversion_rate_percent)}
                </p>
                <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-100/80">
                  <TrendingUp size={14} />
                  <span>
                    {formatNumber(metrics.converted_leads)} converted leads
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => loadAnalytics(true)}
                disabled={refreshing}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/20 bg-white px-4 py-3 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-70"
              >
                <RefreshCw
                  size={16}
                  className={refreshing ? "animate-spin" : ""}
                />
                {refreshing ? "Refreshing..." : "Refresh analytics"}
              </button>
            </div>
          </div>
        </header>

        {error && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
          >
            <AlertTriangle size={19} className="mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold">Refresh unsuccessful</p>
              <p className="mt-1 leading-5">
                {error}. The last successfully loaded analytics are still shown.
              </p>
            </div>
          </div>
        )}

        {/* KPI cards */}
        <section aria-label="Key performance indicators">
          <div className="mb-4 flex items-center gap-2">
            <ChartNoAxesCombined size={19} className="text-emerald-800" />
            <h2 className="font-bold text-slate-900">Performance snapshot</h2>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              title="Total leads"
              value={formatNumber(metrics.total_leads)}
              subtitle={`${formatNumber(metrics.new_leads)} new leads in the pipeline`}
              icon={Users}
              accent="emerald"
            />

            <MetricCard
              title="Qualified leads"
              value={formatNumber(metrics.qualified_leads)}
              subtitle="Buyers marked as qualified"
              icon={Target}
              accent="blue"
            />

            <MetricCard
              title="Site visits booked"
              value={formatNumber(metrics.booked_visits)}
              subtitle="Appointments currently booked"
              icon={CalendarClock}
              accent="violet"
            />

            <MetricCard
              title="Visit attendance"
              value={formatPercent(metrics.show_up_rate_percent)}
              subtitle={`${formatNumber(metrics.attended_visits)} attended · ${formatNumber(metrics.no_show_visits)} no-shows`}
              icon={CalendarCheck}
              accent="amber"
            />
          </div>
        </section>

        {/* Lead pipeline */}
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
          <Panel className="p-5 sm:p-6 xl:col-span-3">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <SectionHeading
                icon={Activity}
                title="Lead conversion pipeline"
                subtitle="Track buyers from first enquiry to conversion"
              />

              <span className="w-fit rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800">
                {formatNumber(leadTotal)} leads
              </span>
            </div>

            <div className="mt-7 space-y-6">
              {pipeline.map((stage) => (
                <ProgressRow
                  key={stage.label}
                  label={stage.label}
                  value={stage.value}
                  total={leadTotal}
                  color={stage.color}
                />
              ))}
            </div>

            <div className="mt-7 grid grid-cols-1 gap-3 border-t border-slate-100 pt-5 sm:grid-cols-2">
              <MiniStat
                label="Converted buyers"
                value={formatNumber(metrics.converted_leads)}
                icon={CheckCircle2}
              />
              <MiniStat
                label="Lead conversion rate"
                value={formatPercent(metrics.lead_conversion_rate_percent)}
                icon={TrendingUp}
                color="text-blue-700"
              />
            </div>
          </Panel>

          {/* Site visits */}
          <Panel className="p-5 sm:p-6 xl:col-span-2">
            <SectionHeading
              icon={Home}
              title="Site visit performance"
              subtitle="Attendance and appointment outcomes"
            />

            <div className="mt-6 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 p-5">
              <p className="text-sm font-medium text-emerald-900/70">
                Visit show-up rate
              </p>

              <p className="mt-2 text-4xl font-bold tracking-tight text-emerald-950">
                {formatPercent(metrics.show_up_rate_percent)}
              </p>

              <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-white">
                <div
                  className="h-full rounded-full bg-emerald-600 transition-all duration-700"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.max(0, Number(metrics.show_up_rate_percent) || 0)
                    )}%`,
                  }}
                />
              </div>

              <p className="mt-3 text-xs leading-5 text-emerald-900/70">
                Based on visits with recorded attendance outcomes.
              </p>
            </div>

            <div className="mt-5 space-y-4">
              <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-3">
                  <span className="rounded-lg bg-emerald-50 p-2 text-emerald-700">
                    <CheckCircle2 size={17} />
                  </span>
                  <span className="text-sm text-slate-600">Attended</span>
                </div>
                <span className="font-bold text-slate-900">
                  {formatNumber(metrics.attended_visits)}
                </span>
              </div>

              <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-3">
                  <span className="rounded-lg bg-rose-50 p-2 text-rose-700">
                    <XCircle size={17} />
                  </span>
                  <span className="text-sm text-slate-600">No-shows</span>
                </div>
                <span className="font-bold text-slate-900">
                  {formatNumber(metrics.no_show_visits)}
                </span>
              </div>

              <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-3">
                  <span className="rounded-lg bg-amber-50 p-2 text-amber-700">
                    <CalendarClock size={17} />
                  </span>
                  <span className="text-sm text-slate-600">Cancelled</span>
                </div>
                <span className="font-bold text-slate-900">
                  {formatNumber(metrics.cancelled_visits)}
                </span>
              </div>

              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="rounded-lg bg-blue-50 p-2 text-blue-700">
                    <CalendarCheck size={17} />
                  </span>
                  <span className="text-sm text-slate-600">Completed</span>
                </div>
                <span className="font-bold text-slate-900">
                  {formatNumber(metrics.completed_visits)}
                </span>
              </div>
            </div>

            <p className="mt-5 rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs leading-5 text-slate-500">
              {visitTotal > 0
                ? `${formatNumber(visitTotal)} visits have known attendance outcomes.`
                : "Attendance metrics will become more informative as visit outcomes are recorded."}
            </p>
          </Panel>
        </div>

        {/* Response performance */}
        <section>
          <div className="mb-4">
            <h2 className="font-bold text-slate-900">Sales team responsiveness</h2>
            <p className="mt-1 text-sm text-slate-500">
              Monitor how quickly buyer enquiries receive a response.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <MetricCard
              title="Average response time"
              value={formatResponseTime(metrics.average_response_time_minutes)}
              subtitle="Average recorded time to respond"
              icon={Clock3}
              accent="amber"
            />

            <MetricCard
              title="Leads with responses"
              value={formatNumber(metrics.leads_with_recorded_response)}
              subtitle="Leads with recorded response timing"
              icon={UserRoundCheck}
              accent="blue"
            />

            <MetricCard
              title="Contacted leads"
              value={formatNumber(metrics.contacted_leads)}
              subtitle="Buyers whose lead status is contacted"
              icon={ArrowUpRight}
              accent="emerald"
            />
          </div>
        </section>

        {/* Data quality and scope */}
        <Panel className="p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-slate-100 p-2.5 text-slate-700">
                <Building2 size={20} />
              </div>
              <div>
                <h2 className="font-bold text-slate-900">
                  Reporting information
                </h2>
                <p className="mt-1 text-sm leading-5 text-slate-500">
                  Interpret results using the recorded data available to your account.
                </p>
              </div>
            </div>

            <span className="w-fit rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600">
              Scope: {data?.scope || "Not specified"}
            </span>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-100 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Response tracking
              </p>
              <p className="mt-2 text-sm font-semibold text-slate-800">
                {quality.response_time || "Not specified"}
              </p>
            </div>

            <div className="rounded-xl border border-slate-100 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Attendance tracking
              </p>
              <p className="mt-2 text-sm font-semibold text-slate-800">
                {quality.show_up_rate || "Not specified"}
              </p>
            </div>
          </div>
        </Panel>

        <footer className="flex flex-col gap-2 border-t border-slate-200 py-4 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <span>EstateMate AI · Real Estate Analytics</span>
          <span>Metrics reflect the data returned by your analytics API.</span>
        </footer>
      </div>
    </main>
  );
}
