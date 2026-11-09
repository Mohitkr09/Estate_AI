
import React from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
  useLocation,
} from "react-router-dom";

import Login from "./pages/Login";
import HomePage from "./pages/HomePage";
import AIAssistant from "./pages/Assistant";
import Dashboard from "./pages/Dashboard";
import Leads from "./pages/Leads";
import SiteVisits from "./pages/SiteVisits";
import Handoffs from "./pages/Handoffs";
import Properties from "./pages/Properties";
import PropertyDetails from "./pages/PropertyDetails";

import {
  getStoredToken,
  getStoredUser,
} from "./services/api";

function ProtectedRoute() {
  const location = useLocation();

  let token = null;
  let user = null;

  try {
    token = getStoredToken();
    user = getStoredUser();
  } catch (error) {
    console.error(
      "Unable to read authentication data:",
      error
    );
  }

  const isAuthenticated = Boolean(token && user);

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from: location,
        }}
      />
    );
  }

  return <Outlet />;
}

/**
 * Application routes.
 *
 * Public:
 *   /
 *   /properties
 *   /properties/:propertyId
 *   /login
 *
 * Private CRM:
 *   /overview
 *   /leads
 *   /handoffs
 *   /site-visits
 *   /properties/manage
 *   /ai-assistant
 */
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ========================================
            PUBLIC WEBSITE
        ======================================== */}

        <Route
          path="/"
          element={<HomePage />}
        />

        {/* Public property listings */}
        <Route
          path="/properties"
          element={<Properties />}
        />

        {/* Public property details */}
        <Route
          path="/properties/:propertyId"
          element={<PropertyDetails />}
        />

        {/* Login page */}
        <Route
          path="/login"
          element={<Login />}
        />

        {/* ========================================
            PRIVATE CRM
        ======================================== */}

        <Route element={<ProtectedRoute />}>
          {/* Redirect dashboard to the CRM overview */}
          <Route
            path="/dashboard"
            element={
              <Navigate
                to="/overview"
                replace
              />
            }
          />

          {/* CRM overview */}
          <Route
            path="/overview"
            element={<Dashboard />}
          />

          {/* Lead management */}
          <Route
            path="/leads"
            element={<Leads />}
          />

          {/* Handoff management */}
          <Route
            path="/handoffs"
            element={<Handoffs />}
          />

          {/* Site visit management */}
          <Route
            path="/site-visits"
            element={<SiteVisits />}
          />

          {/* Private property management */}
          <Route
            path="/properties/manage"
            element={<Properties />}
          />

          {/* AI assistant */}
          <Route
            path="/ai-assistant"
            element={<AIAssistant />}
          />
        </Route>

        {/* ========================================
            FALLBACK
        ======================================== */}

        <Route
          path="*"
          element={
            <Navigate
              to="/"
              replace
            />
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
