import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  searchProperties,
  getDevelopmentProperties,
  getPropertyRecommendations,
  getApiErrorMessage,
  BHK_OPTIONS,
} from "../services/api";

const INITIAL_FILTERS = {
  bhk: "",
  min_budget_inr: "",
  max_budget_inr: "",
  location: "",
  sort_by: "price_asc",
};

const PAGE_SIZE = 6;
const SHORTLIST_KEY = "estatemate_shortlisted_properties";
const IS_DEVELOPMENT_BUILD = import.meta.env.DEV;

const AMENITY_OPTIONS = [
  "Swimming Pool",
  "Gym",
  "Garden",
  "Parking",
  "Security",
  "Clubhouse",
];

/*
 * Sample property photos.
 * Backend-provided image URLs take priority over these defaults.
 */
const DEFAULT_PROPERTY_IMAGES = [
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?auto=format&fit=crop&w=1200&q=80",
];

const FALLBACK_IMAGE =
  "https://placehold.co/800x500/e8f0e9/47634d?text=Property+Image";

function formatPrice(price) {
  const value = Number(price);

  if (!Number.isFinite(value)) return "Price unavailable";

  if (value >= 10000000) {
    return `₹${(value / 10000000)
      .toFixed(2)
      .replace(/\.?0+$/, "")} Cr`;
  }

  if (value >= 100000) {
    return `₹${(value / 100000)
      .toFixed(2)
      .replace(/\.?0+$/, "")} lakh`;
  }

  return `₹${value.toLocaleString("en-IN")}`;
}

function formatFullPrice(price) {
  const value = Number(price);

  if (!Number.isFinite(value)) return "Price unavailable";

  return `₹${value.toLocaleString("en-IN")}`;
}

function formatArea(area) {
  if (area === null || area === undefined || area === "") {
    return "Not specified";
  }

  return `${Number(area).toLocaleString("en-IN")} sq. ft.`;
}

function getPropertyId(property) {
  return property.property_id || property.id || null;
}

function loadShortlist() {
  try {
    const saved = JSON.parse(
      localStorage.getItem(SHORTLIST_KEY) || "[]"
    );

    return Array.isArray(saved)
      ? saved.filter((id) => typeof id === "string")
      : [];
  } catch {
    return [];
  }
}

function getPropertyLocation(property) {
  return [
    property.location,
    property.state,
  ]
    .filter(Boolean)
    .join(", ") || "Location not specified";
}

function getStatusLabel(property, isDevelopmentMode) {
  if (isDevelopmentMode) {
    return property.verification_status || "pending";
  }

  return "Verified";
}

/*
 * Extract an image URL from common backend field names.
 *
 * Supported fields include:
 * image_url, image, photo_url, thumbnail_url, cover_image,
 * primary_image, property_image_url, main_image_url,
 * featured_image, images, photos, and image_urls.
 *
 * Array entries may be URL strings or objects containing
 * url, image_url, src, or photo_url.
 */
function getPropertyImage(property) {
  const candidates = [
    property.image_url,
    property.image,
    property.photo_url,
    property.thumbnail_url,
    property.cover_image,
    property.primary_image,
    property.property_image_url,
    property.main_image_url,
    property.featured_image,

    ...(Array.isArray(property.images)
      ? property.images.map((item) =>
          typeof item === "string"
            ? item
            : item?.url ||
              item?.image_url ||
              item?.src ||
              item?.photo_url
        )
      : []),

    ...(Array.isArray(property.photos)
      ? property.photos.map((item) =>
          typeof item === "string"
            ? item
            : item?.url ||
              item?.image_url ||
              item?.src ||
              item?.photo_url
        )
      : []),

    ...(Array.isArray(property.image_urls)
      ? property.image_urls
      : []),

    ...(Array.isArray(property.photo_urls)
      ? property.photo_urls
      : []),
  ];

  return (
    candidates.find(
      (candidate) =>
        typeof candidate === "string" &&
        candidate.trim().length > 0
    )?.trim() || ""
  );
}

