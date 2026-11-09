import React, { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, getApiErrorMessage } from "../services/api";

const DEFAULT_PROPERTY_IMAGES = [
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?auto=format&fit=crop&w=1200&q=80",
];

const FALLBACK_IMAGE =
  "https://placehold.co/1200x800/e8f0e9/47634d?text=EstateMate+Property";

const formatPrice = (value) => {
  if (value === undefined || value === null || value === "") {
    return "Price on request";
  }

  if (typeof value === "string" && /[₹,]/.test(value)) {
    return value;
  }

  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return String(value);
  }

  if (amount >= 10000000) {
    return `₹${(amount / 10000000).toFixed(2)} Cr`;
  }

  if (amount >= 100000) {
    return `₹${(amount / 100000).toFixed(2)} L`;
  }

  return `₹${amount.toLocaleString("en-IN")}`;
};

/* Extract property images from common API response fields. */
const getPropertyImages = (property) => {
  if (!property) return [];

  const candidates = [
    ...(Array.isArray(property.images) ? property.images : []),
    ...(Array.isArray(property.photos) ? property.photos : []),
    ...(Array.isArray(property.image_urls) ? property.image_urls : []),
    ...(Array.isArray(property.photo_urls) ? property.photo_urls : []),

    property.image_url,
    property.property_image_url,
    property.main_image_url,
    property.primary_image,
    property.cover_image,
    property.thumbnail_url,
    property.thumbnail,
    property.photo_url,
    property.image,
  ];

  const images = candidates
    .map((item) => {
      if (typeof item === "string") {
        return item.trim();
      }

      if (item && typeof item === "object") {
        return (
          item.url ||
          item.image_url ||
          item.src ||
          item.photo_url ||
          null
        );
      }

      return null;
    })
    .filter(
      (url) =>
        typeof url === "string" &&
        url.trim().length > 0
    );

  return [...new Set(images)];
};

const getPropertyId = (property) =>
  property?.id ??
  property?.property_id ??
  property?._id ??
  property?.uuid ??
  null;

const getAmenities = (property) => {
  const value =
    property?.amenities ??
    property?.features ??
    property?.facilities ??
    [];

  if (Array.isArray(value)) {
    return value
      .map((item) =>
        typeof item === "string"
          ? item
          : item?.name || item?.title
      )
      .filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
};

function InfoItem({ label, value }) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-1 font-semibold text-gray-900">{value}</p>
    </div>
  );
}

