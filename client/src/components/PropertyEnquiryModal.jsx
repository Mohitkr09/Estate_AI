import React, { useState } from "react";
import { api, getApiErrorMessage } from "../services/api";

export default function PropertyEnquiryModal({
  property,
  onClose,
  onSuccess,
}) {
  const [form, setForm] = useState({
    name: "",
    phone: "",
    consent: false,
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!property) return null;

  const projectName =
    property.project_name || "Residential property";

  const propertyId =
    property.property_id || property.id || "";

  const updateField = (event) => {
    const { name, value, checked, type } = event.target;

    setForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    const name = form.name.trim();
    const phone = form.phone.trim();

    if (name.length < 2) {
      setError("Please enter your full name.");
      return;
    }

    // Accept common Indian phone formats.
    const normalizedPhone = phone.replace(/[\s()-]/g, "");

    if (!/^(?:\+91)?[6-9]\d{9}$/.test(normalizedPhone)) {
      setError("Enter a valid 10-digit Indian mobile number.");
      return;
    }

    if (!form.consent) {
      setError("Please provide consent before submitting.");
      return;
    }

    setSubmitting(true);

    try {
      const response = await api.post("/api/leads", {
        name,
        phone: normalizedPhone,
        source: "property_enquiry",
        project: projectName,
        bhk: property.bhk || null,
        budget:
          property.price_inr != null
            ? Number(property.price_inr)
            : null,
        consent: true,
      });

      onSuccess?.(response.data);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !submitting) {
          onClose();
        }
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="property-enquiry-title"
        className="my-auto w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <div className="relative overflow-hidden bg-gradient-to-br from-emerald-950 to-emerald-800 px-6 py-6 text-white sm:px-8">
          <div className="absolute -right-10 -top-12 h-36 w-36 rounded-full bg-white/10 blur-2xl" />

          <div className="relative flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-200">
                EstateMate AI
              </p>

              <h2
                id="property-enquiry-title"
                className="mt-2 text-2xl font-bold"
              >
                Enquire about property
              </h2>

              <p className="mt-2 text-sm leading-6 text-emerald-100/80">
                Share your details and our sales team can follow up.
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              aria-label="Close enquiry form"
              className="rounded-lg p-2 text-xl text-white transition hover:bg-white/10 disabled:opacity-50"
            >
              ×
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 p-6 sm:p-8">
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
              Selected property
            </p>

            <h3 className="mt-2 font-bold text-slate-900">
              {projectName}
            </h3>

            <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-600">
              {property.unit_number && (
                <span className="rounded-md bg-white px-2.5 py-1.5">
                  Unit {property.unit_number}
                </span>
              )}

              {property.bhk && (
                <span className="rounded-md bg-white px-2.5 py-1.5">
                  {property.bhk}
                </span>
              )}

              {property.price_inr != null && (
                <span className="rounded-md bg-white px-2.5 py-1.5 font-semibold text-emerald-800">
                  ₹{Number(property.price_inr).toLocaleString("en-IN")}
                </span>
              )}
            </div>

            {propertyId && (
              <p className="mt-2 break-all text-xs text-slate-400">
                Property ID: {propertyId}
              </p>
            )}
          </div>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">
              Full name <span className="text-red-500">*</span>
            </span>

            <input
              name="name"
              type="text"
              autoComplete="name"
              maxLength={100}
              required
              value={form.name}
              onChange={updateField}
              placeholder="Enter your full name"
              className="h-12 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">
              Mobile number <span className="text-red-500">*</span>
            </span>

            <input
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              maxLength={16}
              required
              value={form.phone}
              onChange={updateField}
              placeholder="Enter your mobile number"
              className="h-12 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10"
            />

            <span className="mt-1.5 block text-xs text-slate-400">
              Indian mobile number, with optional +91 prefix.
            </span>
          </label>

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-4">
            <input
              type="checkbox"
              name="consent"
              checked={form.consent}
              onChange={updateField}
              required
              className="mt-1 h-4 w-4 shrink-0 accent-emerald-700"
            />

            <span className="text-xs leading-5 text-slate-600">
              I consent to EstateMate AI using my contact details
              to respond to this property enquiry and allow its
              sales team to contact me about this request.
              <span className="text-red-500"> *</span>
            </span>
          </label>

          {error && (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm leading-5 text-red-700"
            >
              {error}
            </div>
          )}

          <div className="flex flex-col-reverse gap-3 sm:flex-row">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="min-h-12 flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="min-h-12 flex-1 rounded-xl bg-emerald-800 px-4 py-3 text-sm font-bold text-white transition hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Submitting..." : "Submit enquiry"}
            </button>
          </div>

          <p className="text-center text-xs leading-5 text-slate-400">
            Your enquiry will be submitted securely to EstateMate AI.
          </p>
        </form>
      </section>
    </div>
  );
}
