
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Home,
  Search,
  MapPin,
  BedDouble,
  Bath,
  Maximize2,
  ArrowRight,
  ArrowUpRight,
  Building2,
  ShieldCheck,
  Sparkles,
  Heart,
  Menu,
  X,
  Phone,
  CheckCircle2,
  LoaderCircle,
  AlertCircle,
  KeyRound,
  MessageCircle,
  Bot,
} from "lucide-react";
import AIAssistant from "./Assistant";

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000"
).replace(/\/+$/, "");

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=85";

const propertyImages = [
  "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1000&q=85",
  "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1000&q=85",
  "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1000&q=85",
];

function formatPrice(value) {
  if (value === null || value === undefined || value === "") {
    return "Price on request";
  }

  if (
    typeof value === "string" &&
    /₹|lakh|crore|cr\b|lac/i.test(value)
  ) {
    return value;
  }

  const amount = Number(value);

  if (!Number.isFinite(amount)) return String(value);

  if (amount >= 10000000) {
    return `₹${(amount / 10000000)
      .toFixed(2)
      .replace(/\.?0+$/, "")} Cr`;
  }

  if (amount >= 100000) {
    return `₹${(amount / 100000)
      .toFixed(2)
      .replace(/\.?0+$/, "")} Lac`;
  }

  return `₹${amount.toLocaleString("en-IN")}`;
}

function getPropertyId(property) {
  return property.id ?? property.property_id ?? property._id;
}

function getPropertyImage(property, index = 0) {
  const images = [
    property.image_url,
    property.image,
    property.thumbnail,
    property.cover_image,
    property.photo,
    ...(Array.isArray(property.images)
      ? property.images.map((image) =>
          typeof image === "string" ? image : image?.url
        )
      : []),
  ];

  return (
    images.find(
      (image) =>
        typeof image === "string" && image.trim().length > 0
    ) ||
    propertyImages[index % propertyImages.length] ||
    FALLBACK_IMAGE
  );
}

function normalizeProperties(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.properties)) return payload.properties;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.results)) return payload.results;

  return [];
}

function PropertyCard({
  property,
  index,
  onFavorite,
  isFavorite,
}) {
  const id = getPropertyId(property);

  const title =
    property.title ||
    property.name ||
    property.property_name ||
    "Beautiful Property";

  const location =
    property.location ||
    property.address ||
    property.city ||
    property.locality ||
    "Location available on request";

  const price = formatPrice(
    property.price ??
      property.listing_price ??
      property.expected_price
  );

  const image = getPropertyImage(property, index);

  const bedrooms =
    property.bedrooms ??
    property.bhk ??
    property.bedroom_count;

  const bathrooms =
    property.bathrooms ?? property.bathroom_count;

  const area =
    property.area ??
    property.area_sqft ??
    property.square_feet;

  return (
    <article className="group overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-emerald-950/10">
      <div className="relative h-56 overflow-hidden bg-slate-100">
        <img
          src={image}
          alt={title}
          loading="lazy"
          onError={(event) => {
            event.currentTarget.onerror = null;
            event.currentTarget.src = FALLBACK_IMAGE;
          }}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
        />

        <div className="absolute left-4 top-4 flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-xs font-semibold text-emerald-800 shadow-sm">
          <CheckCircle2 size={14} />
          Property listing
        </div>

        <button
          type="button"
          onClick={() => onFavorite(id)}
          aria-label={
            isFavorite
              ? "Remove from favorites"
              : "Add to favorites"
          }
          aria-pressed={isFavorite}
          className={`absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full shadow-sm backdrop-blur transition ${
            isFavorite
              ? "bg-rose-500 text-white"
              : "bg-white/95 text-slate-700 hover:bg-rose-50 hover:text-rose-500"
          }`}
        >
          <Heart
            size={18}
            fill={isFavorite ? "currentColor" : "none"}
          />
        </button>

        {property.property_type && (
          <span className="absolute bottom-4 left-4 rounded-lg bg-slate-950/70 px-3 py-1.5 text-xs font-medium text-white backdrop-blur">
            {property.property_type}
          </span>
        )}
      </div>

      <div className="p-5">
        <p className="text-xl font-extrabold tracking-tight text-emerald-800">
          {price}
        </p>

        <h3 className="mt-2 line-clamp-1 text-base font-bold text-slate-900">
          {title}
        </h3>

        <p className="mt-2 flex items-center gap-1.5 text-sm text-slate-500">
          <MapPin
            size={15}
            className="shrink-0 text-emerald-600"
          />
          <span className="truncate">{location}</span>
        </p>

        <div className="my-5 flex flex-wrap items-center gap-x-4 gap-y-2 border-y border-slate-100 py-4 text-xs text-slate-500">
          {bedrooms !== undefined && bedrooms !== null && (
            <span className="flex items-center gap-1.5">
              <BedDouble
                size={16}
                className="text-emerald-700"
              />
              {bedrooms} Beds
            </span>
          )}

          {bathrooms !== undefined && bathrooms !== null && (
            <span className="flex items-center gap-1.5">
              <Bath
                size={16}
                className="text-emerald-700"
              />
              {bathrooms} Baths
            </span>
          )}

          {area !== undefined && area !== null && (
            <span className="flex items-center gap-1.5">
              <Maximize2
                size={15}
                className="text-emerald-700"
              />
              {area} sq. ft.
            </span>
          )}

          {bedrooms == null &&
            bathrooms == null &&
            area == null && (
              <span>
                Contact us for property specifications
              </span>
            )}
        </div>

        {id !== undefined && id !== null && (
          <Link
            to={`/properties/${encodeURIComponent(id)}`}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
          >
            View property details
            <ArrowUpRight size={17} />
          </Link>
        )}
      </div>
    </article>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
}) {
  return (
    <div className="max-w-2xl">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">
        {eyebrow}
      </p>

      <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
        {title}
      </h2>

      <p className="mt-3 text-sm leading-7 text-slate-600 sm:text-base">
        {description}
      </p>
    </div>
  );
}

