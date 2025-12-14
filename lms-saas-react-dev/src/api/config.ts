import axios, { AxiosHeaders, AxiosRequestConfig } from "axios";
import {
  getAccessToken,
  isAccessExpired,
  refreshAccessToken,
  removeTokens,
} from "../services/auth";
import { API_ENDPOINTS, BASE_URL } from "../utils/constants";

declare module "axios" {
  export interface AxiosRequestConfig {
    _retry?: boolean;
  }
}
// Public endpoints (no Authorization header should be sent)
const PUBLIC_ENDPOINT_PREFIXES: string[] = [
  API_ENDPOINTS.categories,
  API_ENDPOINTS.subCategories,
  API_ENDPOINTS.categoriesFilters,
  API_ENDPOINTS.oldCourses,
  API_ENDPOINTS.courses,
  API_ENDPOINTS.modules,
  API_ENDPOINTS.exams,
  API_ENDPOINTS.featuredCourses,
  API_ENDPOINTS.courseReviews,
  API_ENDPOINTS.reviewReasons,
  API_ENDPOINTS.courseStudentReview,
  API_ENDPOINTS.instructor,
  API_ENDPOINTS.login,
  API_ENDPOINTS.signup,
  API_ENDPOINTS.refreshToken,
  API_ENDPOINTS.verifyEmail,
  API_ENDPOINTS.verifyAccount,
  API_ENDPOINTS.resetPassword,
  API_ENDPOINTS.webView,
  API_ENDPOINTS.dashboardStats,
  API_ENDPOINTS.topReviews,
  API_ENDPOINTS.settings,
];

function extractPathname(config: AxiosRequestConfig): string {
  try {
    const base = config.baseURL ?? BASE_URL;
    const rawUrl = config.url ?? "";
    const full = rawUrl.startsWith("http")
      ? rawUrl
      : new URL(rawUrl.replace(/^\//, ""), base).toString();
    const u = new URL(full);
    return u.pathname.replace(/^\/+/, "");
  } catch {
    return (config.url ?? "").replace(/^\/+/, "");
  }
}

function shouldAttachAuth(config: AxiosRequestConfig): boolean {
  const path = extractPathname(config).toLowerCase();
  for (const pub of PUBLIC_ENDPOINT_PREFIXES) {
    if (!pub) continue;
    const prefix = pub.toLowerCase();
    if (path.includes(prefix) || path.startsWith(prefix)) return false;
  }
  return true;
}

const axiosInstance = axios.create({
  baseURL: BASE_URL,
  withCredentials: false,
  headers: { Accept: "*/*" },
});

axiosInstance.interceptors.request.use(
  async (config) => {
    config.baseURL = BASE_URL;

    if (shouldAttachAuth(config)) {
      if (isAccessExpired()) {
        const newAccess = await refreshAccessToken();
        if (!newAccess) {
          await removeTokens();
          window.location.href = "/login";
          return Promise.reject(new Error("Auth required"));
        }
      }

      const token = getAccessToken();
      if (!token) {
        await removeTokens();
        window.location.href = "/login";
        return Promise.reject(new Error("Auth required"));
      }

      const headers = AxiosHeaders.from(config.headers as any);
      headers.set("Authorization", `Bearer ${token}`);
      config.headers = headers;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

axiosInstance.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error?.config as
      | (AxiosRequestConfig & { _retry?: boolean })
      | undefined;
    const code = error?.response?.data?.code;
    const status = error?.response?.status;

    const isAuthError = status === 401 || code === "token_not_valid";
    const canRetry =
      !!original && !original._retry && shouldAttachAuth(original);

    if (isAuthError && canRetry) {
      original._retry = true;
      const newAccess = await refreshAccessToken();
      if (newAccess) {
        const headers = AxiosHeaders.from(original.headers as any);
        headers.set("Authorization", `Bearer ${newAccess}`);
        original.headers = headers;
        return axiosInstance(original);
      }
      await removeTokens();
      window.location.href = "/login";
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
