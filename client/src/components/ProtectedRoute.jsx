
import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { getStoredToken, getStoredUser } from "../services/api";

export default function ProtectedRoute() {
  const location = useLocation();

  const token = getStoredToken();
  const user = getStoredUser();

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