/*
 * Property card image.
 *
 * Uses the actual API image if available.
 * If there is no image URL, uses a sample photo.
 * If the image fails to load, displays the fallback image.
 */
function PropertyCardImage({
  property,
  projectName,
  status,
  bhk,
  isDevelopmentMode,
  imageIndex = 0,
}) {
  const propertyImage = getPropertyImage(property);

  const [imageFailed, setImageFailed] = useState(false);

  const defaultImage =
    DEFAULT_PROPERTY_IMAGES[
      imageIndex % DEFAULT_PROPERTY_IMAGES.length
    ];

  const imageUrl = propertyImage || defaultImage;

  return (
    <div className="relative h-56 overflow-hidden bg-gradient-to-br from-emerald-100 via-teal-50 to-slate-100">
      {!imageFailed ? (
        <img
          src={imageUrl}
          alt={`${projectName} property`}
          loading="lazy"
          onError={(event) => {
            const currentImage = event.currentTarget;

            if (currentImage.src !== FALLBACK_IMAGE) {
              currentImage.onerror = null;
              currentImage.src = FALLBACK_IMAGE;
            }

            setImageFailed(true);
          }}
          className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
        />
      ) : (
        <div className="flex h-full flex-col items-center justify-center gap-2 text-emerald-900">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white bg-white/80 text-4xl shadow-sm">
            ⌂
          </div>

          <span className="text-xs font-semibold text-emerald-900/70">
            Property image unavailable
          </span>
        </div>
      )}

      <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-slate-950/40 to-transparent" />

      <span
        className={`absolute left-4 top-4 rounded-full px-3 py-1.5 text-xs font-bold ${
          isDevelopmentMode
            ? "bg-amber-100 text-amber-900"
            : "bg-emerald-100 text-emerald-900"
        }`}
      >
        {status}
      </span>

      <span className="absolute right-4 top-4 rounded-full bg-slate-900/85 px-3 py-1.5 text-xs font-bold text-white">
        {bhk || "Apartment"}
      </span>
    </div>
  );
}

