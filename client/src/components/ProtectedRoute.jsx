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
    console.error("Unable to read stored authentication data:", error);
  }

  // Require both a token and a stored user.
  if (!token || !user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location }}
      />
    );
  }

  return <Outlet />;
}
