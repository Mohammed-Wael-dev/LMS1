import i18n from "../../i18n/config";

export function normalizeCode(code: string): "en" | "ar" | "es" | string {
  const c = code.trim().toLowerCase();
  if (c.startsWith("en")) return "en";
  if (c.startsWith("ar")) return "ar";
  if (c.startsWith("es")) return "es";
  return c;
}

export function setDocumentDirByLang(lang: string) {
  document.body.dir = lang === "ar" ? "rtl" : "ltr";
}

export function applyLanguageFromSettings(settings: AppSettings) {
  const allowed = (settings.languages ?? []).map((l: LanguageEntry) =>
    normalizeCode(l.code)
  );

  const stored = normalizeCode(localStorage.getItem("i18nextLng") || "");

  let nextLang: string | null = null;

  if (stored && allowed.includes(stored)) {
    nextLang = stored;
  } else {
    const def = settings.default_language?.code
      ? normalizeCode(settings.default_language.code)
      : null;
    nextLang = def && allowed.includes(def) ? def : allowed[0] || "en";
  }

  if (nextLang && i18n.language !== nextLang) {
    i18n.changeLanguage(nextLang);
  }
  localStorage.setItem("i18nextLng", nextLang || "en");
  setDocumentDirByLang(nextLang || "en");
}
