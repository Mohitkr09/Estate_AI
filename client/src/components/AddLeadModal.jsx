
import { useEffect, useState } from "react";
import { X, LoaderCircle, UserRoundPlus } from "lucide-react";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8000"
).replace(/\/$/, "");

const INITIAL_FORM = {
  name: "",
  phone: "",
  source: "Website",
  project: "",
  bhk: "",
  budget: "",
  consent: false,
};

const SOURCES = [
  "Website",
  "Property portal",
  "Social media ad",
  "Hoarding call",
  "Referral",
  "Walk-in",
  "Other",
];

const CONFIGURATIONS = ["1 BHK", "2 BHK", "3 BHK", "4 BHK", "Villa", "Other"];

export default function AddLeadModal({
  onClose,
  onCreated,
  lead = null,
  onUpdated,
}) {
  const isEditing = Boolean(lead);
  const [form, setForm] = useState(INITIAL_FORM);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!lead) {
      setForm(INITIAL_FORM);
      return;
    }

    setForm({
      name: lead.name || "",
      phone: lead.phone || "",
      source: lead.source || "Website",
      project: lead.project || "",
      bhk: lead.bhk || "",
      budget: lead.budget ?? "",
      consent: Boolean(lead.consent),
    });
  }, [lead]);

  useEffect(() => {
    function handleEscape(event) {
      if (event.key === "Escape" && !loading) onClose();
    }

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose, loading]);

  function updateField(event) {
    const { name, value, type, checked } = event.target;

    setForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    const digits = form.phone.replace(/\D/g, "");

    if (form.name.trim().length < 2) {
      setError("Enter a name containing at least 2 characters.");
      return;
    }

    if (digits.length < 7 || digits.length > 15) {
      setError("Enter a valid phone number containing 7–15 digits.");
      return;
    }

    if (!form.project.trim()) {
      setError("Please enter the project name.");
      return;
    }

    const budget =
      form.budget === "" ? null : Number(form.budget);

    if (budget !== null && (!Number.isFinite(budget) || budget < 0)) {
      setError("Budget must be a valid non-negative number.");
      return;
    }

    const payload = {
      name: form.name.trim(),
      phone: form.phone.trim(),
      source: form.source,
      project: form.project.trim(),
      bhk: form.bhk || null,
      budget,
      consent: form.consent,
    };

    setLoading(true);

    try {
      const endpoint = isEditing
        ? `${API_URL}/api/leads/${encodeURIComponent(lead.id)}`
        : `${API_URL}/api/leads`;

      const response = await fetch(endpoint, {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const detail = data.detail || data.error;
        throw new Error(
          typeof detail === "string"
            ? detail
            : "Unable to save the lead. Check the submitted information."
        );
      }

      if (isEditing) {
        await onUpdated?.(data);
      } else {
        if (data.duplicate) {
          throw new Error(
            `This phone number already belongs to lead ${
              data.existing_lead?.id || ""
            }.`
          );
        }

        await onCreated?.(data);
      }

      onClose();
    } catch (err) {
      setError(
        err.message ||
          "Unable to connect to the server. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !loading) {
          onClose();
        }
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="lead-form-title"
        className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between border-b border-slate-100 p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-emerald-50 p-3 text-emerald-700">
              <UserRoundPlus size={22} />
            </div>

            <div>
              <h2
                id="lead-form-title"
                className="text-xl font-bold text-slate-900"
              >
                {isEditing ? "Edit lead" : "Add a new lead"}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {isEditing
                  ? "Update the buyer's information."
                  : "Capture a new property enquiry."}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            aria-label="Close form"
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50"
          >
            <X size={19} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 p-6">
          {error && (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
            >
              {error}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name *">
              <input
                name="name"
                value={form.name}
                onChange={updateField}
                required
                minLength={2}
                maxLength={100}
                placeholder="e.g. Rahul Sharma"
                className={inputClass}
              />
            </Field>

            <Field label="Phone number *">
              <input
                name="phone"
                value={form.phone}
                onChange={updateField}
                required
                maxLength={20}
                inputMode="tel"
                placeholder="e.g. 9876543210"
                className={inputClass}
              />
            </Field>

            <Field label="Project *">
              <input
                name="project"
                value={form.project}
                onChange={updateField}
                required
                maxLength={100}
                placeholder="e.g. Project 1"
                className={inputClass}
              />
            </Field>

            <Field label="Lead source *">
              <select
                name="source"
                value={form.source}
                onChange={updateField}
                required
                className={inputClass}
              >
                {SOURCES.map((source) => (
                  <option key={source} value={source}>
                    {source}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Configuration">
              <select
                name="bhk"
                value={form.bhk}
                onChange={updateField}
                className={inputClass}
              >
                <option value="">Not specified</option>
                {CONFIGURATIONS.map((configuration) => (
                  <option key={configuration} value={configuration}>
                    {configuration}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Budget (₹)">
              <input
                type="number"
                name="budget"
                value={form.budget}
                onChange={updateField}
                min="0"
                step="1"
                placeholder="e.g. 7500000"
                className={inputClass}
              />
            </Field>
          </div>

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-4">
            <input
              type="checkbox"
              name="consent"
              checked={form.consent}
              onChange={updateField}
              className="mt-1 h-4 w-4 accent-emerald-700"
            />
            <span className="text-sm leading-5 text-slate-600">
              The buyer has consented to receive relevant property-related
              communications.
            </span>
          </label>

          <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading && (
                <LoaderCircle size={17} className="animate-spin" />
              )}
              {loading
                ? "Saving..."
                : isEditing
                  ? "Save changes"
                  : "Create lead"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-semibold text-slate-700">
        {label}
      </span>
      {children}
    </label>
  );
}

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10";
