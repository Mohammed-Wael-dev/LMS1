import { useMemo, useState } from "react";
import { Globe } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useSettings } from "../../hooks/useSettings";
import { normalizeCode, setDocumentDirByLang } from "../settings/lang-utils";
import i18n from "../../i18n/config";

type LangOption = { code: string; label: string };

export default function LocaleSwitcher() {
  const { t } = useTranslation();
  const { data: settings } = useSettings();
  const [open, setOpen] = useState(false);

  const langs: LangOption[] = useMemo(() => {
    const arr = (settings?.languages ?? []).map((l) => {
      const code = normalizeCode(l.code);
      const label =
        code === "ar" ? "العربية" : code === "es" ? "Español" : "English";
      return { code, label };
    });

    const seen = new Set<string>();
    const withResources = arr.filter((x) => {
      if (seen.has(x.code)) return false;
      seen.add(x.code);
      return ["en", "ar", "es"].includes(x.code);
    });

    return withResources;
  }, [settings]);

  if (!langs || langs.length <= 1) return null;

  const current = normalizeCode(i18n.language);

  const changeTo = (code: string) => {
    if (code === current) return;
    i18n.changeLanguage(code);
    localStorage.setItem("i18nextLng", code);
    setDocumentDirByLang(code);
    setOpen(false);
  };

  return (
    <div className="relative inline-block text-left h-6 w-6 ">
      <button
        onClick={() => setOpen((p) => !p)}
        className="relative cursor-pointer text-[24px] text-gray-400 hover:text-gray-500"
        title={t("header.lang")}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <div>
          <Globe className="h-6 w-6" />
        </div>
      </button>

      {open && (
        <div
          role="menu"
          aria-orientation="vertical"
          className="absolute right-0 mt-2 w-40 origin-top-right rounded-xl border bg-white shadow-lg focus:outline-none z-50"
        >
          {langs.map((l) => (
            <button
              key={l.code}
              role="menuitem"
              onClick={() => changeTo(l.code)}
              className={`w-full text-left px-4 py-2 rounded-xl text-sm hover:bg-gray-50 ${
                current === l.code
                  ? "font-semibold text-gray-900"
                  : "text-gray-700"
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