function PropertyDetails() {
  const { propertyId } = useParams();

  const [property, setProperty] = useState(null);
  const [images, setImages] = useState([]);
  const [activeImage, setActiveImage] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [enquiry, setEnquiry] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [enquirySuccess, setEnquirySuccess] = useState("");
  const [enquiryError, setEnquiryError] = useState("");
  const [showGallery, setShowGallery] = useState(false);

  /* Fetch property details from the existing API. */
  const loadProperty = useCallback(async () => {
    if (!propertyId) {
      setError("No property ID was provided.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await api.get(
        `/api/properties/${encodeURIComponent(propertyId)}`
      );

      const responseData = response.data;

      const result =
        responseData?.property ??
        responseData?.data ??
        responseData;

      if (
        !result ||
        typeof result !== "object" ||
        Array.isArray(result)
      ) {
        throw new Error("The server returned invalid property data.");
      }

      setProperty(result);

      const propertyImages = getPropertyImages(result);

      // Prefer images returned by your backend.
      // Use sample property photos if the API has no image URLs.
      setImages(
        propertyImages.length > 0
          ? propertyImages
          : DEFAULT_PROPERTY_IMAGES
      );

      setActiveImage(0);
    } catch (err) {
      console.error("Failed to load property:", err);

      if (err.response?.status === 404) {
        setError(
          "This property could not be found or is no longer available."
        );
      } else {
        setError(
          getApiErrorMessage(err) ||
            "Unable to load property details. Please try again."
        );
      }
    } finally {
      setLoading(false);
    }
  }, [propertyId]);

  useEffect(() => {
    loadProperty();
  }, [loadProperty]);

  /* Keyboard navigation for the fullscreen gallery. */
  useEffect(() => {
    if (!showGallery) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setShowGallery(false);
      }

      if (event.key === "ArrowRight") {
        setActiveImage(
          (current) => (current + 1) % images.length
        );
      }

      if (event.key === "ArrowLeft") {
        setActiveImage(
          (current) =>
            (current - 1 + images.length) % images.length
        );
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [showGallery, images.length]);

  /* Update enquiry form fields. */
  const updateEnquiry = (event) => {
    const { name, value } = event.target;

    setEnquiry((current) => ({
      ...current,
      [name]: value,
    }));
  };

  /* Submit enquiry using the existing backend endpoint. */
  
  /* Submit a public property enquiry. */
  const submitEnquiry = async (event) => {
    event.preventDefault();

    setEnquiryError("");
    setEnquirySuccess("");

    if (!property) {
      setEnquiryError("Property information is unavailable.");
      return;
    }

    const name = enquiry.name.trim();
    const email = enquiry.email.trim();
    const phone = enquiry.phone.trim();
    const message = enquiry.message.trim();

    if (name.length < 2) {
      setEnquiryError("Please enter your full name.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEnquiryError("Please enter a valid email address.");
      return;
    }

    const phoneDigits = phone.replace(/\D/g, "");

    if (phoneDigits.length < 7 || phoneDigits.length > 15) {
      setEnquiryError(
        "Please enter a valid phone number containing 7–15 digits."
      );
      return;
    }

    const propertyTitle =
      property.title ||
      property.property_name ||
      property.name ||
      "Property enquiry";

    setSubmitting(true);

    try {
      const payload = {
        name,
        email,
        phone,
        message:
          message ||
          `I would like to know more about ${propertyTitle}.`,
        source: "Property Website",
        project: propertyTitle,
        property_id: String(
          getPropertyId(property) ?? propertyId
        ),
        consent: true,
        bhk:
          property.bhk != null
            ? String(property.bhk)
            : property.bedrooms != null
              ? String(property.bedrooms)
              : undefined,
      };

      const response = await api.post(
        "/api/public/enquiries",
        payload
      );

      setEnquirySuccess(
        response.data?.duplicate
          ? "Your enquiry has been received. Our team can follow up on your request."
          : "Your enquiry has been submitted successfully. Our team will contact you soon."
      );

      setEnquiry({
        name: "",
        email: "",
        phone: "",
        message: "",
      });
    } catch (err) {
      console.error(
        "Failed to submit property enquiry:",
        err.response?.data || err
      );

      const statusCode = err.response?.status;

      if (statusCode === 404) {
        setEnquiryError(
          "The enquiry endpoint was not found. Please ensure the updated backend is deployed."
        );
      } else if (statusCode === 422) {
        const detail = err.response?.data?.detail;

        setEnquiryError(
          typeof detail === "string"
            ? detail
            : "Please check your details and try again."
        );
      } else if (statusCode === 429) {
        setEnquiryError(
          "Too many enquiries have been submitted. Please wait and try again."
        );
      } else {
        setEnquiryError(
          getApiErrorMessage(err) ||
            "Unable to submit your enquiry. Please try again."
        );
      }
    } finally {
      setSubmitting(false);
    }
  };


  const title =
    property?.title ||
    property?.property_name ||
    property?.name ||
    "Property details";

  const location = [
    property?.locality || property?.location || property?.address,
    property?.city,
    property?.state,
  ]
    .filter(Boolean)
    .join(", ");

  const price =
    property?.price ??
    property?.price_inr ??
    property?.price_in_rupees ??
    property?.budget_inr;

  const bedrooms =
    property?.bedrooms ??
    property?.bhk ??
    property?.configuration;

  const bathrooms = property?.bathrooms;

  const area =
    property?.area ??
    property?.area_sqft ??
    property?.size_sqft;

  const propertyType =
    property?.property_type ?? property?.type;

  const amenities = getAmenities(property);

  const description =
    property?.description ||
    property?.details ||
    "Contact our team to learn more about this property, its availability, and the available amenities.";

  const propertyStatus =
    property?.status || property?.availability || "Available";

  const formattedArea =
    area !== undefined && area !== null && area !== ""
      ? `${area}${
          typeof area === "number" ||
          /^\d+(\.\d+)?$/.test(String(area))
            ? " sq. ft."
            : ""
        }`
      : null;

  /* Loading screen. */
  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-20">
        <div className="mx-auto max-w-6xl animate-pulse">
          <div className="mb-6 h-5 w-40 rounded bg-gray-200" />

          <div className="grid gap-6 md:grid-cols-2">
            <div className="h-80 rounded-2xl bg-gray-200 md:h-[480px]" />

            <div className="space-y-4">
              <div className="h-8 w-3/4 rounded bg-gray-200" />
              <div className="h-6 w-1/2 rounded bg-gray-200" />
              <div className="h-20 rounded bg-gray-200" />
              <div className="h-12 rounded bg-gray-200" />
            </div>
          </div>

          <p className="mt-6 text-center text-sm text-gray-500">
            Loading property details...
          </p>
        </div>
      </main>
    );
  }

  /* Error screen. */
  if (error || !property) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-16">
        <div className="w-full max-w-lg rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-3xl">
            !
          </div>

          <h1 className="mt-5 text-2xl font-bold text-gray-900">
            Property unavailable
          </h1>

          <p className="mt-3 text-gray-600">
            {error || "We couldn't find this property."}
          </p>

          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={loadProperty}
              className="rounded-xl bg-emerald-700 px-5 py-3 font-semibold text-white transition hover:bg-emerald-800"
            >
              Try again
            </button>

            <Link
              to="/properties"
              className="rounded-xl border border-gray-200 px-5 py-3 font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              Browse properties
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      {/* Header */}
      <header className="border-b border-gray-100 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <Link
            to="/"
            className="text-xl font-extrabold tracking-tight text-emerald-800"
          >
            EstateMate <span className="text-emerald-500">AI</span>
          </Link>

          <Link
            to="/properties"
            className="rounded-lg px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-100"
          >
            ← All properties
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        {/* Breadcrumb */}
        <nav
          aria-label="Breadcrumb"
          className="mb-5 text-sm text-gray-500"
        >
          <Link to="/" className="hover:text-emerald-700">
            Home
          </Link>

          <span className="mx-2">/</span>

          <Link to="/properties" className="hover:text-emerald-700">
            Properties
          </Link>

          <span className="mx-2">/</span>

          <span className="font-medium text-gray-800">
            {title}
          </span>
        </nav>

        {/* Property title and price */}
        <section className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold capitalize text-emerald-800">
                {String(propertyStatus).replaceAll("_", " ")}
              </span>

              {propertyType && (
                <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold capitalize text-gray-700">
                  {String(propertyType).replaceAll("_", " ")}
                </span>
              )}
            </div>

            <h1 className="text-3xl font-extrabold tracking-tight text-gray-950 sm:text-4xl">
              {title}
            </h1>

            {location && (
              <p className="mt-3 flex items-start gap-2 text-gray-600">
                <span aria-hidden="true">📍</span>
                <span>{location}</span>
              </p>
            )}
          </div>

          <div className="shrink-0">
            <p className="text-sm text-gray-500">Property price</p>
            <p className="mt-1 text-3xl font-extrabold text-emerald-800">
              {formatPrice(price)}
            </p>
          </div>
        </section>

        {/* Property image gallery */}
        <section aria-label="Property photos" className="mb-8">
          <div className="grid gap-3 overflow-hidden rounded-2xl md:grid-cols-4">
            {/* Main image */}
            <button
              type="button"
              onClick={() => setShowGallery(true)}
              className="group relative min-h-64 overflow-hidden bg-gray-200 text-left md:col-span-2 md:row-span-2 md:min-h-[460px]"
              aria-label="Open property photo gallery"
            >
              <img
                src={images[activeImage] || FALLBACK_IMAGE}
                alt={`${title} main view`}
                className="h-full min-h-64 w-full object-cover transition duration-500 group-hover:scale-105 md:absolute md:inset-0"
                onError={(event) => {
                  event.currentTarget.onerror = null;
                  event.currentTarget.src = FALLBACK_IMAGE;
                }}
              />

              <span className="absolute bottom-4 left-4 rounded-lg bg-black/65 px-3 py-2 text-sm font-semibold text-white">
                <span aria-hidden="true">▦</span>{" "}
                View all photos ({images.length})
              </span>
            </button>

            {/* Thumbnail images */}
            {[1, 2, 3].map((offset) => {
              const imageIndex = offset % images.length;

              return (
                <button
                  key={`${offset}-${images[imageIndex]}`}
                  type="button"
                  onClick={() => {
                    setActiveImage(imageIndex);
                    setShowGallery(true);
                  }}
                  className="group relative hidden h-56 overflow-hidden bg-gray-200 md:block"
                  aria-label={`View property photo ${imageIndex + 1}`}
                >
                  <img
                    src={images[imageIndex] || FALLBACK_IMAGE}
                    alt={`${title} photo ${imageIndex + 1}`}
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    onError={(event) => {
                      event.currentTarget.onerror = null;
                      event.currentTarget.src = FALLBACK_IMAGE;
                    }}
                  />

                  {offset === 3 && images.length > 1 && (
                    <span className="absolute inset-0 flex items-center justify-center bg-black/40 font-semibold text-white transition group-hover:bg-black/50">
                      View gallery
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Mobile thumbnail strip */}
          {images.length > 1 && (
            <div className="mt-3 flex gap-3 overflow-x-auto pb-2 md:hidden">
              {images.map((image, index) => (
                <button
                  key={`${image}-${index}`}
                  type="button"
                  onClick={() => {
                    setActiveImage(index);
                    setShowGallery(true);
                  }}
                  aria-label={`Open photo ${index + 1}`}
                  className={`h-20 w-28 shrink-0 overflow-hidden rounded-xl border-2 ${
                    activeImage === index
                      ? "border-emerald-600"
                      : "border-transparent"
                  }`}
                >
                  <img
                    src={image}
                    alt={`${title} thumbnail ${index + 1}`}
                    className="h-full w-full object-cover"
                    onError={(event) => {
                      event.currentTarget.onerror = null;
                      event.currentTarget.src = FALLBACK_IMAGE;
                    }}
                  />
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Property content and enquiry form */}
        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-8">
            {/* Overview */}
            <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-7">
              <h2 className="text-xl font-bold text-gray-950">
                Property overview
              </h2>

              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <InfoItem label="Configuration" value={bedrooms} />
                <InfoItem label="Bathrooms" value={bathrooms} />
                <InfoItem label="Area" value={formattedArea} />
                <InfoItem label="Property type" value={propertyType} />
              </div>

              <div className="mt-7">
                <h3 className="text-lg font-bold text-gray-900">
                  About this property
                </h3>

                <p className="mt-3 whitespace-pre-line leading-7 text-gray-600">
                  {description}
                </p>
              </div>
            </section>

            {/* Amenities */}
            {amenities.length > 0 && (
              <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-7">
                <h2 className="text-xl font-bold text-gray-950">
                  Amenities and features
                </h2>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {amenities.map((amenity, index) => (
                    <div
                      key={`${amenity}-${index}`}
                      className="flex items-center gap-3 rounded-xl bg-gray-50 p-3"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800">
                        ✓
                      </span>

                      <span className="text-sm font-medium text-gray-700">
                        {amenity}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Location */}
            {location && (
              <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-7">
                <h2 className="text-xl font-bold text-gray-950">
                  Location
                </h2>

                <p className="mt-3 text-gray-600">{location}</p>

                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-flex rounded-xl border border-emerald-200 px-4 py-3 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-50"
                >
                  View on Google Maps ↗
                </a>
              </section>
            )}
          </div>

          {/* Enquiry form */}
          <aside className="lg:sticky lg:top-6">
            <section
              id="property-enquiry"
              className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6"
            >
              <div className="mb-5">
                <p className="text-sm font-semibold text-emerald-700">
                  INTERESTED IN THIS PROPERTY?
                </p>

                <h2 className="mt-2 text-2xl font-extrabold text-gray-950">
                  Request a callback
                </h2>

                <p className="mt-2 text-sm leading-6 text-gray-500">
                  Share your details and our property team can get in touch
                  with you.
                </p>
              </div>

              {enquirySuccess && (
                <div
                  role="status"
                  className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"
                >
                  {enquirySuccess}
                </div>
              )}

              {enquiryError && (
                <div
                  role="alert"
                  className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
                >
                  {enquiryError}
                </div>
              )}

              <form onSubmit={submitEnquiry} className="space-y-4">
                <div>
                  <label
                    htmlFor="enquiry-name"
                    className="mb-1.5 block text-sm font-semibold text-gray-700"
                  >
                    Full name
                  </label>

                  <input
                    id="enquiry-name"
                    name="name"
                    type="text"
                    autoComplete="name"
                    value={enquiry.name}
                    onChange={updateEnquiry}
                    placeholder="Enter your name"
                    required
                    maxLength={100}
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                  />
                </div>

                <div>
                  <label
                    htmlFor="enquiry-email"
                    className="mb-1.5 block text-sm font-semibold text-gray-700"
                  >
                    Email address
                  </label>

                  <input
                    id="enquiry-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={enquiry.email}
                    onChange={updateEnquiry}
                    placeholder="you@example.com"
                    required
                    maxLength={254}
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                  />
                </div>

                <div>
                  <label
                    htmlFor="enquiry-phone"
                    className="mb-1.5 block text-sm font-semibold text-gray-700"
                  >
                    Phone number
                  </label>

                  <input
                    id="enquiry-phone"
                    name="phone"
                    type="tel"
                    autoComplete="tel"
                    value={enquiry.phone}
                    onChange={updateEnquiry}
                    placeholder="Enter your phone number"
                    required
                    maxLength={20}
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                  />
                </div>

                <div>
                  <label
                    htmlFor="enquiry-message"
                    className="mb-1.5 block text-sm font-semibold text-gray-700"
                  >
                    Message
                  </label>

                  <textarea
                    id="enquiry-message"
                    name="message"
                    value={enquiry.message}
                    onChange={updateEnquiry}
                    placeholder="I'm interested in this property..."
                    rows={4}
                    maxLength={2000}
                    className="w-full resize-y rounded-xl border border-gray-200 px-4 py-3 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-xl bg-emerald-700 px-5 py-3.5 font-bold text-white shadow-sm transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? "Submitting..." : "Submit enquiry"}
                </button>

                <p className="text-center text-xs leading-5 text-gray-500">
                  By submitting, you agree to be contacted regarding this
                  property.
                </p>
              </form>
            </section>
          </aside>
        </div>

        <div className="mt-8">
          <Link
            to="/properties"
            className="inline-flex items-center gap-2 font-semibold text-emerald-800 hover:text-emerald-950"
          >
            ← Explore more properties
          </Link>
        </div>
      </div>

      {/* Fullscreen gallery */}
      {showGallery && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Property photo gallery"
          onClick={() => setShowGallery(false)}
        >
          <button
            type="button"
            onClick={() => setShowGallery(false)}
            aria-label="Close gallery"
            className="absolute right-5 top-5 z-10 rounded-full bg-white/10 px-4 py-2 text-2xl text-white hover:bg-white/20"
          >
            ×
          </button>

          <button
            type="button"
            aria-label="Previous photo"
            onClick={(event) => {
              event.stopPropagation();

              setActiveImage(
                (activeImage - 1 + images.length) % images.length
              );
            }}
            className="absolute left-3 top-1/2 z-10 rounded-full bg-white/10 px-4 py-3 text-xl text-white hover:bg-white/20 sm:left-8"
          >
            ‹
          </button>

          <img
            src={images[activeImage] || FALLBACK_IMAGE}
            alt={`${title} photo ${activeImage + 1}`}
            onClick={(event) => event.stopPropagation()}
            onError={(event) => {
              event.currentTarget.onerror = null;
              event.currentTarget.src = FALLBACK_IMAGE;
            }}
            className="max-h-[82vh] max-w-full rounded-lg object-contain"
          />

          <button
            type="button"
            aria-label="Next photo"
            onClick={(event) => {
              event.stopPropagation();

              setActiveImage(
                (activeImage + 1) % images.length
              );
            }}
            className="absolute right-3 top-1/2 z-10 rounded-full bg-white/10 px-4 py-3 text-xl text-white hover:bg-white/20 sm:right-8"
          >
            ›
          </button>

          <p className="absolute bottom-5 text-sm text-white/80">
            {activeImage + 1} of {images.length}
          </p>
        </div>
      )}
    </main>
  );
}

export default PropertyDetails;