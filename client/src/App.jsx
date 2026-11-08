
import React from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
} from "react-router-dom";

import Login from "./pages/Login";
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
  const token = getStoredToken();
  const user = getStoredUser();

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route element={<ProtectedRoute />}>
          <Route
            path="/"
            element={<Navigate to="/overview" replace />}
          />

          <Route
            path="/dashboard"
            element={<Navigate to="/overview" replace />}
          />

          <Route
            path="/overview"
            element={<Dashboard />}
          />

          {/* Render the new lead-management page */}
          <Route
            path="/leads"
            element={<Leads />}
          />

          <Route
            path="/handoffs"
            element={<Handoffs />}
          />

          <Route
            path="/site-visits"
            element={<SiteVisits />}
          />

          <Route
            path="/properties"
            element={<Properties />}
          />

          <Route
            path="/properties/:propertyId"
            element={<PropertyDetails />}
          />

          <Route
            path="/ai-assistant"
            element={<AIAssistant />}
          />

          <Route
            path="*"
            element={<Navigate to="/overview" replace />}
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
