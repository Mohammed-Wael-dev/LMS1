import { useEffect } from "react";
import { useSettings } from "../../hooks/useSettings";
import { applyLanguageFromSettings } from "./lang-utils";

export default function SettingsBootstrap() {
  const { data: settings } = useSettings();

  useEffect(() => {
    if (settings) {
      applyLanguageFromSettings(settings);
    }
  }, [settings]);

  return null;
}
