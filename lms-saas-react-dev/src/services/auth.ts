// src/services/auth.ts
import { NavigateFunction } from "react-router";
import {
  ACCESS_TOKEN_KEY,
  REFRESH_TOKEN_KEY,
  ACCESS_TOKEN_EXPIRES_AT_KEY,
  USER_KEY,
  TOKEN_TTL_MS,
  API_ENDPOINTS,
  BASE_URL,
} from "../utils/constants";
import axios from "axios";
import { getCookie, setCookie, deleteCookie } from "./cookies";

// ---- Small event bus to notify app when tokens refresh (for React Query invalidation)
type Listener = () => void;
const tokenRefreshListeners = new Set<Listener>();
export function onTokensRefreshed(fn: Listener): () => void {
  tokenRefreshListeners.add(fn);
  return () => tokenRefreshListeners.delete(fn);
}
function notifyTokensRefreshed() {
  tokenRefreshListeners.forEach((fn) => {
    try {
      fn();
    } catch (e: any) {
      console.error(e);
    }
  });
}

// ---- Utilities
function decodeJwtExp(token: string): number | null {
  try {
    const payload = token.split(".")[1];
    const json = JSON.parse(
      atob(payload.replace(/-/g, "+").replace(/_/g, "/"))
    );
    // JWT exp is in seconds
    return typeof json?.exp === "number" ? json.exp * 1000 : null;
  } catch {
    return null;
  }
}

// ---- Getters (now from cookies)
export function getAccessToken(): string | null {
  return getCookie(ACCESS_TOKEN_KEY);
}
export function getRefreshToken(): string | null {
  return getCookie(REFRESH_TOKEN_KEY);
}
export function getAccessExp(): number | null {
  const raw = localStorage.getItem(ACCESS_TOKEN_EXPIRES_AT_KEY);
  return raw ? Number(raw) : null;
}
export function isAccessExpired(leewayMs = 30_000): boolean {
  const exp = getAccessExp();
  if (!exp) return true;
  return Date.now() + leewayMs >= exp;
}

// ---- Setters
export async function storeTokens(params: {
  access: string;
  refresh: string;
  user?: any;
  navigate?: NavigateFunction;
  setIsAuthenticated?: (v: boolean) => void;
}): Promise<void> {
  const { access, refresh, user, navigate, setIsAuthenticated } = params;

  const exp =
    decodeJwtExp(access) ??
    Date.now() + (typeof TOKEN_TTL_MS === "number" ? TOKEN_TTL_MS : 0);

  // 1 day cookie for both tokens
  setCookie(ACCESS_TOKEN_KEY, access, { days: 1 });
  setCookie(REFRESH_TOKEN_KEY, refresh, { days: 1 });
  localStorage.setItem(ACCESS_TOKEN_EXPIRES_AT_KEY, String(exp));

  // user stays in localStorage
  if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));

  if (setIsAuthenticated) setIsAuthenticated(true);
  
  // Check if user has completed assessment (only for students)
  if (navigate && user?.is_student && !user?.has_completed_assessment) {
    navigate("/assessment", { replace: true });
  } else if (navigate) {
    navigate("/", { replace: true });
  }
}

export async function removeTokens(
  navigate?: NavigateFunction,
  setIsAuthenticated?: (v: boolean) => void
): Promise<void> {
  deleteCookie(ACCESS_TOKEN_KEY);
  deleteCookie(REFRESH_TOKEN_KEY);
  localStorage.removeItem(ACCESS_TOKEN_EXPIRES_AT_KEY);
  localStorage.removeItem(USER_KEY);

  if (setIsAuthenticated) setIsAuthenticated(false);
  if (navigate) navigate("/login", { replace: true });
}

// ---- Refresh (de-dup concurrent calls)
let refreshingPromise: Promise<string | null> | null = null;

export async function refreshAccessToken(): Promise<string | null> {
  const refresh = getRefreshToken();
  if (!refresh) return null;

  if (!refreshingPromise) {
    refreshingPromise = axios
      .post(BASE_URL + API_ENDPOINTS.refreshToken, { refresh })
      .then((res) => {
        // handle shapes:
        // {data:{access,refresh}} or {access,refresh} or nested tokens
        const root = res.data?.data ?? res.data ?? {};
        const newAccess = root?.tokens?.access ?? root?.access ?? null;
        const newRefresh = root?.tokens?.refresh ?? root?.refresh ?? null;

        if (!newAccess) throw new Error("No access token in refresh response");

        const exp = decodeJwtExp(newAccess) ?? Date.now() + 5 * 60_000; // fallback 5min

        // Replace both cookies (1 day)
        setCookie(ACCESS_TOKEN_KEY, newAccess, { days: 1 });
        if (newRefresh) setCookie(REFRESH_TOKEN_KEY, newRefresh, { days: 1 });
        localStorage.setItem(ACCESS_TOKEN_EXPIRES_AT_KEY, String(exp));

        // Let the app know tokens changed (invalidate queries, etc.)
        notifyTokensRefreshed();

        return newAccess as string;
      })
      .catch(() => {
        // refresh failed → force logout
        removeTokens();
        return null;
      })
      .finally(() => {
        refreshingPromise = null;
      });
  }
  return refreshingPromise;
}

export function isAuthenticated(): boolean {
  const access = getAccessToken();
  if (!access) return false;
  return !isAccessExpired(0);
}

export function readUserFromStorage(): any | null {
  const raw = localStorage.getItem(USER_KEY);
  try {
    const u = JSON.parse(raw as string);
    return u && typeof u === "object" ? (u as any) : null;
  } catch {
    return null;
  }
}

export const roleOf = (u: User | null): "student" | "instructor" =>
  u?.is_student ? "student" : "instructor";
