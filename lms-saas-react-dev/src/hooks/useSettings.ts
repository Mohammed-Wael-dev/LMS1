import { useQuery } from "@tanstack/react-query";
import { fetchSettings } from "../services/settings";

export const SETTINGS_QUERY_KEY = ["settings"] as const;

export function useSettings() {
  return useQuery<AppSettings>({
    queryKey: SETTINGS_QUERY_KEY,
    queryFn: fetchSettings,
    retry: 1,
    retryDelay: 1000,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}

export function useFeatureFlag(flag: BooleanFlagKey, defaultValue = false) {
  const { data, isLoading, isFetching, isError } = useSettings();

  if (!data) {
    return { enabled: defaultValue, isLoading, isFetching, isError };
  }

  const enabled = data[flag]; // boolean
  return { enabled, isLoading, isFetching, isError };
}