export default function HomePage() {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [propertyType, setPropertyType] = useState("All");
  const [maxBudget, setMaxBudget] = useState("Any");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [favorites, setFavorites] = useState([]);
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchProperties() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(
          `${API_BASE_URL}/api/properties`,
          {
            method: "GET",
            headers: {
              Accept: "application/json",
            },
            signal: controller.signal,
          }
        );

        if (!response.ok) {
          throw new Error(
            `Unable to load properties (HTTP ${response.status}).`
          );
        }

        const payload = await response.json();
        setProperties(normalizeProperties(payload));
      } catch (err) {
        if (err.name === "AbortError") return;

        console.error(
          "Failed to load public properties:",
          err
        );

        setError(
          "We couldn't load property listings right now. Please try again."
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    fetchProperties();

    return () => controller.abort();
  }, []);

  const propertyTypes = useMemo(() => {
    const types = properties
      .map((property) => property.property_type)
      .filter(
        (type) =>
          typeof type === "string" && type.trim()
      );

    return ["All", ...new Set(types)];
  }, [properties]);

  const filteredProperties = useMemo(() => {
    return properties.filter((property) => {
      const searchableText = [
        property.title,
        property.name,
        property.property_name,
        property.location,
        property.address,
        property.city,
        property.locality,
        property.property_type,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch = searchableText.includes(
        searchTerm.trim().toLowerCase()
      );

      const matchesType =
        propertyType === "All" ||
        property.property_type === propertyType;

      const rawPrice =
        property.price ??
        property.listing_price ??
        property.expected_price;

      const numericPrice = Number(rawPrice);

      const matchesBudget =
        maxBudget === "Any" ||
        (Number.isFinite(numericPrice) &&
          numericPrice <= Number(maxBudget));

      return matchesSearch && matchesType && matchesBudget;
    });
  }, [properties, searchTerm, propertyType, maxBudget]);

  const toggleFavorite = (id) => {
    if (id === null || id === undefined) return;

    setFavorites((previous) =>
      previous.includes(id)
        ? previous.filter((item) => item !== id)
        : [...previous, id]
    );
  };

  const scrollToListings = () => {
    document.getElementById("properties")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-white text-slate-800">
      {/* Navigation */}
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur-xl">
        <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link
            to="/"
            className="flex items-center gap-3"
            aria-label="EstateMate AI home"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-green-800 text-white shadow-lg shadow-emerald-900/15">
              <Home size={23} />
            </span>

            <span>
              <span className="block text-lg font-extrabold tracking-tight text-slate-900">
                EstateMate{" "}
                <span className="text-emerald-700">AI</span>
              </span>

              <span className="block text-[11px] text-slate-500">
                Find your next home
              </span>
            </span>
          </Link>

          <nav className="hidden items-center gap-7 md:flex">
            <a
              href="#home"
              className="text-sm font-semibold text-emerald-800"
            >
              Home
            </a>

            <a
              href="#properties"
              className="text-sm font-medium text-slate-600 transition hover:text-emerald-700"
            >
              Properties
            </a>

            <a
              href="#why-us"
              className="text-sm font-medium text-slate-600 transition hover:text-emerald-700"
            >
              Why EstateMate
            </a>

            <a
              href="#contact"
              className="text-sm font-medium text-slate-600 transition hover:text-emerald-700"
            >
              Contact
            </a>
          </nav>

          <div className="hidden items-center gap-3 sm:flex">
            <Link
              to="/login"
              className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-emerald-50 hover:text-emerald-800"
            >
              Agent login
            </Link>

            <a
              href="#properties"
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800"
            >
              Explore homes
              <ArrowRight size={16} />
            </a>
          </div>

          <button
            type="button"
            onClick={() =>
              setMobileMenuOpen((open) => !open)
            }
            aria-label={
              mobileMenuOpen ? "Close menu" : "Open menu"
            }
            aria-expanded={mobileMenuOpen}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-700 sm:hidden"
          >
            {mobileMenuOpen ? (
              <X size={21} />
            ) : (
              <Menu size={21} />
            )}
          </button>
        </div>

        {mobileMenuOpen && (
          <nav className="space-y-1 border-t border-slate-100 bg-white p-4 sm:hidden">
            <a
              href="#home"
              onClick={() => setMobileMenuOpen(false)}
              className="block rounded-lg px-3 py-3 text-sm font-medium hover:bg-emerald-50"
            >
              Home
            </a>

            <a
              href="#properties"
              onClick={() => setMobileMenuOpen(false)}
              className="block rounded-lg px-3 py-3 text-sm font-medium hover:bg-emerald-50"
            >
              Properties
            </a>

            <a
              href="#why-us"
              onClick={() => setMobileMenuOpen(false)}
              className="block rounded-lg px-3 py-3 text-sm font-medium hover:bg-emerald-50"
            >
              Why EstateMate
            </a>

            <a
              href="#contact"
              onClick={() => setMobileMenuOpen(false)}
              className="block rounded-lg px-3 py-3 text-sm font-medium hover:bg-emerald-50"
            >
              Contact
            </a>

            <Link
              to="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="block rounded-lg bg-emerald-700 px-3 py-3 text-sm font-semibold text-white"
            >
              Agent login
            </Link>
          </nav>
        )}
      </header>

      {/* Hero */}
      <section
        id="home"
        className="relative isolate overflow-hidden bg-[#f0f8f2]"
      >
        <div className="absolute -right-24 -top-24 -z-10 h-80 w-80 rounded-full bg-emerald-200/40 blur-3xl" />
        <div className="absolute -bottom-36 left-0 -z-10 h-80 w-80 rounded-full bg-green-200/30 blur-3xl" />

        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[1.02fr_0.98fr] lg:px-8 lg:py-24">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/80 px-3.5 py-2 text-xs font-semibold text-emerald-800 shadow-sm">
              <Sparkles size={15} />
              A smarter way to find your home
            </div>

            <h1 className="mt-6 max-w-2xl text-4xl font-extrabold leading-[1.12] tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
              Find a place you'll love to{" "}
              <span className="text-emerald-700">
                call home.
              </span>
            </h1>

            <p className="mt-5 max-w-xl text-base leading-8 text-slate-600 sm:text-lg">
              Discover properties that fit your lifestyle and
              budget. Explore listings, compare your options,
              and connect with a real estate professional.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={scrollToListings}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-emerald-900/15 transition hover:-translate-y-0.5 hover:bg-emerald-800"
              >
                Explore properties
                <ArrowRight size={18} />
              </button>

              <Link
                to="/login"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-white px-6 py-3.5 text-sm font-bold text-emerald-800 transition hover:bg-emerald-50"
              >
                <KeyRound size={17} />
                Agent login
              </Link>
            </div>

            <div className="mt-9 flex flex-wrap gap-x-6 gap-y-3 text-sm text-slate-600">
              <span className="flex items-center gap-2">
                <CheckCircle2
                  size={17}
                  className="text-emerald-700"
                />
                Easy property discovery
              </span>

              <span className="flex items-center gap-2">
                <CheckCircle2
                  size={17}
                  className="text-emerald-700"
                />
                Direct enquiries
              </span>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-4 rounded-[2rem] bg-emerald-200/40 blur-2xl" />

            <div className="relative overflow-hidden rounded-[1.75rem] border border-white bg-white p-2 shadow-2xl shadow-emerald-950/10">
              <img
                src="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1400&q=90"
                alt="Contemporary home surrounded by a landscaped garden"
                fetchPriority="high"
                className="h-[300px] w-full rounded-[1.25rem] object-cover sm:h-[400px] lg:h-[470px]"
              />

              <div className="absolute bottom-6 left-6 right-6 rounded-2xl border border-white/60 bg-white/95 p-4 shadow-xl backdrop-blur-md sm:bottom-8 sm:left-8 sm:right-8 sm:p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800">
                    <Building2 size={22} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-slate-900">
                      Your next chapter starts here
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      Explore available property listings
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={scrollToListings}
                    aria-label="Browse property listings"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-700 text-white transition hover:bg-emerald-800"
                  >
                    <ArrowUpRight size={20} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Property search */}
      <section className="relative z-10 mx-auto -mt-1 max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-lg shadow-slate-900/5 sm:p-5">
          <div className="mb-4 flex items-center gap-2">
            <Search size={19} className="text-emerald-700" />
            <h2 className="font-bold text-slate-900">
              Find your perfect property
            </h2>
          </div>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              scrollToListings();
            }}
            className="grid gap-3 md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)_auto]"
          >
            <label className="flex min-w-0 items-center gap-3 rounded-xl border border-slate-200 px-3.5 py-3 focus-within:border-emerald-500">
              <MapPin
                size={18}
                className="shrink-0 text-emerald-700"
              />

              <input
                value={searchTerm}
                onChange={(event) =>
                  setSearchTerm(event.target.value)
                }
                placeholder="City, area or property name"
                aria-label="Search by city, area or property name"
                className="w-full min-w-0 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
              />
            </label>

            <select
              value={propertyType}
              onChange={(event) =>
                setPropertyType(event.target.value)
              }
              aria-label="Property type"
              className="rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-700 outline-none focus:border-emerald-500"
            >
              {propertyTypes.map((type) => (
                <option key={type} value={type}>
                  {type === "All"
                    ? "All property types"
                    : type}
                </option>
              ))}
            </select>

            <select
              value={maxBudget}
              onChange={(event) =>
                setMaxBudget(event.target.value)
              }
              aria-label="Maximum budget"
              className="rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-700 outline-none focus:border-emerald-500"
            >
              <option value="Any">Any budget</option>
              <option value="2500000">Up to ₹25 lakh</option>
              <option value="5000000">Up to ₹50 lakh</option>
              <option value="7500000">Up to ₹75 lakh</option>
              <option value="10000000">Up to ₹1 crore</option>
              <option value="20000000">Up to ₹2 crore</option>
            </select>

            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-6 py-3 text-sm font-bold text-white transition hover:bg-emerald-800"
            >
              <Search size={17} />
              Search
            </button>
          </form>
        </div>
      </section>

      {/* Listings */}
      <section
        id="properties"
        className="scroll-mt-24 mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20"
      >
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <SectionHeading
            eyebrow="Explore our listings"
            title="Find a home that feels right."
            description="Explore available properties and discover the details that matter to you."
          />

          <p className="shrink-0 text-sm font-medium text-slate-500">
            {loading
              ? "Loading listings..."
              : `${filteredProperties.length} ${
                  filteredProperties.length === 1
                    ? "property"
                    : "properties"
                } found`}
          </p>
        </div>

        {loading && (
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="animate-pulse overflow-hidden rounded-2xl border border-slate-200 bg-white"
              >
                <div className="h-56 bg-slate-200" />

                <div className="space-y-3 p-5">
                  <div className="h-5 w-1/3 rounded bg-slate-200" />
                  <div className="h-4 w-3/4 rounded bg-slate-200" />
                  <div className="h-4 w-1/2 rounded bg-slate-200" />
                  <div className="h-10 rounded-xl bg-slate-200" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="mt-10 rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center">
            <AlertCircle
              size={30}
              className="mx-auto text-amber-700"
            />

            <h3 className="mt-3 font-bold text-slate-900">
              Listings are temporarily unavailable
            </h3>

            <p className="mt-2 text-sm text-slate-600">
              {error}
            </p>

            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-4 rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800"
            >
              Try again
            </button>
          </div>
        )}

        {!loading && !error && properties.length === 0 && (
          <div className="mt-10 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-14 text-center">
            <Building2
              size={36}
              className="mx-auto text-emerald-700"
            />

            <h3 className="mt-4 text-lg font-bold text-slate-900">
              No properties published yet
            </h3>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              Property listings will appear here once they are
              available in the database and exposed through the
              public properties API.
            </p>
          </div>
        )}

        {!loading && !error && properties.length > 0 && (
          <>
            {filteredProperties.length > 0 ? (
              <div className="mt-9 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {filteredProperties.map((property, index) => (
                  <PropertyCard
                    key={getPropertyId(property) ?? index}
                    property={property}
                    index={index}
                    onFavorite={toggleFavorite}
                    isFavorite={favorites.includes(
                      getPropertyId(property)
                    )}
                  />
                ))}
              </div>
            ) : (
              <div className="mt-10 rounded-2xl border border-slate-200 bg-slate-50 px-6 py-14 text-center">
                <Search
                  size={32}
                  className="mx-auto text-slate-400"
                />

                <h3 className="mt-4 font-bold text-slate-900">
                  No matching properties
                </h3>

                <p className="mt-2 text-sm text-slate-500">
                  Try another location, property type or budget.
                </p>

                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm("");
                    setPropertyType("All");
                    setMaxBudget("Any");
                  }}
                  className="mt-4 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800"
                >
                  Clear filters
                </button>
              </div>
            )}
          </>
        )}
      </section>

      {/* Benefits */}
      <section
        id="why-us"
        className="bg-[#f2f8f3] py-16 sm:py-20"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">
              Why EstateMate AI
            </p>

            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
              Property discovery, made simpler.
            </h2>

            <p className="mt-4 text-sm leading-7 text-slate-600 sm:text-base">
              A straightforward way to explore listings and
              connect with the people who can help you find your
              next property.
            </p>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-3">
            <div className="rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800">
                <Search size={23} />
              </div>

              <h3 className="mt-5 font-bold text-slate-900">
                Easy property search
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-600">
                Narrow down available listings by location,
                property type and budget.
              </p>
            </div>

            <div className="rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800">
                <ShieldCheck size={23} />
              </div>

              <h3 className="mt-5 font-bold text-slate-900">
                Clear property details
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-600">
                Review available listing information before
                deciding which properties interest you.
              </p>
            </div>

            <div className="rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800">
                <Phone size={23} />
              </div>

              <h3 className="mt-5 font-bold text-slate-900">
                Connect with an agent
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-600">
                Find a property you like and use the available
                enquiry options to take the next step.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Contact CTA */}
      <section className="px-4 py-16 sm:px-6 lg:px-8 lg:py-20" id="contact">
        <div className="mx-auto max-w-7xl overflow-hidden rounded-[2rem] bg-gradient-to-br from-emerald-800 via-emerald-700 to-green-600 px-6 py-12 text-white sm:px-10 lg:px-14 lg:py-14">
          <div className="flex flex-col justify-between gap-8 md:flex-row md:items-center">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold text-white">
                <Sparkles size={14} />
                Your next home awaits
              </div>

              <h2 className="mt-5 text-3xl font-extrabold tracking-tight sm:text-4xl">
                Ready to explore your options?
              </h2>

              <p className="mt-3 text-sm leading-7 text-emerald-50 sm:text-base">
                Browse available listings and find a property
                that matches your needs.
              </p>
            </div>

            <button
              type="button"
              onClick={scrollToListings}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-bold text-emerald-800 transition hover:bg-emerald-50"
            >
              Browse properties
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-8 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <Link to="/" className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-700 text-white">
              <Home size={19} />
            </span>

            <span>
              <span className="block font-extrabold text-slate-900">
                EstateMate{" "}
                <span className="text-emerald-700">AI</span>
              </span>

              <span className="block text-xs text-slate-500">
                Real Estate Platform
              </span>
            </span>
          </Link>

          <p className="text-xs leading-5 text-slate-500">
            © {new Date().getFullYear()} EstateMate AI. All
            rights reserved.
          </p>

          <Link
            to="/login"
            className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-800 hover:text-emerald-950"
          >
            Agent login
            <ArrowUpRight size={16} />
          </Link>
        </div>
      </footer>

      {/* Floating EstateMate AI Assistant */}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col items-end sm:bottom-6 sm:right-6">
        {isAssistantOpen && (
          <section
            aria-label="EstateMate AI chat"
            className="mb-3 flex w-[calc(100vw-2rem)] max-w-[380px] flex-col overflow-hidden rounded-[1.5rem] border border-emerald-100/80 bg-white shadow-[0_24px_80px_-20px_rgba(6,78,59,0.38)] ring-1 ring-black/5 animate-in slide-in-from-bottom-3 duration-300 sm:mb-4 sm:w-[380px]"
          >
            {/* Assistant header */}
            <div className="relative flex items-center gap-3 overflow-hidden bg-gradient-to-br from-emerald-800 via-emerald-700 to-teal-600 px-4 py-4 text-white">
              <div className="pointer-events-none absolute -right-8 -top-12 h-28 w-28 rounded-full bg-white/10 blur-2xl" />

              <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/20 bg-white/15 shadow-inner">
                <Bot size={23} />

                <span className="absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-emerald-700 bg-emerald-300" />
              </div>

              <div className="relative min-w-0 flex-1">
                <h3 className="font-bold tracking-tight">
                  EstateMate AI
                </h3>

                <p className="mt-0.5 text-xs text-emerald-50">
                  Your personal property assistant
                </p>

                <span className="mt-1.5 inline-flex items-center gap-1.5 text-[10px] font-medium text-emerald-100">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
                  Ready to help
                </span>
              </div>

              <button
                type="button"
                onClick={() => setIsAssistantOpen(false)}
                aria-label="Close AI assistant"
                className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/15 text-white/90 transition hover:bg-white/15 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/70"
              >
                <X size={19} />
              </button>
            </div>

            {/* Existing Assistant.jsx component */}
            <div className="max-h-[min(68vh,560px)] min-h-[300px] overflow-y-auto overscroll-contain bg-gradient-to-b from-slate-50 to-white sm:h-[430px]">
              <AIAssistant />
            </div>

            <div className="border-t border-slate-100 bg-white px-3 py-2.5 text-center">
              <p className="text-[10px] font-medium text-slate-400">
                EstateMate AI
                <span className="mx-1 text-emerald-500">•</span>
                Property guidance at your fingertips
              </p>
            </div>
          </section>
        )}

        {/* Small circular floating assistant button */}
        <button
          type="button"
          onClick={() =>
            setIsAssistantOpen((open) => !open)
          }
          aria-label={
            isAssistantOpen
              ? "Close AI assistant"
              : "Ask EstateMate AI"
          }
          aria-expanded={isAssistantOpen}
          title={
            isAssistantOpen
              ? "Close AI assistant"
              : "Ask EstateMate AI"
          }
          className="group relative flex h-14 w-14 items-center justify-center rounded-full border border-white/80 bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 text-white shadow-[0_10px_30px_-8px_rgba(4,120,87,0.7)] ring-1 ring-emerald-900/10 transition duration-300 hover:-translate-y-1 hover:scale-[1.04] hover:shadow-[0_16px_36px_-8px_rgba(4,120,87,0.65)] focus:outline-none focus:ring-4 focus:ring-emerald-300 active:scale-95 motion-reduce:transition-none sm:h-16 sm:w-16"
        >
          {!isAssistantOpen && (
            <span className="absolute inset-0 rounded-full border border-emerald-400/60 animate-ping motion-reduce:animate-none" />
          )}

          <span className="absolute inset-[3px] rounded-full border border-white/20" />

          <span className="relative flex h-11 w-11 items-center justify-center rounded-full bg-white/10 transition group-hover:bg-white/20 sm:h-12 sm:w-12">
            {isAssistantOpen ? (
              <X size={23} strokeWidth={2.2} />
            ) : (
              <MessageCircle
                size={25}
                strokeWidth={2.1}
                className="transition-transform duration-300 group-hover:scale-110"
              />
            )}
          </span>

          <span className="absolute -right-0.5 -top-0.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-300 shadow-sm" />
        </button>
      </div>
    </div>
  );
}
