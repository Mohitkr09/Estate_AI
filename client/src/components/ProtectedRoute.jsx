

import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import {
  getStoredToken,
  getStoredUser,
} from "../services/api";

export default function ProtectedRoute() {
  const location = useLocation();

  let token = null;
  let user = null;

  try {
    token = getStoredToken();
    user = getStoredUser();
  } catch (error) {
    console.error(
      "Unable to read stored authentication data:",
      error
    );
  }

  // Private CRM pages require both a token and a user.
  const isAuthenticated = Boolean(token && user);

  // Redirect unauthenticated users to login.
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

  // Render the requested protected route.
  return <Outlet />;
}
