
import axios from "axios";

// ==================================================
// CONFIGURATION
// ==================================================

const TOKEN_KEY = "estatemate_access_token";
const USER_KEY = "estatemate_user";

// Vercel: configure VITE_API_BASE_URL in Environment Variables.
// Local development: falls back to your local FastAPI server.
const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  "http://127.0.0.1:8000"
).replace(/\/+$/, "");

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

console.info("EstateMate API configured:", API_BASE_URL);

// ==================================================
// CONSTANTS
// ==================================================

export const BHK_OPTIONS = [
  "1 BHK",
  "2 BHK",
  "3 BHK",
  "4 BHK",
];

const MAX_BUDGET_INR = 1_000_000_000;

// ==================================================
// REQUEST INTERCEPTOR
// Adds the access token to authenticated requests.
// ==================================================

api.interceptors.request.use(
  (config) => {
    const token = getStoredToken();

    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// ==================================================
// RESPONSE INTERCEPTOR
// Handles expired or invalid authentication.
// ==================================================

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const statusCode = error.response?.status;
    const requestUrl = error.config?.url || "";

    const isLoginRequest = requestUrl.includes(
      "/api/auth/login"
    );

    // Do not redirect when login itself fails.
    if (statusCode === 401 && !isLoginRequest) {
      logout();

      if (
        typeof window !== "undefined" &&
        window.location.pathname !== "/login"
      ) {
        window.location.assign("/login");
      }
    }

    return Promise.reject(error);
  }
);

// ==================================================
// LOGIN
// POST /api/auth/login
// ==================================================

export async function login(username, password) {
  try {
    logout();

    const response = await api.post("/api/auth/login", {
      username: username.trim().toLowerCase(),
      password,
    });

    const data = response.data;
    const token = data?.access_token;

    if (!token || typeof token !== "string") {
      throw new Error(
        "Login failed: the server did not return an access token."
      );
    }

    // Store the token before requesting the user profile.
    localStorage.setItem(TOKEN_KEY, token);

    let user = data.user ?? null;

    // Support APIs that return user fields at the top level.
    if (!user && data.username && data.role) {
      user = {
        id: data.id,
        username: data.username,
        role: data.role,
        is_active: data.is_active ?? data.active ?? true,
      };
    }

    // If the login response omits the user, request the profile.
    if (!user) {
      const profileResponse = await api.get("/api/auth/me");

      user =
        profileResponse.data?.user ??
        profileResponse.data;
    }

    if (!user || !user.username || !user.role) {
      throw new Error(
        "Login failed: the server returned an invalid user profile."
      );
    }

    if (
      user.is_active === false ||
      user.active === false
    ) {
      throw new Error("This account is inactive.");
    }

    localStorage.setItem(
      USER_KEY,
      JSON.stringify(user)
    );

    return user;
  } catch (error) {
    logout();

    if (error.response) {
      const detail = error.response.data?.detail;

      if (typeof detail === "string") {
        throw new Error(detail);
      }

      throw new Error(
        `Login failed with status ${error.response.status}.`
      );
    }

    throw error;
  }
}

// ==================================================
// CURRENT USER
// GET /api/auth/me
// ==================================================

export async function getCurrentUser() {
  const token = getStoredToken();

  if (!token) {
    throw new Error(
      "No access token found. Please log in."
    );
  }

  const response = await api.get("/api/auth/me");

  const user =
    response.data?.user ??
    response.data;

  if (!user?.username || !user?.role) {
    throw new Error(
      "The server returned an invalid user profile."
    );
  }

  if (
    user.is_active === false ||
    user.active === false
  ) {
    logout();
    throw new Error("This account is inactive.");
  }

  localStorage.setItem(
    USER_KEY,
    JSON.stringify(user)
  );

  return user;
}

// ==================================================
// TOKEN AND USER HELPERS
// ==================================================

export function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser() {
  try {
    const storedUser = localStorage.getItem(USER_KEY);

    if (!storedUser) {
      return null;
    }

    const user = JSON.parse(storedUser);

    if (!user || !user.username || !user.role) {
      return null;
    }

    return user;
  } catch {
    return null;
  }
}

// ==================================================
// LOGOUT
// ==================================================

export function logout() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

// ==================================================
// AUTHENTICATION AND ROLE CHECKS
// ==================================================

export function isAuthenticated() {
  return Boolean(
    getStoredToken() && getStoredUser()
  );
}

export function hasRole(...allowedRoles) {
  const user = getStoredUser();

  if (!user?.role) {
    return false;
  }

  return allowedRoles.some(
    (role) =>
      role.toLowerCase() ===
      user.role.toLowerCase()
  );
}

// ==================================================
// SHARED PROPERTY FILTER VALIDATION
// ==================================================

function parseBudget(value, label) {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return undefined;
  }

  const number = Number(value);

  if (
    !Number.isSafeInteger(number) ||
    number <= 0 ||
    number > MAX_BUDGET_INR
  ) {
    throw new Error(
      `Please enter a valid ${label}.`
    );
  }

  return number;
}