export default function Properties() {
  const navigate = useNavigate();

  const [mode, setMode] = useState("public");
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [selectedAmenities, setSelectedAmenities] = useState([]);

  const [properties, setProperties] = useState([]);
  const [recommendations, setRecommendations] = useState(null);

  const [shortlistedIds, setShortlistedIds] = useState(loadShortlist);
  const [comparisonIds, setComparisonIds] = useState([]);

  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [recommendationLoading, setRecommendationLoading] =
    useState(false);

  const [error, setError] = useState("");
  const [recommendationError, setRecommendationError] = useState("");
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(
        SHORTLIST_KEY,
        JSON.stringify(shortlistedIds)
      );
    } catch {
      // Shortlisting still works for the current session.
    }
  }, [shortlistedIds]);

  const updateFilter = (event) => {
    const { name, value } = event.target;

    setFilters((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const toggleAmenity = (amenity) => {
    setSelectedAmenities((current) =>
      current.includes(amenity)
        ? current.filter((item) => item !== amenity)
        : [...current, amenity]
    );
  };

  const runSearch = useCallback(
    async (searchFilters, amenities, searchMode) => {
      setLoading(true);
      setError("");
      setHasSearched(true);
      setPage(1);

      try {
        const query = {
          bhk: searchFilters.bhk || undefined,
          min_budget_inr:
            searchFilters.min_budget_inr || undefined,
          max_budget_inr:
            searchFilters.max_budget_inr || undefined,
          location: searchFilters.location || undefined,
          sort_by: searchFilters.sort_by || "price_asc",
        };

        let results;

        if (searchMode === "development") {
          // Separate development endpoint. This can return
          // pending sample records without changing their status.
          results = await getDevelopmentProperties(query);
        } else {
          // Public search remains restricted by backend verification
          // and availability rules.
          results = await searchProperties({
            ...query,
            amenities,
            availability: "available",
            limit: 100,
          });
        }

        if (!Array.isArray(results)) {
          throw new Error("The API returned an unexpected response.");
        }

        setProperties(results);
        setComparisonIds([]);
      } catch (err) {
        setProperties([]);
        setError(getApiErrorMessage(err));
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    runSearch(INITIAL_FILTERS, [], "public");
  }, [runSearch]);

  const handleSearch = async (event) => {
    event.preventDefault();
    setRecommendations(null);
    setRecommendationError("");

    await runSearch(filters, selectedAmenities, mode);
  };

  const handleReset = () => {
    setFilters(INITIAL_FILTERS);
    setSelectedAmenities([]);
    setRecommendations(null);
    setRecommendationError("");
    setComparisonIds([]);
    setError("");

    runSearch(INITIAL_FILTERS, [], mode);
  };

  const handleModeChange = (nextMode) => {
    if (nextMode === "development" && !IS_DEVELOPMENT_BUILD) {
      return;
    }

    setMode(nextMode);
    setRecommendations(null);
    setRecommendationError("");
    setComparisonIds([]);

    runSearch(filters, selectedAmenities, nextMode);
  };

  const handleRecommendations = async () => {
    if (mode !== "public") {
      setRecommendationError(
        "AI recommendations currently use the public verified inventory. Switch to Public Listings to request recommendations."
      );
      return;
    }

    if (!filters.bhk) {
      setRecommendationError(
        "Choose an apartment configuration before requesting AI recommendations."
      );
      return;
    }

    if (!filters.max_budget_inr) {
      setRecommendationError(
        "Enter a maximum budget before requesting AI recommendations."
      );
      return;
    }

    setRecommendationLoading(true);
    setRecommendationError("");
    setRecommendations(null);

    try {
      const result = await getPropertyRecommendations({
        bhk: filters.bhk,
        budget_inr: Number(filters.max_budget_inr),
        location: filters.location,
        amenities: selectedAmenities,
      });

      setRecommendations(result);

      // Always reload the actual public inventory after the AI
      // response; never treat AI output as a verified listing.
      await runSearch(filters, selectedAmenities, "public");
    } catch (err) {
      setRecommendationError(getApiErrorMessage(err));
    } finally {
      setRecommendationLoading(false);
    }
  };

  const toggleShortlist = (property) => {
    const id = getPropertyId(property);
    if (!id) return;

    setShortlistedIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id]
    );
  };

  const toggleComparison = (property) => {
    const id = getPropertyId(property);
    if (!id) return;

    setComparisonIds((current) => {
      if (current.includes(id)) {
        return current.filter((item) => item !== id);
      }

      if (current.length >= 3) {
        setError("You can compare up to three properties at a time.");
        return current;
      }

      setError("");
      return [...current, id];
    });
  };

  const handleEnquiry = (property) => {
    const propertyId = getPropertyId(property);

    if (!propertyId) {
      setError("Unable to open this property because its ID is missing.");
      return;
    }

    // Open the property details page instead of an empty mailto link.
    navigate(`/properties/${encodeURIComponent(propertyId)}`);
  };

  const shortlistedProperties = useMemo(
    () =>
      properties.filter((property) =>
        shortlistedIds.includes(getPropertyId(property))
      ),
    [properties, shortlistedIds]
  );

  const comparisonProperties = useMemo(
    () =>
      comparisonIds
        .map((id) =>
          properties.find((property) => getPropertyId(property) === id)
        )
        .filter(Boolean),
    [properties, comparisonIds]
  );

  const totalPages = Math.max(
    1,
    Math.ceil(properties.length / PAGE_SIZE)
  );

  const displayedProperties = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return properties.slice(start, start + PAGE_SIZE);
  }, [properties, page]);

  const changePage = (nextPage) => {
    setPage(Math.min(Math.max(nextPage, 1), totalPages));

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-800">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-800">
        <div className="mx-auto max-w-7xl px-5 py-14 sm:px-8 sm:py-20">
          <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-emerald-100">
            EstateMate AI · Property Discovery
          </span>

          <h1 className="mt-7 max-w-3xl text-4xl font-bold leading-tight text-white sm:text-5xl">
            Find a place that feels like{" "}
            <span className="text-emerald-300">home.</span>
          </h1>

          <p className="mt-5 max-w-2xl text-base leading-7 text-emerald-50/80 sm:text-lg">
            Explore properties, compare apartment configurations, and
            discover listings that fit your budget.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 pb-14 sm:px-6 lg:px-10">
        {/* Listing mode selector */}
        <section className="relative -mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-lg sm:p-6">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">
                Listing source
              </p>

              <h2 className="mt-2 text-xl font-bold text-slate-900">
                Choose property inventory
              </h2>

              <p className="mt-1 text-sm leading-6 text-slate-500">
                Public listings show verified inventory. Development samples
                are fictional records for local testing.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                aria-pressed={mode === "public"}
                onClick={() => handleModeChange("public")}
                className={`rounded-xl border px-4 py-3 text-sm font-bold ${
                  mode === "public"
                    ? "border-emerald-800 bg-emerald-800 text-white"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                Public Listings
              </button>

              {IS_DEVELOPMENT_BUILD && (
                <button
                  type="button"
                  aria-pressed={mode === "development"}
                  onClick={() => handleModeChange("development")}
                  className={`rounded-xl border px-4 py-3 text-sm font-bold ${
                    mode === "development"
                      ? "border-amber-600 bg-amber-500 text-white"
                      : "border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100"
                  }`}
                >
                  Development Samples
                </button>
              )}
            </div>
          </div>

          {mode === "development" && (
            <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="font-bold text-amber-900">
                Development preview — fictional listings
              </p>

              <p className="mt-1 text-sm leading-6 text-amber-800">
                These records are for testing only. Their pending verification
                status is preserved. Do not use them as confirmed real estate
                offers or make them publicly available.
              </p>
            </div>
          )}
        </section>

        {/* Search filters */}
        <section className="mt-7 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">
                Property search
              </p>

              <h2 className="mt-2 text-2xl font-bold text-slate-900">
                Find your ideal property
              </h2>
            </div>

            <button
              type="button"
              onClick={handleReset}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              Reset filters
            </button>
          </div>

          <form onSubmit={handleSearch} className="mt-6">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold">
                  Apartment type
                </span>

                <select
                  name="bhk"
                  value={filters.bhk}
                  onChange={updateFilter}
                  className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm focus:border-emerald-600 focus:outline-none"
                >
                  <option value="">Any configuration</option>

                  {BHK_OPTIONS.map((bhk) => (
                    <option key={bhk} value={bhk}>
                      {bhk}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold">
                  Minimum budget (₹)
                </span>

                <input
                  type="number"
                  name="min_budget_inr"
                  min="1"
                  max="1000000000"
                  step="100000"
                  value={filters.min_budget_inr}
                  onChange={updateFilter}
                  placeholder="e.g. 5000000"
                  className="h-12 w-full rounded-xl border border-slate-200 px-3 text-sm focus:border-emerald-600 focus:outline-none"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold">
                  Maximum budget (₹)
                </span>

                <input
                  type="number"
                  name="max_budget_inr"
                  min="1"
                  max="1000000000"
                  step="100000"
                  value={filters.max_budget_inr}
                  onChange={updateFilter}
                  placeholder="e.g. 7000000"
                  className="h-12 w-full rounded-xl border border-slate-200 px-3 text-sm focus:border-emerald-600 focus:outline-none"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold">
                  City or location
                </span>

                <input
                  type="text"
                  name="location"
                  maxLength={100}
                  value={filters.location}
                  onChange={updateFilter}
                  placeholder="e.g. Pune"
                  className="h-12 w-full rounded-xl border border-slate-200 px-3 text-sm focus:border-emerald-600 focus:outline-none"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold">
                  Sort by price
                </span>

                <select
                  name="sort_by"
                  value={filters.sort_by}
                  onChange={updateFilter}
                  className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm focus:border-emerald-600 focus:outline-none"
                >
                  <option value="price_asc">Low to high</option>
                  <option value="price_desc">High to low</option>
                </select>
              </label>
            </div>

            {mode === "public" && (
              <fieldset className="mt-6">
                <legend className="text-sm font-semibold">
                  Preferred amenities
                </legend>

                <div className="mt-3 flex flex-wrap gap-3">
                  {AMENITY_OPTIONS.map((amenity) => (
                    <label
                      key={amenity}
                      className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-2 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={selectedAmenities.includes(amenity)}
                        onChange={() => toggleAmenity(amenity)}
                        className="accent-emerald-800"
                      />

                      {amenity}
                    </label>
                  ))}
                </div>
              </fieldset>
            )}

            <div className="mt-7 flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={loading}
                className="rounded-xl bg-emerald-800 px-6 py-3 text-sm font-bold text-white hover:bg-emerald-900 disabled:opacity-60"
              >
                {loading ? "Searching..." : "Search properties"}
              </button>

              {mode === "public" && (
                <button
                  type="button"
                  onClick={handleRecommendations}
                  disabled={recommendationLoading}
                  className="rounded-xl border border-emerald-200 bg-emerald-50 px-6 py-3 text-sm font-bold text-emerald-900 hover:bg-emerald-100 disabled:opacity-60"
                >
                  {recommendationLoading
                    ? "Finding matches..."
                    : "✦ Get AI recommendations"}
                </button>
              )}
            </div>
          </form>
        </section>

        {/* Errors */}
        {error && (
          <div
            role="alert"
            className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4"
          >
            <p className="font-bold text-red-800">
              Unable to load properties
            </p>

            <p className="mt-1 text-sm text-red-700">{error}</p>
          </div>
        )}

        {recommendationError && (
          <div
            role="alert"
            className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
          >
            {recommendationError}
          </div>
        )}

        {recommendations && mode === "public" && (
          <section className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
            <h2 className="font-bold text-emerald-950">
              AI recommendation result
            </h2>

            <p className="mt-2 text-sm leading-6 text-emerald-900">
              {recommendations.message ||
                "Your recommendation request was processed. Review the verified property listings below."}
            </p>

            <p className="mt-2 text-xs leading-5 text-emerald-800">
              AI output does not independently verify a property. The public
              listing results are fetched from the verified inventory API.
            </p>
          </section>
        )}

        {/* Results heading */}
        <section className="mt-10">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">
                {mode === "development"
                  ? "Development inventory"
                  : "Verified inventory"}
              </p>

              <h2 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">
                {mode === "development"
                  ? "Sample properties"
                  : "Discover properties"}
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                {mode === "development"
                  ? "Fictional test records. Pending listings are not verified offers."
                  : "Only properties returned by the public verified inventory endpoint are shown."}
              </p>
            </div>

            <span className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600">
              {loading
                ? "Searching..."
                : `${properties.length} ${
                    properties.length === 1 ? "property" : "properties"
                  } found`}
            </span>
          </div>

          {loading || recommendationLoading ? (
            <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-10 text-center">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-100 border-t-emerald-800" />

              <h3 className="mt-5 font-bold">Finding properties</h3>

              <p className="mt-2 text-sm text-slate-500">
                Please wait while the inventory is loaded.
              </p>
            </div>
          ) : properties.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
              <div className="text-4xl text-emerald-800">⌂</div>

              <h3 className="mt-5 text-xl font-bold text-slate-900">
                {hasSearched
                  ? "No matching properties found"
                  : "Explore properties"}
              </h3>

              <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-slate-500">
                Try another configuration, location, or budget. Public mode
                only displays verified, available inventory; development mode
                queries the separate development endpoint.
              </p>

              <button
                type="button"
                onClick={handleReset}
                className="mt-6 rounded-xl bg-emerald-800 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-900"
              >
                Reset search
              </button>
            </div>
          ) : (
            <>
              {/* Property cards */}
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                {displayedProperties.map((property, index) => {
                  const id = getPropertyId(property);

                  const projectName =
                    property.project_name || "Residential property";

                  const isShortlisted = shortlistedIds.includes(id);
                  const isComparing = comparisonIds.includes(id);

                  const status = getStatusLabel(
                    property,
                    mode === "development"
                  );

                  return (
                    <article
                      key={id || `${projectName}-${index}`}
                      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                    >
                      <PropertyCardImage
                        property={property}
                        projectName={projectName}
                        status={status}
                        bhk={property.bhk}
                        isDevelopmentMode={mode === "development"}
                        imageIndex={index}
                      />

                      <div className="p-5">
                        <h3 className="text-lg font-bold text-slate-900">
                          {projectName}
                        </h3>

                        <p className="mt-2 text-sm text-slate-500">
                          {getPropertyLocation(property)}
                        </p>

                        <p className="mt-5 text-xs font-semibold uppercase tracking-wider text-slate-400">
                          Listed price
                        </p>

                        <p className="mt-1 text-3xl font-extrabold text-emerald-800">
                          {formatPrice(property.price_inr)}
                        </p>

                        <div className="my-5 grid grid-cols-2 gap-4 border-y border-slate-100 py-4">
                          <div>
                            <p className="text-xs text-slate-400">Area</p>

                            <p className="mt-1 text-sm font-semibold">
                              {formatArea(property.area_sqft)}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs text-slate-400">Unit</p>

                            <p className="mt-1 text-sm font-semibold">
                              {property.unit_number || "Not specified"}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs text-slate-400">Floor</p>

                            <p className="mt-1 text-sm font-semibold">
                              {property.floor_number ?? "Not specified"}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs text-slate-400">
                              Availability
                            </p>

                            <p className="mt-1 text-sm font-semibold capitalize">
                              {property.availability || "Not specified"}
                            </p>
                          </div>
                        </div>

                        {Array.isArray(property.amenities) &&
                          property.amenities.length > 0 && (
                            <div className="mb-5">
                              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                                Amenities
                              </p>

                              <div className="flex flex-wrap gap-2">
                                {property.amenities
                                  .slice(0, 5)
                                  .map((amenity) => (
                                    <span
                                      key={amenity}
                                      className="rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-medium text-emerald-800"
                                    >
                                      {amenity}
                                    </span>
                                  ))}
                              </div>
                            </div>
                          )}

                        {mode === "development" && (
                          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">
                            <p>
                              <strong>Project verification:</strong>{" "}
                              {property.project_verification_status ||
                                "pending"}
                            </p>

                            <p>
                              <strong>Property verification:</strong>{" "}
                              {property.verification_status || "pending"}
                            </p>

                            <p className="mt-1">
                              Fictional development sample — not a verified
                              offer.
                            </p>
                          </div>
                        )}

                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => toggleShortlist(property)}
                            className={`rounded-xl border px-3 py-2.5 text-sm font-bold ${
                              isShortlisted
                                ? "border-pink-200 bg-pink-50 text-pink-800"
                                : "border-slate-200 text-slate-600 hover:bg-slate-50"
                            }`}
                          >
                            {isShortlisted ? "♥ Saved" : "♡ Shortlist"}
                          </button>

                          <button
                            type="button"
                            onClick={() => toggleComparison(property)}
                            disabled={
                              !isComparing && comparisonIds.length >= 3
                            }
                            className={`rounded-xl border px-3 py-2.5 text-sm font-bold disabled:opacity-40 ${
                              isComparing
                                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                                : "border-slate-200 text-slate-600 hover:bg-slate-50"
                            }`}
                          >
                            {isComparing ? "✓ Comparing" : "Compare"}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleEnquiry(property)}
                            className="ml-auto rounded-xl bg-emerald-800 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-900"
                          >
                            Enquire
                          </button>
                        </div>

                        {property.rera_number && (
                          <p className="mt-4 break-words text-xs text-slate-500">
                            RERA: {property.rera_number}
                          </p>
                        )}

                        {property.address && (
                          <details className="mt-4 border-t border-slate-100 pt-3">
                            <summary className="cursor-pointer text-sm font-semibold text-emerald-800">
                              View address
                            </summary>

                            <p className="mt-2 break-words text-sm leading-6 text-slate-600">
                              {property.address}
                            </p>
                          </details>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>

              {/* Comparison table */}
              {comparisonProperties.length > 0 && (
                <section className="mt-8 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
                  <div className="flex flex-wrap items-center justify-between gap-3 p-5">
                    <h2 className="text-xl font-bold">
                      Compare properties
                    </h2>

                    <button
                      type="button"
                      onClick={() => setComparisonIds([])}
                      className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold"
                    >
                      Clear comparison
                    </button>
                  </div>

                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="p-4">Feature</th>

                        {comparisonProperties.map((property) => (
                          <th
                            key={getPropertyId(property)}
                            className="min-w-48 p-4"
                          >
                            {property.project_name || "Property"}
                          </th>
                        ))}
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {[
                        ["Price", (p) => formatPrice(p.price_inr)],
                        ["BHK", (p) => p.bhk || "Not specified"],
                        ["Location", getPropertyLocation],
                        ["Area", (p) => formatArea(p.area_sqft)],
                        ["Unit", (p) => p.unit_number || "Not specified"],
                        [
                          "Verification",
                          (p) =>
                            getStatusLabel(
                              p,
                              mode === "development"
                            ),
                        ],
                      ].map(([label, value]) => (
                        <tr key={label}>
                          <th className="bg-slate-50 p-4 font-medium">
                            {label}
                          </th>

                          {comparisonProperties.map((property) => (
                            <td
                              key={getPropertyId(property)}
                              className="p-4"
                            >
                              {value(property)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </section>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <nav
                  aria-label="Property results pages"
                  className="mt-8 flex flex-wrap items-center justify-center gap-2"
                >
                  <button
                    type="button"
                    onClick={() => changePage(page - 1)}
                    disabled={page === 1}
                    className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold disabled:opacity-40"
                  >
                    Previous
                  </button>

                  {Array.from(
                    { length: totalPages },
                    (_, index) => index + 1
                  ).map((number) => (
                    <button
                      type="button"
                      key={number}
                      onClick={() => changePage(number)}
                      aria-current={page === number ? "page" : undefined}
                      className={`h-10 min-w-10 rounded-lg border px-3 text-sm font-semibold ${
                        page === number
                          ? "border-emerald-800 bg-emerald-800 text-white"
                          : "border-slate-200 bg-white text-slate-600"
                      }`}
                    >
                      {number}
                    </button>
                  ))}

                  <button
                    type="button"
                    onClick={() => changePage(page + 1)}
                    disabled={page === totalPages}
                    className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold disabled:opacity-40"
                  >
                    Next
                  </button>
                </nav>
              )}
            </>
          )}
        </section>

        {/* Shortlist summary */}
        {shortlistedProperties.length > 0 && (
          <section className="mt-8 rounded-2xl border border-pink-200 bg-white p-5">
            <h2 className="text-lg font-bold">
              Your shortlist ({shortlistedProperties.length})
            </h2>

            <div className="mt-3 flex flex-wrap gap-2">
              {shortlistedProperties.map((property) => (
                <span
                  key={getPropertyId(property)}
                  className="rounded-full bg-pink-50 px-3 py-2 text-sm font-medium text-pink-800"
                >
                  {property.project_name || "Property"} ·{" "}
                  {formatPrice(property.price_inr)}
                </span>
              ))}
            </div>

            <p className="mt-3 text-xs text-slate-500">
              The shortlist shows properties currently loaded in this search.
            </p>
          </section>
        )}
      </div>
    </main>
  );
}