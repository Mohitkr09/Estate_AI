
import React, { useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  Building2,
  Handshake,
  Bot,
  LogOut,
  Home,
  Menu,
  X,
  ChevronRight,
  Sparkles,
  Bell,
  Search,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";

import AnalyticsOverview from "../components/AnalyticsOverview";
import { logout } from "../services/api";

const navigationItems = [
  {
    label: "Overview",
    path: "/overview",
    icon: LayoutDashboard,
    description: "Analytics and performance",
  },
  {
    label: "Leads",
    path: "/leads",
    icon: Users,
    description: "Manage potential clients",
  },
  {
    label: "Site Visits",
    path: "/site-visits",
    icon: CalendarDays,
    description: "Track property visits",
  },
  {
    label: "Properties",
    path: "/properties",
    icon: Building2,
    description: "Manage your listings",
  },
  {
    label: "Handoffs",
    path: "/handoffs",
    icon: Handshake,
    description: "Track deal handoffs",
  },
  {
    label: "AI Assistant",
    path: "/ai-assistant",
    icon: Bot,
    description: "Your intelligent assistant",
  },
];

function getPageTitle(pathname) {
  const currentPage = navigationItems.find(
    (item) =>
      pathname === item.path ||
      pathname.startsWith(`${item.path}/`)
  );

  return currentPage?.label || "Workspace";
}

function NavItem({ item, active, onClick, collapsed = false }) {
  const Icon = item.icon;

  return (
    <Link
      to={item.path}
      onClick={onClick}
      title={collapsed ? item.label : undefined}
      aria-current={active ? "page" : undefined}
      className={`group relative flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition-all duration-200 ${
        active
          ? "bg-emerald-50 font-semibold text-emerald-800 shadow-sm"
          : "font-medium text-slate-600 hover:bg-slate-50 hover:text-emerald-800"
      } ${collapsed ? "justify-center" : ""}`}
    >
      {active && (
        <span className="absolute bottom-2 left-0 top-2 w-1 rounded-r-full bg-emerald-600" />
      )}

      <Icon
        size={19}
        strokeWidth={active ? 2.3 : 1.8}
        className={`shrink-0 transition-colors ${
          active
            ? "text-emerald-700"
            : "text-slate-400 group-hover:text-emerald-700"
        }`}
      />

      {!collapsed && (
        <>
          <span className="min-w-0 flex-1">{item.label}</span>

          {active && (
            <ChevronRight
              size={16}
              className="shrink-0 text-emerald-600"
            />
          )}
        </>
      )}
    </Link>
  );
}

export default function Dashboard() {
  const location = useLocation();
  const navigate = useNavigate();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const isOverview = location.pathname === "/overview";
  const pageTitle = getPageTitle(location.pathname);

  const handleLogout = async () => {
    if (loggingOut) return;

    setLoggingOut(true);

    try {
      await Promise.resolve(logout());
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      navigate("/login", { replace: true });
    }
  };

  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <div className="min-h-screen bg-[#f5f8f6] text-slate-800">
      <div className="flex min-h-screen">
        {/* Desktop sidebar */}
        <aside
          className={`sticky top-0 hidden h-screen shrink-0 flex-col border-r border-slate-200/80 bg-white transition-[width] duration-300 md:flex ${
            sidebarCollapsed ? "w-[88px]" : "w-64 xl:w-[272px]"
          }`}
        >
          {/* Brand */}
          <Link
            to="/overview"
            className={`flex h-[84px] shrink-0 items-center border-b border-slate-100 ${
              sidebarCollapsed ? "justify-center px-3" : "gap-3 px-6"
            }`}
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-green-700 text-white shadow-lg shadow-emerald-700/20">
              <Home size={23} strokeWidth={2.2} />
            </div>

            {!sidebarCollapsed && (
              <div className="min-w-0">
                <h1 className="truncate text-lg font-extrabold tracking-tight text-slate-900">
                  EstateMate
                  <span className="text-emerald-600"> AI</span>
                </h1>
                <p className="mt-0.5 text-xs text-slate-500">
                  Real Estate Workspace
                </p>
              </div>
            )}
          </Link>

          {/* Workspace label */}
          <div
            className={`pt-7 ${
              sidebarCollapsed ? "px-3" : "px-5"
            }`}
          >
            {!sidebarCollapsed ? (
              <p className="px-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                Workspace
              </p>
            ) : (
              <div className="mx-auto h-px w-8 bg-slate-200" />
            )}
          </div>

          {/* Navigation */}
          <nav
            aria-label="Main navigation"
            className={`flex-1 space-y-1 overflow-y-auto py-4 ${
              sidebarCollapsed ? "px-3" : "px-4"
            }`}
          >
            {navigationItems.map((item) => {
              const active =
                location.pathname === item.path ||
                location.pathname.startsWith(`${item.path}/`);

              return (
                <NavItem
                  key={item.path}
                  item={item}
                  active={active}
                  collapsed={sidebarCollapsed}
                />
              );
            })}
          </nav>

          {/* AI promotion */}
          {!sidebarCollapsed && (
            <div className="mx-4 mb-4 overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-800 via-emerald-700 to-green-600 p-4 text-white">
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-white/15">
                <Sparkles size={19} />
              </div>

              <p className="text-sm font-bold">Work smarter with AI</p>
              <p className="mt-1 text-xs leading-5 text-emerald-50/90">
                Discover insights and manage your real estate workflow.
              </p>

              <Link
                to="/ai-assistant"
                className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-white transition hover:text-emerald-100"
              >
                Explore assistant
                <ChevronRight size={14} />
              </Link>
            </div>
          )}

          {/* Sidebar footer */}
          <div className="border-t border-slate-100 p-3">
            <button
              type="button"
              onClick={() => setSidebarCollapsed((value) => !value)}
              className={`mb-2 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-500 transition hover:bg-slate-50 hover:text-emerald-700 ${
                sidebarCollapsed ? "justify-center" : ""
              }`}
              title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {sidebarCollapsed ? (
                <PanelLeftOpen size={18} />
              ) : (
                <>
                  <PanelLeftClose size={18} />
                  <span>Collapse sidebar</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-slate-600 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-wait disabled:opacity-60 ${
                sidebarCollapsed ? "justify-center" : ""
              }`}
            >
              <LogOut size={18} />
              {!sidebarCollapsed && (
                <span>{loggingOut ? "Signing out..." : "Sign out"}</span>
              )}
            </button>
          </div>
        </aside>

        {/* Main workspace */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Top header */}
          <header className="sticky top-0 z-30 flex h-[76px] shrink-0 items-center justify-between border-b border-slate-200/80 bg-white/90 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-emerald-50 hover:text-emerald-700 md:hidden"
                aria-label="Open navigation"
              >
                <Menu size={20} />
              </button>

              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                {isOverview ? (
                  <LayoutDashboard size={20} />
                ) : (
                  (() => {
                    const Icon =
                      navigationItems.find(
                        (item) =>
                          item.path === location.pathname ||
                          location.pathname.startsWith(`${item.path}/`)
                      )?.icon || Home;

                    return <Icon size={20} />;
                  })()
                )}
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="truncate text-base font-bold text-slate-900 sm:text-lg">
                    {isOverview ? "Analytics Overview" : pageTitle}
                  </h2>
                  {isOverview && (
                    <span className="hidden rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700 sm:inline-flex">
                      Dashboard
                    </span>
                  )}
                </div>

                <p className="hidden truncate text-xs text-slate-500 sm:block">
                  Your real estate business, all in one place
                </p>
              </div>
            </div>

            <div className="ml-3 flex shrink-0 items-center gap-2 sm:gap-3">
              <div className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500 lg:flex">
                <Search size={15} />
                <span>EstateMate Workspace</span>
              </div>

              <div
                className="hidden h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500 sm:flex"
                title="Notifications"
              >
                <Bell size={18} />
              </div>

              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-60"
              >
                <LogOut size={16} />
                <span className="hidden sm:inline">
                  {loggingOut ? "Signing out..." : "Sign out"}
                </span>
              </button>
            </div>
          </header>

          {/* Mobile navigation drawer */}
          {mobileMenuOpen && (
            <div className="fixed inset-0 z-50 md:hidden">
              <button
                type="button"
                aria-label="Close navigation"
                className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm"
                onClick={closeMobileMenu}
              />

              <aside className="absolute inset-y-0 left-0 flex w-[min(300px,85vw)] flex-col bg-white shadow-2xl">
                <div className="flex h-[76px] items-center justify-between border-b border-slate-100 px-5">
                  <Link
                    to="/overview"
                    onClick={closeMobileMenu}
                    className="flex items-center gap-3"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-green-700 text-white">
                      <Home size={21} />
                    </div>
                    <div>
                      <p className="font-extrabold text-slate-900">
                        EstateMate <span className="text-emerald-600">AI</span>
                      </p>
                      <p className="text-xs text-slate-500">Real Estate CRM</p>
                    </div>
                  </Link>

                  <button
                    type="button"
                    onClick={closeMobileMenu}
                    className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                    aria-label="Close navigation"
                  >
                    <X size={20} />
                  </button>
                </div>

                <nav className="flex-1 space-y-1 overflow-y-auto p-4">
                  <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                    Workspace
                  </p>

                  {navigationItems.map((item) => {
                    const active =
                      location.pathname === item.path ||
                      location.pathname.startsWith(`${item.path}/`);

                    return (
                      <NavItem
                        key={item.path}
                        item={item}
                        active={active}
                        onClick={closeMobileMenu}
                      />
                    );
                  })}
                </nav>

                <div className="border-t border-slate-100 p-4">
                  <button
                    type="button"
                    onClick={handleLogout}
                    disabled={loggingOut}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-slate-600 hover:bg-red-50 hover:text-red-600"
                  >
                    <LogOut size={18} />
                    {loggingOut ? "Signing out..." : "Sign out"}
                  </button>
                </div>
              </aside>
            </div>
          )}

          {/* Page content */}
          <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
            <div className="mx-auto w-full max-w-[1600px]">
              {isOverview ? (
                <AnalyticsOverview />
              ) : (
                <Outlet />
              )}
            </div>
          </main>

          {/* Footer */}
          <footer className="mt-auto flex flex-col items-center justify-between gap-2 border-t border-slate-200/80 bg-white px-4 py-4 text-xs text-slate-500 sm:flex-row sm:px-6 lg:px-8">
            <p>
              © {new Date().getFullYear()} EstateMate AI. All rights reserved.
            </p>
            <p className="flex items-center gap-1.5">
              Built for smarter real estate management
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
            </p>
          </footer>
        </div>
      </div>
    </div>
  );
}