function validatePropertyFilters(filters = {}) {
  const params = {};

  if (filters.bhk) {
    if (!BHK_OPTIONS.includes(filters.bhk)) {
      throw new Error(
        "Please select a valid apartment configuration."
      );
    }

    params.bhk = filters.bhk;
  }

  const minBudget = parseBudget(
    filters.min_budget_inr,
    "minimum budget"
  );

  const maxBudget = parseBudget(
    filters.max_budget_inr,
    "maximum budget"
  );

  if (
    minBudget !== undefined &&
    maxBudget !== undefined &&
    minBudget > maxBudget
  ) {
    throw new Error(
      "Minimum budget cannot be greater than maximum budget."
    );
  }

  if (minBudget !== undefined) {
    params.min_budget_inr = minBudget;
  }

  if (maxBudget !== undefined) {
    params.max_budget_inr = maxBudget;
  }

  if (
    typeof filters.location === "string" &&
    filters.location.trim()
  ) {
    params.location = filters.location.trim();
  }

  return params;
}

// ==================================================
// PUBLIC PROPERTY SEARCH
// GET /api/properties
//
// Returns properties according to backend public
// verification and availability rules.
// ==================================================

export async function searchProperties(filters = {}) {
  const params = validatePropertyFilters(filters);

  // Public discovery only requests available properties.
  params.availability = "available";

  if (Array.isArray(filters.amenities)) {
    const amenities = [
      ...new Set(
        filters.amenities
          .filter(
            (item) => typeof item === "string"
          )
          .map((item) => item.trim())
          .filter(Boolean)
      ),
    ];

    if (amenities.length) {
      params.amenities = amenities;
    }
  }

  params.sort_by = [
    "price_asc",
    "price_desc",
  ].includes(filters.sort_by)
    ? filters.sort_by
    : "price_asc";

  const limit = Number(filters.limit ?? 100);

  if (
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > 100
  ) {
    throw new Error(
      "Search limit must be between 1 and 100."
    );
  }

  params.limit = limit;

  const response = await api.get(
    "/api/properties",
    { params }
  );

  return Array.isArray(response.data)
    ? response.data
    : [];
}

// ==================================================
// DEVELOPMENT PROPERTY PREVIEW
// GET /api/dev/properties
//
// For development samples only.
// Keep pending or fictional listings separate from
// verified public property listings.
// ==================================================

export async function getDevelopmentProperties(
  filters = {}
) {
  const params = validatePropertyFilters(filters);

  const response = await api.get(
    "/api/dev/properties",
    { params }
  );

  return Array.isArray(response.data)
    ? response.data
    : [];
}

// ==================================================
// AI PROPERTY RECOMMENDATIONS
// POST /api/assistant/recommendations
// ==================================================

export async function getPropertyRecommendations({
  bhk,
  budget_inr,
  location,
  amenities = [],
} = {}) {
  if (!BHK_OPTIONS.includes(bhk)) {
    throw new Error(
      "Please select a valid apartment configuration."
    );
  }

  const budget = Number(budget_inr);

  if (
    !Number.isSafeInteger(budget) ||
    budget <= 0 ||
    budget > MAX_BUDGET_INR
  ) {
    throw new Error("Please enter a valid budget.");
  }

  const payload = {
    bhk,
    budget_inr: budget,
    amenities: Array.isArray(amenities)
      ? [
          ...new Set(
            amenities
              .filter(
                (item) => typeof item === "string"
              )
              .map((item) => item.trim())
              .filter(Boolean)
          ),
        ]
      : [],
  };

  if (
    typeof location === "string" &&
    location.trim()
  ) {
    payload.location = location.trim();
  }

  const response = await api.post(
    "/api/assistant/recommendations",
    payload,
    { timeout: 60000 }
  );

  return response.data;
}

// ==================================================
// ADMIN: LIST ALL PROJECTS
// GET /api/properties/admin/projects
// ==================================================

export async function getAdminProjects() {
  const response = await api.get(
    "/api/properties/admin/projects"
  );

  return Array.isArray(response.data)
    ? response.data
    : [];
}

// ==================================================
// ADMIN: LIST ALL PROPERTY INVENTORY
// GET /api/properties/admin/listings
//
// Requires administrator authorization.
// Never expose this endpoint as a public preview API.
// ==================================================

export async function getAdminProperties(
  projectId = null
) {
  const params = {};

  if (projectId) {
    params.project_id = projectId;
  }

  const response = await api.get(
    "/api/properties/admin/listings",
    { params }
  );

  return Array.isArray(response.data)
    ? response.data
    : [];
}

// ==================================================
// ERROR MESSAGE HELPER
// ==================================================

export function getApiErrorMessage(error) {
  if (error.response) {
    const detail = error.response.data?.detail;

    if (typeof detail === "string") {
      return detail;
    }

    if (Array.isArray(detail)) {
      return detail
        .map((item) => item.msg || "Invalid input")
        .join(", ");
    }

    return (
      `Request failed with status ` +
      `${error.response.status}.`
    );
  }

  if (error.code === "ECONNABORTED") {
    return "The request timed out. Please try again.";
  }

  if (
    error.code === "ERR_NETWORK" ||
    !error.response
  ) {
    return (
      "Cannot connect to the backend. " +
      "Check your internet connection, backend URL, " +
      "and server CORS configuration."
    );
  }

  return (
    error.message ||
    "An unexpected error occurred."
  );
}
