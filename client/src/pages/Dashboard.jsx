
import React from "react";
import { useLocation, Link } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  Building2,
  Handshake,
  Bot,
  LogOut,
  Home,
} from "lucide-react";

import AnalyticsOverview from "../components/AnalyticsOverview";
import { logout } from "../services/api";

const navigationItems = [
  {
    label: "Overview",
    path: "/overview",
    icon: LayoutDashboard,
  },
  {
    label: "Leads",
    path: "/leads",
    icon: Users,
  },
  {
    label: "Site Visits",
    path: "/site-visits",
    icon: CalendarDays,
  },
  {
    label: "Properties",
    path: "/properties",
    icon: Building2,
  },
  {
    label: "Handoffs",
    path: "/handoffs",
    icon: Handshake,
  },
  {
    label: "AI Assistant",
    path: "/ai-assistant",
    icon: Bot,
  },
];

export default function Dashboard() {
  const location = useLocation();

  const handleLogout = () => {
    logout();
    window.location.href = "/login";
  };

  const isOverview = location.pathname === "/overview";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="flex min-h-screen">
        {/* Sidebar */}
        <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white md:flex">
          {/* Brand */}
          <div className="flex h-20 items-center gap-3 border-b border-slate-100 px-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white">
              <Home size={22} />
            </div>

            <div>
              <h1 className="text-lg font-bold tracking-tight">
                EstateMate AI
              </h1>
              <p className="text-xs text-slate-500">
                Real Estate CRM
              </p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 px-3 py-6">
            <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
              Workspace
            </p>

            {navigationItems.map((item) => {
              const Icon = item.icon;
              const active = location.pathname === item.path;

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${
                    active
                      ? "bg-blue-50 text-blue-700"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <Icon size={19} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Sidebar footer */}
          <div className="border-t border-slate-100 p-4">
            <div className="mb-4 rounded-xl bg-slate-50 p-3">
              <p className="text-sm font-semibold text-slate-800">
                EstateMate Workspace
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Manage leads and properties
              </p>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-slate-600 transition hover:bg-red-50 hover:text-red-600"
            >
              <LogOut size={18} />
              Sign out
            </button>
          </div>
        </aside>

        {/* Main area */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Top header */}
          <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-700 md:hidden">
                <Home size={20} />
              </div>

              <div>
                <h2 className="text-sm font-semibold text-slate-900 sm:text-base">
                  {isOverview
                    ? "Analytics Overview"
                    : "EstateMate AI Workspace"}
                </h2>

                <p className="hidden text-xs text-slate-500 sm:block">
                  Real estate management dashboard
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </header>

          {/* Mobile navigation */}
          <nav className="flex gap-2 overflow-x-auto border-b border-slate-200 bg-white p-3 md:hidden">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const active = location.pathname === item.path;

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition ${
                    active
                      ? "bg-blue-50 text-blue-700"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <Icon size={16} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Page content */}
          <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
            <div className="mx-auto max-w-[1600px]">
              {isOverview ? (
                <AnalyticsOverview />
              ) : (
                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h1 className="text-xl font-bold text-slate-900">
                    Leads
                  </h1>

                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Your existing lead-management page needs to be rendered
                    here if you previously had a dedicated leads view inside
                    Dashboard.jsx.
                  </p>

                  <Link
                    to="/overview"
                    className="mt-4 inline-flex rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                  >
                    Return to Overview
                  </Link>
                </section>
              )}
            </div>
          </main>

          {/* Footer */}
          <footer className="border-t border-slate-200 bg-white px-4 py-4 text-center text-xs text-slate-500 sm:px-6">
            EstateMate AI · Real Estate CRM
          </footer>
        </div>
      </div>
    </div>
  );
}
