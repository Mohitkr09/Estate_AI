
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CalendarCheck,
  Clock3,
  Users,
  Building2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ArrowRight,
  MapPin,
  ChevronRight,
  LoaderCircle,
  Sparkles,
  CalendarClock,
  CircleCheck,
} from "lucide-react";

import { api } from "../services/api";

const today = () => {
  const date = new Date();
  const offset = date.getTimezoneOffset();

  return new Date(date.getTime() - offset * 60 * 1000)
    .toISOString()
    .slice(0, 10);
};

function formatDate(value, options = {}) {
  if (!value) return "Date not specified";

  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T12:00:00`)
    : new Date(value);

  if (Number.isNaN(parsed.getTime())) return value;

  return parsed.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...options,
  });
}

function formatTime(value) {
  if (!value) return "Time not specified";

  const match = value.match(/^(\d{2}):(\d{2})/);
  if (!match) return value;

  const parsed = new Date();
  parsed.setHours(Number(match[1]), Number(match[2]), 0, 0);

  return parsed.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
  });
}

/*
 * Shared request helper.
 *
 * All requests use the shared Axios instance, allowing the
 * interceptor in services/api.js to attach the JWT token.
 *
 * It supports:
 * - GET and POST requests
 * - JSON request bodies
 * - AbortController cancellation
 * - Consistent API error messages
 */
async function requestJSON(url, options = {}) {
  try {
    const config = {
      url,
      method: options.method || "GET",
      headers: options.headers || {},
      signal: options.signal,
    };

    if (options.body !== undefined) {
      config.data =
        typeof options.body === "string"
          ? JSON.parse(options.body)
          : options.body;
    }

    const response = await api.request(config);
    return response.data;
  } catch (error) {
    if (
      error.name === "AbortError" ||
      error.code === "ERR_CANCELED"
    ) {
      const abortError = new Error("Request cancelled");
      abortError.name = "AbortError";
      throw abortError;
    }

    const data = error.response?.data;
    const status = error.response?.status;

    const message =
      (typeof data?.detail === "string" && data.detail) ||
      (typeof data?.message === "string" && data.message) ||
      error.message ||
      `Request failed${status ? ` (${status})` : ""}.`;

    throw new Error(message);
  }
}

function StatCard({
  icon: Icon,
  label,
  value,
  description,
  tone = "blue",
}) {
  const tones = {
    blue: "bg-blue-50 text-blue-700 ring-blue-100",
    green: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    violet: "bg-violet-50 text-violet-700 ring-violet-100",
  };

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
            {value}
          </p>
          <p className="mt-2 text-xs leading-5 text-slate-500">
            {description}
          </p>
        </div>

        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 ${tones[tone]}`}
        >
          <Icon size={21} strokeWidth={1.8} />
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const visited = status === "Visited";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${
        visited
          ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100"
          : "bg-blue-50 text-blue-700 ring-1 ring-blue-100"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          visited ? "bg-emerald-500" : "bg-blue-500"
        }`}
      />
      {visited ? "Completed" : "Booked"}
    </span>
  );
}

function EmptyState({
  title,
  description,
  icon: Icon = CalendarDays,
}) {
  return (
    <div className="flex flex-col items-center justify-center px-5 py-12 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
        <Icon size={26} strokeWidth={1.7} />
      </div>

      <h3 className="mt-4 text-sm font-semibold text-slate-900">
        {title}
      </h3>

      <p className="mt-1 max-w-xs text-sm leading-6 text-slate-500">
        {description}
      </p>
    </div>
  );
}

export default function SiteVisits() {
  const [leads, setLeads] = useState([]);
  const [visits, setVisits] = useState([]);

  const [leadId, setLeadId] = useState("");
  const [visitDate, setVisitDate] = useState("");
  const [slots, setSlots] = useState([]);
  const [slotTime, setSlotTime] = useState("");

  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [slotError, setSlotError] = useState("");
  const [visitFilter, setVisitFilter] = useState("All");

  const selectedLead = useMemo(
    () => leads.find((lead) => String(lead.id) === String(leadId)),
    [leads, leadId]
  );

  const bookedVisits = visits.filter(
    (visit) => visit.visit_status === "Booked"
  );

  const completedVisits = visits.filter(
    (visit) => visit.visit_status === "Visited"
  );

  const filteredVisits = useMemo(() => {
    if (visitFilter === "Upcoming") {
      return visits.filter(
        (visit) => visit.visit_status === "Booked"
      );
    }

    if (visitFilter === "Completed") {
      return visits.filter(
        (visit) => visit.visit_status === "Visited"
      );
    }

    return visits;
  }, [visits, visitFilter]);

  const loadData = useCallback(async ({ quiet = false } = {}) => {
    if (quiet) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      const [leadData, visitData] = await Promise.all([
        requestJSON("/api/leads"),
        requestJSON("/api/visits"),
      ]);

      const nextLeads = Array.isArray(leadData)
        ? leadData
        : Array.isArray(leadData?.leads)
          ? leadData.leads
          : [];

      const nextVisits = Array.isArray(visitData)
        ? visitData
        : Array.isArray(visitData?.visits)
          ? visitData.visits
          : [];

      setLeads(nextLeads);
      setVisits(nextVisits);

      setLeadId((current) =>
        current &&
        !nextLeads.some(
          (lead) => String(lead.id) === String(current)
        )
          ? ""
          : current
      );
    } catch (err) {
      setError(
        err.message ||
          "Unable to load site visits. Check your backend connection."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    setSlots([]);
    setSlotTime("");
    setSlotError("");
    setMessage("");

    if (!selectedLead || !visitDate) {
      setLoadingSlots(false);
      return undefined;
    }

    const controller = new AbortController();

    async function loadSlots() {
      setLoadingSlots(true);
      setSlotError("");

      try {
        const params = new URLSearchParams({
          project: selectedLead.project || "",
          visit_date: visitDate,
        });

        const data = await requestJSON(
          `/api/visits/slots?${params.toString()}`,
          { signal: controller.signal }
        );

        setSlots(
          Array.isArray(data?.available_slots)
            ? data.available_slots
            : []
        );
      } catch (err) {
        if (
          err.name !== "AbortError" &&
          err.code !== "ERR_CANCELED"
        ) {
          setSlots([]);
          setSlotError(
            err.message ||
              "Unable to load available appointment slots."
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoadingSlots(false);
        }
      }
    }

    loadSlots();

    return () => controller.abort();
  }, [selectedLead, visitDate]);

  async function handleBooking(event) {
    event.preventDefault();

    setMessage("");
    setError("");

    if (!selectedLead || !visitDate || !slotTime) {
      setError("Select a lead, date, and available time slot.");
      return;
    }

    if (!slots.includes(slotTime)) {
      setError(
        "That slot is no longer available. Refresh the available slots."
      );
      return;
    }

    setBooking(true);

    try {
      const data = await requestJSON("/api/visits/book", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: {
          lead_id: selectedLead.id,
          project: selectedLead.project,
          visit_date: visitDate,
          slot_time: slotTime,
        },
      });

      const visit = data?.visit;

      if (!visit) {
        throw new Error(
          "The server did not return the expected booking details."
        );
      }

      setMessage(
        `Site visit booked successfully for ${
          visit.lead_name || selectedLead.name
        } on ${formatDate(
          visit.visit_date || visitDate
        )} at ${formatTime(visit.slot_time || slotTime)}.`
      );

      setSlotTime("");
      await loadData({ quiet: true });
    } catch (err) {
      setError(
        err.message ||
          "Booking failed. Please check availability and try again."
      );

      // Refresh availability because another user may have
      // booked the same slot.
      if (selectedLead && visitDate) {
        try {
          const params = new URLSearchParams({
            project: selectedLead.project || "",
            visit_date: visitDate,
          });

          const data = await requestJSON(
            `/api/visits/slots?${params.toString()}`
          );

          const availableSlots = Array.isArray(
            data?.available_slots
          )
            ? data.available_slots
            : [];

          setSlots(availableSlots);

          setSlotTime((current) =>
            availableSlots.includes(current) ? current : ""
          );
        } catch {
          setSlots([]);
          setSlotTime("");
        }
      }
    } finally {
      setBooking(false);
    }
  }

  function resetBooking() {
    setLeadId("");
    setVisitDate("");
    setSlots([]);
    setSlotTime("");
    setMessage("");
    setError("");
    setSlotError("");
  }

  return (
    <div className="min-h-screen bg-[#f7f8fc] text-slate-900">
      <div className="mx-auto max-w-[1440px] space-y-7 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              EstateMate AI
              <ChevronRight size={13} />
              Workspace
            </div>

            <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              Site visits
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
              Schedule property tours, manage appointments, and give
              every prospective buyer a smoother experience.
            </p>
          </div>

          <button
            type="button"
            onClick={() => loadData({ quiet: true })}
            disabled={loading || refreshing}
            className="inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 sm:self-auto"
          >
            <RefreshCw
              size={16}
              className={refreshing ? "animate-spin" : ""}
            />
            Refresh data
          </button>
        </header>

        {message && (
          <div
            role="status"
            className="flex gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900"
          >
            <CheckCircle2
              className="mt-0.5 shrink-0 text-emerald-600"
              size={21}
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">Booking confirmed</p>
              <p className="mt-1 text-sm leading-6">{message}</p>
            </div>
            <button
              type="button"
              onClick={() => setMessage("")}
              aria-label="Dismiss success message"
              className="self-start rounded-lg p-1 text-emerald-700 hover:bg-emerald-100"
            >
              ×
            </button>
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="flex gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-900"
          >
            <AlertCircle
              className="mt-0.5 shrink-0 text-rose-600"
              size={21}
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">
                Something needs attention
              </p>
              <p className="mt-1 break-words text-sm leading-6">
                {error}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setError("")}
              aria-label="Dismiss error message"
              className="self-start rounded-lg p-1 text-rose-700 hover:bg-rose-100"
            >
              ×
            </button>
          </div>
        )}

        <section
          aria-label="Site visit summary"
          className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
        >
          <StatCard
            icon={CalendarClock}
            label="Booked appointments"
            value={loading ? "—" : bookedVisits.length}
            description="Visits currently marked as booked"
            tone="blue"
          />

          <StatCard
            icon={CircleCheck}
            label="Completed visits"
            value={loading ? "—" : completedVisits.length}
            description="Visits marked as completed"
            tone="green"
          />

          <StatCard
            icon={Users}
            label="Total appointments"
            value={loading ? "—" : visits.length}
            description="All booked and completed visits"
            tone="violet"
          />
        </section>

        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.25fr)]">
          <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
            <div className="border-b border-slate-100 bg-gradient-to-br from-white to-emerald-50/60 px-5 py-5 sm:px-7">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800">
                  <CalendarCheck size={22} />
                </div>

                <div>
                  <h2 className="text-lg font-bold tracking-tight text-slate-950">
                    Book a site visit
                  </h2>
                  <p className="mt-1 text-sm leading-5 text-slate-500">
                    Choose a buyer, date, and available appointment.
                  </p>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-700 text-white">
                  1
                </span>
                Select details
                <ArrowRight size={13} />
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-700 text-white">
                  2
                </span>
                Choose a time
                <ArrowRight size={13} />
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-700 text-white">
                  3
                </span>
                Confirm
              </div>
            </div>

            <form
              onSubmit={handleBooking}
              className="space-y-6 p-5 sm:p-7"
            >
              <div>
                <label
                  htmlFor="lead"
                  className="mb-2 block text-sm font-semibold text-slate-800"
                >
                  Select lead <span className="text-rose-500">*</span>
                </label>

                <div className="relative">
                  <Users
                    size={18}
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <select
                    id="lead"
                    value={leadId}
                    onChange={(event) => setLeadId(event.target.value)}
                    required
                    disabled={loading || leads.length === 0}
                    className="min-h-12 w-full appearance-none rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-10 text-sm text-slate-800 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10 disabled:cursor-not-allowed disabled:bg-slate-50"
                  >
                    <option value="">
                      {loading
                        ? "Loading leads..."
                        : leads.length === 0
                          ? "No leads available"
                          : "Choose a lead"}
                    </option>

                    {leads.map((lead) => (
                      <option key={lead.id} value={lead.id}>
                        {lead.name} · {lead.id}
                      </option>
                    ))}
                  </select>
                </div>

                {!loading && leads.length === 0 && !error && (
                  <p className="mt-2 text-xs text-amber-700">
                    No leads were returned. Refresh data or check the
                    backend response.
                  </p>
                )}
              </div>

              {selectedLead && (
                <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-700 shadow-sm ring-1 ring-slate-200">
                        <Building2 size={19} />
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-slate-900">
                          {selectedLead.name}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          Lead ID: {selectedLead.id}
                        </p>
                      </div>
                    </div>

                    <span className="shrink-0 rounded-lg bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
                      {selectedLead.bhk || "BHK not specified"}
                    </span>
                  </div>

                  <div className="mt-4 flex items-center gap-2 border-t border-slate-200 pt-3 text-sm text-slate-600">
                    <MapPin size={16} className="shrink-0 text-emerald-700" />
                    <span>{selectedLead.project || "Project not specified"}</span>
                  </div>
                </div>
              )}

              <div>
                <label
                  htmlFor="visitDate"
                  className="mb-2 block text-sm font-semibold text-slate-800"
                >
                  Preferred date <span className="text-rose-500">*</span>
                </label>

                <div className="relative">
                  <CalendarDays
                    size={18}
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    id="visitDate"
                    type="date"
                    min={today()}
                    value={visitDate}
                    onChange={(event) => setVisitDate(event.target.value)}
                    required
                    className="min-h-12 w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-3 text-sm text-slate-800 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10"
                  />
                </div>

                <p className="mt-2 text-xs text-slate-500">
                  Available appointment times update automatically.
                </p>
              </div>

              <div>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <label className="text-sm font-semibold text-slate-800">
                    Available time slots{" "}
                    <span className="text-rose-500">*</span>
                  </label>

                  {slots.length > 0 && !loadingSlots && (
                    <span className="text-xs font-medium text-emerald-700">
                      {slots.length} available
                    </span>
                  )}
                </div>

                {!selectedLead || !visitDate ? (
                  <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/70 px-4 py-7 text-center">
                    <CalendarDays size={23} className="mx-auto text-slate-400" />
                    <p className="mt-2 text-sm font-medium text-slate-700">
                      Choose a lead and date
                    </p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      Available appointment times will appear here.
                    </p>
                  </div>
                ) : loadingSlots ? (
                  <div
                    className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 py-8 text-sm text-slate-500"
                    role="status"
                  >
                    <LoaderCircle size={18} className="animate-spin" />
                    Checking availability...
                  </div>
                ) : slotError ? (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
                    <p className="text-sm text-rose-800">{slotError}</p>
                    <button
                      type="button"
                      onClick={() => {
                        setVisitDate("");
                        window.setTimeout(() => setVisitDate(visitDate), 0);
                      }}
                      className="mt-2 text-sm font-semibold text-rose-800 underline underline-offset-4"
                    >
                      Retry availability
                    </button>
                  </div>
                ) : slots.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/70 px-4 py-7 text-center">
                    <Clock3 size={23} className="mx-auto text-slate-400" />
                    <p className="mt-2 text-sm font-medium text-slate-700">
                      No available times
                    </p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      Try another date to find an available appointment.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                    {slots.map((slot) => {
                      const isSelected = slotTime === slot;

                      return (
                        <button
                          type="button"
                          key={slot}
                          onClick={() => {
                            setSlotTime(slot);
                            setError("");
                          }}
                          aria-pressed={isSelected}
                          className={`flex min-h-12 items-center justify-center gap-2 rounded-xl border px-3 py-3 text-sm font-semibold transition focus:outline-none focus:ring-4 focus:ring-emerald-600/15 ${
                            isSelected
                              ? "border-emerald-700 bg-emerald-700 text-white shadow-sm"
                              : "border-slate-200 bg-white text-slate-700 hover:border-emerald-400 hover:bg-emerald-50/60"
                          }`}
                        >
                          <Clock3 size={15} />
                          {formatTime(slot)}
                          {isSelected && <CheckCircle2 size={15} />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {selectedLead && visitDate && slotTime && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle2
                      size={19}
                      className="mt-0.5 shrink-0 text-emerald-700"
                    />

                    <div>
                      <p className="text-sm font-semibold text-emerald-950">
                        Appointment summary
                      </p>
                      <p className="mt-1 text-sm leading-6 text-emerald-900">
                        {selectedLead.name}
                        <br />
                        {formatDate(visitDate)} at {formatTime(slotTime)}
                        <br />
                        {selectedLead.project}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row">
                <button
                  type="button"
                  onClick={resetBooking}
                  disabled={booking}
                  className="min-h-12 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50 sm:flex-1"
                >
                  Reset
                </button>

                <button
                  type="submit"
                  disabled={
                    booking ||
                    loading ||
                    loadingSlots ||
                    !selectedLead ||
                    !visitDate ||
                    !slotTime ||
                    !slots.includes(slotTime)
                  }
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800 focus:outline-none focus:ring-4 focus:ring-emerald-700/20 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
                >
                  {booking ? (
                    <>
                      <LoaderCircle size={17} className="animate-spin" />
                      Booking visit...
                    </>
                  ) : (
                    <>
                      Confirm booking
                      <ArrowRight size={17} />
                    </>
                  )}
                </button>
              </div>
            </form>
          </section>

          <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
            <div className="flex flex-col justify-between gap-4 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:px-6">
              <div>
                <h2 className="text-lg font-bold tracking-tight text-slate-950">
                  Appointments
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Keep track of booked and completed property visits.
                </p>
              </div>

              <span className="inline-flex w-fit items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700">
                <CalendarCheck size={14} />
                {visits.length} total
              </span>
            </div>

            <div className="flex gap-2 overflow-x-auto border-b border-slate-100 px-5 py-3 sm:px-6">
              {[
                { label: "All visits", value: "All" },
                { label: "Booked", value: "Upcoming" },
                { label: "Completed", value: "Completed" },
              ].map((filter) => (
                <button
                  key={filter.value}
                  type="button"
                  onClick={() => setVisitFilter(filter.value)}
                  aria-pressed={visitFilter === filter.value}
                  className={`shrink-0 rounded-lg px-3.5 py-2 text-xs font-semibold transition ${
                    visitFilter === filter.value
                      ? "bg-slate-900 text-white"
                      : "bg-white text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
                <LoaderCircle size={18} className="animate-spin" />
                Loading appointments...
              </div>
            ) : filteredVisits.length === 0 ? (
              <EmptyState
                icon={CalendarDays}
                title={
                  visits.length === 0
                    ? "No appointments yet"
                    : "No visits in this category"
                }
                description={
                  visits.length === 0
                    ? "Once you confirm a booking, the appointment will appear here."
                    : "Try another filter to view your other appointments."
                }
              />
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredVisits.map((visit, index) => {
                  const timestamp = visit.visit_time;
                  const parsedDate = timestamp
                    ? new Date(timestamp)
                    : null;

                  const validDate =
                    parsedDate &&
                    !Number.isNaN(parsedDate.getTime());

                  const isVisited = visit.visit_status === "Visited";

                  return (
                    <article
                      key={
                        visit.id ||
                        `${visit.lead_id}-${visit.visit_time}-${index}`
                      }
                      className="group px-5 py-5 transition hover:bg-slate-50/70 sm:px-6"
                    >
                      <div className="flex items-start gap-3.5">
                        <div
                          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                            isVisited
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-blue-50 text-blue-700"
                          }`}
                        >
                          {isVisited ? (
                            <CheckCircle2 size={21} />
                          ) : (
                            <CalendarDays size={21} />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
                            <div className="min-w-0">
                              <h3 className="truncate text-sm font-bold text-slate-900">
                                {visit.lead_name || "Unnamed lead"}
                              </h3>
                              <p className="mt-1 text-xs text-slate-500">
                                {visit.lead_id}
                              </p>
                            </div>

                            <StatusBadge status={visit.visit_status} />
                          </div>

                          <div className="mt-4 grid gap-3 sm:grid-cols-2">
                            <div className="flex min-w-0 items-start gap-2.5">
                              <CalendarDays
                                size={16}
                                className="mt-0.5 shrink-0 text-slate-400"
                              />
                              <div>
                                <p className="text-xs text-slate-500">
                                  Appointment
                                </p>
                                <p className="mt-1 text-sm font-semibold text-slate-800">
                                  {validDate
                                    ? formatDate(timestamp.slice(0, 10))
                                    : "Date not specified"}
                                </p>
                                <p className="mt-0.5 text-xs text-slate-500">
                                  {validDate
                                    ? formatTime(timestamp.slice(11, 16))
                                    : "Time not specified"}
                                </p>
                              </div>
                            </div>

                            <div className="flex min-w-0 items-start gap-2.5">
                              <MapPin
                                size={16}
                                className="mt-0.5 shrink-0 text-slate-400"
                              />
                              <div className="min-w-0">
                                <p className="text-xs text-slate-500">
                                  Property
                                </p>
                                <p className="mt-1 break-words text-sm font-semibold text-slate-800">
                                  {visit.project || "Project not specified"}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}

            <div className="flex items-center gap-2 border-t border-slate-100 bg-slate-50/70 px-5 py-3.5 text-xs leading-5 text-slate-500 sm:px-6">
              <Sparkles size={15} className="shrink-0 text-emerald-700" />
              Appointment availability is checked against your backend.
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
