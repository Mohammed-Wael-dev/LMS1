import { StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import {
  keepPreviousData,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import AppRoutes from "./routes";
import { Toaster } from "react-hot-toast";
import "./index.css";
import TokenRefreshSubscriber from "./services/TokenRefreshSubscriber";
import SettingsBootstrap from "./components/settings/SettingsBootstrap";
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
      staleTime: 1000 * 60 * 60 * 24,
      gcTime: 1000 * 60 * 60,
      retry: 1,
      placeholderData: keepPreviousData,
    },
    mutations: { retry: 0 },
  },
});

document.body.dir = localStorage.getItem("i18nextLng") === "ar" ? "rtl" : "ltr";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <Suspense fallback={<div>Loading...</div>}>
        <SettingsBootstrap />
        <AppRoutes />
        <Toaster position="top-right" />
        <TokenRefreshSubscriber />
      </Suspense>
    </QueryClientProvider>
  </StrictMode>
);
