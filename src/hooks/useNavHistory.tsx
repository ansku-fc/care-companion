import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";

/**
 * Global navigation history.
 *
 * Tracks two kinds of history:
 *  - Router routes (every URL the doctor visits)
 *  - Named "scopes" — virtual sub-stacks for in-page navigation
 *    (e.g. patient profile sections that don't change the URL).
 *
 * Back buttons read from this so labels are always dynamic
 * ("← Back to <wherever the doctor actually came from>").
 */

type RouteEntry = { path: string; label: string };

const ROUTE_LABELS: { match: (p: string) => boolean; label: (p: string) => string }[] = [
  { match: (p) => p === "/", label: () => "Home" },
  { match: (p) => p.startsWith("/calendar"), label: () => "Calendar" },
  { match: (p) => p.startsWith("/tasks"), label: () => "Tasks" },
  { match: (p) => p.startsWith("/clinical-hours"), label: () => "Clinical Hours" },
  { match: (p) => p.startsWith("/notes"), label: () => "Notes" },
  { match: (p) => /^\/patients\/[^/]+/.test(p), label: () => "Patient Profile" },
  { match: (p) => p.startsWith("/patients"), label: () => "Patients" },
];

function labelForPath(path: string): string {
  for (const r of ROUTE_LABELS) if (r.match(path)) return r.label(path);
  return "Back";
}

type ScopeStack = string[]; // entries are arbitrary keys, owner gives labels

type Ctx = {
  routeHistory: RouteEntry[];
  /** Entry the user came from at the route level, or null if none. */
  previousRoute: RouteEntry | null;
  /** Pop a scope-local entry; returns the previous entry key or null. */
  popScope: (scope: string) => string | null;
  /** Push a scope-local entry. */
  pushScope: (scope: string, key: string) => void;
  /** Read top-of-stack for a scope without popping. */
  peekScope: (scope: string) => string | null;
  /** Replace the current scope entry (no push). */
  replaceScope: (scope: string, key: string) => void;
  /** Reset a scope entirely. */
  resetScope: (scope: string, initial?: string) => void;
};

const NavHistoryContext = createContext<Ctx | null>(null);

export function NavHistoryProvider({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [routeHistory, setRouteHistory] = useState<RouteEntry[]>([]);
  const scopesRef = useRef<Record<string, ScopeStack>>({});

  // Push every route change (path only, ignore query/hash for de-dup).
  useEffect(() => {
    const path = location.pathname;
    setRouteHistory((prev) => {
      const last = prev[prev.length - 1];
      if (last && last.path === path) return prev;
      const next = [...prev, { path, label: labelForPath(path) }];
      // Cap to a reasonable size.
      return next.slice(-30);
    });
  }, [location.pathname]);

  const previousRoute =
    routeHistory.length >= 2 ? routeHistory[routeHistory.length - 2] : null;

  const pushScope = useCallback((scope: string, key: string) => {
    const stack = scopesRef.current[scope] ?? [];
    const top = stack[stack.length - 1];
    if (top === key) return;
    scopesRef.current[scope] = [...stack, key].slice(-30);
  }, []);

  const popScope = useCallback((scope: string): string | null => {
    const stack = scopesRef.current[scope] ?? [];
    if (stack.length <= 1) {
      scopesRef.current[scope] = stack.slice(0, 1);
      return null;
    }
    const next = stack.slice(0, -1);
    scopesRef.current[scope] = next;
    return next[next.length - 1] ?? null;
  }, []);

  const peekScope = useCallback((scope: string): string | null => {
    const stack = scopesRef.current[scope] ?? [];
    return stack.length >= 2 ? stack[stack.length - 2] : null;
  }, []);

  const replaceScope = useCallback((scope: string, key: string) => {
    const stack = scopesRef.current[scope] ?? [];
    if (stack.length === 0) {
      scopesRef.current[scope] = [key];
    } else {
      scopesRef.current[scope] = [...stack.slice(0, -1), key];
    }
  }, []);

  const resetScope = useCallback((scope: string, initial?: string) => {
    scopesRef.current[scope] = initial ? [initial] : [];
  }, []);

  return (
    <NavHistoryContext.Provider
      value={{ routeHistory, previousRoute, pushScope, popScope, peekScope, replaceScope, resetScope }}
    >
      {children}
    </NavHistoryContext.Provider>
  );
}

export function useNavHistory(): Ctx {
  const ctx = useContext(NavHistoryContext);
  if (!ctx) throw new Error("useNavHistory must be used inside <NavHistoryProvider>");
  return ctx;
}

/**
 * Convenience hook for a top-level "← Back to X" button.
 * Returns label + click handler. Falls back to a sensible parent route if no history.
 */
export function useRouteBack(fallback: { path: string; label: string }) {
  const { previousRoute } = useNavHistory();
  const navigate = useNavigate();
  const target = previousRoute ?? fallback;
  return {
    label: `Back to ${target.label}`,
    onBack: () => navigate(target.path),
  };
}
