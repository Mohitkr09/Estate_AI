
import React, { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  MapPin,
  BedDouble,
  Ruler,
  Layers3,
  CalendarDays,
  ShieldCheck,
  Building2,
  CheckCircle2,
  AlertCircle,
  LoaderCircle,
  Phone,
  Mail,
  Home,
} from "lucide-react";
import { api, getApiErrorMessage } from "../services/api.js";

const formatPrice = (price) => {
  const value = Number(price);
  if (!Number.isFinite(value)) return "Price unavailable";
  return `₹${value.toLocaleString("en-IN")}`;
};

const formatArea = (area) => {
  if (area === null || area === undefined || area === "") {
    return "Not specified";
  }
  return `${Number(area).toLocaleString("en-IN")} sq. ft.`;
};

const formatDate = (dateValue) => {
  if (!dateValue) return "To be confirmed";

  const parsedDate = new Date(dateValue);
  if (Number.isNaN(parsedDate.getTime())) return String(dateValue);

  return parsedDate.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10";

const labelClass = "grid gap-2 text-sm font-semibold text-slate-700";

const primaryButton =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60";

const secondaryButton =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-blue-300 hover:bg-blue-50";

function DetailItem({ label, value }) {
  return (
    <div className="flex min-w-0 flex-col gap-2 border-b border-slate-100 py-4">
      <span className="text-xs font-medium text-slate-500">{label}</span>
      <strong className="break-words text-sm font-semibold text-slate-800">
        {value ?? "Not specified"}
      </strong>
    </div>
  );
}

function OverviewCard({ icon: Icon, label, value }) {
  return (
    <article className="flex min-w-0 items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
        <Icon size={22} />
      </div>
      <div className="min-w-0">
        <p className="mb-1 text-xs text-slate-500">{label}</p>
        <p className="break-words text-sm font-bold text-slate-800">
          {value || "Not specified"}
        </p>
      </div>
    </article>
  );
}

function SectionHeading({ icon: Icon, title, subtitle }) {
  return (
    <div className="mb-6 flex items-center gap-3">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
        <Icon size={21} />
      </div>
      <div>
        <h2 className="text-lg font-bold text-slate-900">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
      </div>
    </div>
  );
}

export default function PropertyDetails() {
  const { propertyId } = useParams();

  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activePanel, setActivePanel] = useState("");
  const [formMessage, setFormMessage] = useState("");

  const [enquiry, setEnquiry] = useState({
    name: "",
    phone: "",
    email: "",
    message: "",
  });

  const [visit, setVisit] = useState({
    name: "",
    phone: "",
    date: "",
    time: "",
  });

  const loadProperty = useCallback(async () => {
    if (!propertyId) {
      setError("A property ID was not provided.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await api.get(
        `/api/properties/${encodeURIComponent(propertyId)}`
      );
      setProperty(response.data);
    } catch (err) {
      setProperty(null);
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [propertyId]);

  useEffect(() => {
    loadProperty();
  }, [loadProperty]);

  const updateEnquiry = (event) => {
    const { name, value } = event.target;
    setEnquiry((current) => ({ ...current, [name]: value }));
  };

  const updateVisit = (event) => {
    const { name, value } = event.target;
    setVisit((current) => ({ ...current, [name]: value }));
  };

  // These handlers provide the UI only. Connect them to real
  // backend endpoints before accepting actual enquiries or bookings.
  const handleEnquirySubmit = (event) => {
    event.preventDefault();
    setFormMessage(
      "The enquiry form is ready, but no enquiry has been submitted. Connect the enquiry API to continue."
    );
  };

  const handleVisitSubmit = (event) => {
    event.preventDefault();
    setFormMessage(
      "Your visit request has not been booked. Connect the site-visit API to create a booking."
    );
  };

  if (loading) {
    return (
      <main className="flex min-h-[70vh] items-center justify-center bg-slate-50 px-4">
        <div className="text-center">
          <LoaderCircle
            size={38}
            className="mx-auto animate-spin text-blue-600"
          />
          <h2 className="mt-5 text-xl font-bold text-slate-900">
            Loading property details...
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Retrieving the latest listing information.
          </p>
        </div>
      </main>
    );
  }

  if (error || !property) {
    return (
      <main className="flex min-h-[70vh] items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-red-600">
            <AlertCircle size={32} />
          </div>
          <h2 className="mt-5 text-2xl font-bold text-slate-900">
            Unable to load property
          </h2>
          <p className="mt-3 break-words text-sm leading-6 text-slate-500">
            {error ||
              "This property could not be found or is no longer available."}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={loadProperty}
              className={primaryButton}
            >
              Try again
            </button>
            <Link to="/properties" className={secondaryButton}>
              <ArrowLeft size={17} />
              Back to properties
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const amenities = Array.isArray(property.amenities)
    ? property.amenities
    : [];

  const location = [
    property.address,
    property.location,
    property.state,
  ]
    .filter(Boolean)
    .filter((value, index, values) => values.indexOf(value) === index)
    .join(", ");

  const propertyKey =
    property.property_id || property.id || propertyId;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-800 sm:px-6 sm:py-9 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Breadcrumb */}
        <nav className="mb-7 flex flex-wrap items-center gap-3 text-sm text-slate-500">
          <Link
            to="/properties"
            className="inline-flex items-center gap-2 font-semibold text-slate-700 transition hover:text-blue-600"
          >
            <ArrowLeft size={17} />
            Back to properties
          </Link>
          <span>/</span>
          <span>Property details</span>
        </nav>

        {/* Property hero */}
        <section className="relative overflow-hidden rounded-3xl border border-blue-100 bg-gradient-to-br from-white via-white to-blue-50 p-6 shadow-sm sm:p-9 lg:p-10">
          <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-blue-100/50 blur-3xl" />

          <div className="relative flex flex-col justify-between gap-8 lg:flex-row lg:items-center">
            <div className="min-w-0 flex-1">
              <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-2 text-xs font-bold tracking-wide text-blue-700">
                <ShieldCheck size={15} />
                ESTATEMATE AI · PROPERTY DETAILS
              </span>

              <h1 className="mt-5 break-words text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl lg:text-5xl">
                {property.project_name || "Residential Property"}
              </h1>

              <p className="mt-4 flex items-start gap-2 text-sm leading-6 text-slate-600 sm:text-base">
                <MapPin
                  size={20}
                  className="mt-0.5 shrink-0 text-blue-600"
                />
                {location || "Location not specified"}
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">
                  <CheckCircle2 size={15} />
                  Available listing
                </span>

                {property.bhk && (
                  <span className="rounded-full bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700">
                    {property.bhk}
                  </span>
                )}
              </div>
            </div>

            <div className="relative w-full shrink-0 rounded-2xl border border-slate-200 bg-white p-6 shadow-lg shadow-blue-950/5 sm:p-7 lg:w-72">
              <p className="text-sm font-medium text-slate-500">
                Listed price
              </p>
              <p className="mt-2 break-words text-3xl font-extrabold text-blue-700 sm:text-4xl">
                {formatPrice(property.price_inr)}
              </p>
              <p className="mt-3 text-xs leading-5 text-slate-500">
                Confirm the final price and availability with the sales team.
              </p>
            </div>
          </div>
        </section>

        {/* Quick property facts */}
        <section className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <OverviewCard
            icon={BedDouble}
            label="Configuration"
            value={property.bhk}
          />
          <OverviewCard
            icon={Ruler}
            label="Built-up area"
            value={formatArea(property.area_sqft)}
          />
          <OverviewCard
            icon={Layers3}
            label="Floor"
            value={property.floor_number ?? "Not specified"}
          />
          <OverviewCard
            icon={Building2}
            label="Unit number"
            value={property.unit_number}
          />
        </section>

        {/* Main details and sidebar */}
        <div className="mt-6 grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_350px]">
          <div className="grid min-w-0 gap-6">
            {/* Overview */}
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
              <SectionHeading
                icon={Home}
                title="About this property"
                subtitle="Property and project information"
              />

              <p className="text-sm leading-7 text-slate-600">
                Explore this {property.bhk || "residential"} apartment in{" "}
                {property.project_name || "the listed project"}. Review
                the available specifications and confirm the latest
                details with the sales team before making a decision.
              </p>

              <div className="mt-5 grid grid-cols-1 gap-x-8 sm:grid-cols-2">
                <DetailItem
                  label="Project name"
                  value={property.project_name}
                />
                <DetailItem label="Property ID" value={propertyKey} />
                <DetailItem
                  label="Possession date"
                  value={formatDate(property.possession_date)}
                />
                <DetailItem
                  label="RERA number"
                  value={property.rera_number || "Not provided"}
                />
                <DetailItem
                  label="Availability"
                  value={property.availability || "Not specified"}
                />
                <DetailItem
                  label="Location"
                  value={location || "Not specified"}
                />
              </div>
            </section>

            {/* Amenities */}
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
              <SectionHeading
                icon={CheckCircle2}
                title="Amenities"
                subtitle="Features recorded for this project"
              />

              {amenities.length > 0 ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {amenities.map((amenity, index) => (
                    <div
                      key={`${amenity}-${index}`}
                      className="flex items-start gap-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-700"
                    >
                      <CheckCircle2
                        size={18}
                        className="mt-0.5 shrink-0 text-emerald-600"
                      />
                      <span className="break-words">{amenity}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-500">
                  Amenities have not been provided for this listing.
                  Contact the sales team for further information.
                </p>
              )}
            </section>

            {/* Location */}
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
              <SectionHeading
                icon={MapPin}
                title="Location"
                subtitle="Property address"
              />

              <p className="text-sm leading-7 text-slate-600">
                {location || "Address not provided"}
              </p>

              {property.location && (
                <span className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700">
                  <MapPin size={16} />
                  {property.location}
                  {property.state ? `, ${property.state}` : ""}
                </span>
              )}
            </section>
          </div>

          {/* Contact sidebar */}
          <aside className="grid min-w-0 gap-5 lg:sticky lg:top-6">
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <Phone size={23} />
              </div>

              <h2 className="mt-5 text-xl font-bold text-slate-900">
                Interested in this property?
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-500">
                Ask about pricing, availability, documentation, or arrange
                a visit to the property.
              </p>

              <button
                type="button"
                className={`${primaryButton} mt-5 w-full`}
                onClick={() => {
                  setActivePanel("enquiry");
                  setFormMessage("");
                }}
              >
                <Mail size={17} />
                Send an enquiry
              </button>

              <button
                type="button"
                className={`${secondaryButton} mt-3 w-full`}
                onClick={() => {
                  setActivePanel("visit");
                  setFormMessage("");
                }}
              >
                <CalendarDays size={17} />
                Request a site visit
              </button>

              <p className="mt-4 text-xs leading-5 text-slate-500">
                A request is not confirmed until it is recorded by the
                backend and the sales team confirms the next steps.
              </p>
            </section>

            {/* Enquiry form */}
            {activePanel === "enquiry" && (
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <h3 className="text-lg font-bold text-slate-900">
                  Property enquiry
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Property ID: {propertyKey}
                </p>

                <form
                  className="mt-5 grid gap-4"
                  onSubmit={handleEnquirySubmit}
                >
                  <label className={labelClass}>
                    Full name
                    <input
                      className={inputClass}
                      name="name"
                      value={enquiry.name}
                      onChange={updateEnquiry}
                      placeholder="Your name"
                      autoComplete="name"
                      required
                    />
                  </label>

                  <label className={labelClass}>
                    Phone number
                    <input
                      className={inputClass}
                      name="phone"
                      value={enquiry.phone}
                      onChange={updateEnquiry}
                      placeholder="Your phone number"
                      type="tel"
                      autoComplete="tel"
                      required
                    />
                  </label>

                  <label className={labelClass}>
                    Email address
                    <input
                      className={inputClass}
                      name="email"
                      value={enquiry.email}
                      onChange={updateEnquiry}
                      placeholder="you@example.com"
                      type="email"
                      autoComplete="email"
                      required
                    />
                  </label>

                  <label className={labelClass}>
                    Message
                    <textarea
                      className={`${inputClass} resize-y`}
                      name="message"
                      value={enquiry.message}
                      onChange={updateEnquiry}
                      placeholder="What would you like to know?"
                      rows={3}
                    />
                  </label>

                  <button type="submit" className={primaryButton}>
                    Submit enquiry
                  </button>
                </form>
              </section>
            )}

            {/* Site visit form */}
            {activePanel === "visit" && (
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <h3 className="text-lg font-bold text-slate-900">
                  Request a site visit
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Select your preferred date and time.
                </p>

                <form
                  className="mt-5 grid gap-4"
                  onSubmit={handleVisitSubmit}
                >
                  <label className={labelClass}>
                    Full name
                    <input
                      className={inputClass}
                      name="name"
                      value={visit.name}
                      onChange={updateVisit}
                      placeholder="Your name"
                      autoComplete="name"
                      required
                    />
                  </label>

                  <label className={labelClass}>
                    Phone number
                    <input
                      className={inputClass}
                      name="phone"
                      value={visit.phone}
                      onChange={updateVisit}
                      placeholder="Your phone number"
                      type="tel"
                      autoComplete="tel"
                      required
                    />
                  </label>

                  <label className={labelClass}>
                    Preferred date
                    <input
                      className={inputClass}
                      name="date"
                      type="date"
                      min={new Date().toLocaleDateString("en-CA")}
                      value={visit.date}
                      onChange={updateVisit}
                      required
                    />
                  </label>

                  <label className={labelClass}>
                    Preferred time
                    <select
                      className={inputClass}
                      name="time"
                      value={visit.time}
                      onChange={updateVisit}
                      required
                    >
                      <option value="">Select a time</option>
                      <option value="10:00">10:00 AM</option>
                      <option value="11:00">11:00 AM</option>
                      <option value="12:00">12:00 PM</option>
                      <option value="14:00">2:00 PM</option>
                      <option value="15:00">3:00 PM</option>
                      <option value="16:00">4:00 PM</option>
                    </select>
                  </label>

                  <button type="submit" className={primaryButton}>
                    Request visit
                  </button>
                </form>
              </section>
            )}

            {formMessage && (
              <div
                role="status"
                className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900"
              >
                <AlertCircle size={19} className="mt-0.5 shrink-0" />
                <p>{formMessage}</p>
              </div>
            )}
          </aside>
        </div>

        {/* Disclaimer */}
        <footer className="mt-6 flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-100 p-5 text-slate-600">
          <ShieldCheck size={20} className="mt-0.5 shrink-0 text-blue-600" />
          <p className="text-xs leading-6">
            Property information is based on the listing data returned by
            EstateMate AI. Confirm pricing, availability, amenities,
            possession details, and RERA information with the sales team or
            official records before making a purchase.
          </p>
        </footer>
      </div>
    </main>
  );
}
