// utils/formatDateTimeSimple.ts
export function formatDateTimeSimple(
  isoString: string,
  opts?: {
    locale?: string; // e.g., "en", "ar", "ar-EG"
    now?: Date; // for testing
    t?: (key: string) => string; // i18n translator (optional)
    absolute?: Intl.DateTimeFormatOptions; // override absolute format
  }
): string {
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return "";

  const locale =
    opts?.locale ??
    (typeof navigator !== "undefined" ? navigator.language : "en");
  const now = opts?.now ?? new Date();

  // Absolute format (localized)
  const absFmt = new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
    ...opts?.absolute,
  });

  const diffMs = now.getTime() - date.getTime();
  if (diffMs < 0) {
    // future -> show absolute localized date/time
    return absFmt.format(date);
  }

  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });

  const MINUTE = 60_000;
  const HOUR = 60 * MINUTE;
  const DAY = 24 * HOUR;
  const WEEK = 7 * DAY;
  const MONTH = 30 * DAY; // approximation
  const YEAR = 365 * DAY; // approximation

  if (diffMs < MINUTE) {
    // “Now” via i18n if provided, else fallback to rtf seconds
    return opts?.t ? opts.t("time.now") : rtf.format(0, "second");
  }

  if (diffMs < HOUR) {
    const mins = Math.floor(diffMs / MINUTE);
    return rtf.format(-mins, "minute"); // past => negative
  }

  if (diffMs < DAY) {
    const hrs = Math.floor(diffMs / HOUR);
    return rtf.format(-hrs, "hour");
  }

  if (diffMs < WEEK) {
    const days = Math.floor(diffMs / DAY);
    return rtf.format(-days, "day");
  }

  if (diffMs < MONTH) {
    const weeks = Math.floor(diffMs / WEEK);
    return rtf.format(-weeks, "week");
  }

  if (diffMs < YEAR) {
    const months = Math.floor(diffMs / MONTH);
    return rtf.format(-months, "month");
  }

  // a year or more -> absolute localized format
  return absFmt.format(date);
}
