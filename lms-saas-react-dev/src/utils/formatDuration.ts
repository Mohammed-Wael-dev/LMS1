export function formatDuration(val: unknown, locale?: string): string {
  const hours = locale === "ar" ? "س" : "h";
  const minutes = locale === "ar" ? "د" : "m";

  if (val == null) return "";

  if (typeof val === "number") {
    if (!Number.isFinite(val)) return "";
    if (val >= 20) {
      const h = Math.floor(val / 60);
      const m = Math.round(val % 60);
      if (h > 0) {
        return `${h}${hours} ${m}${minutes}`;
      } else {
        return `${m}${minutes}`;
      }
    } else {
      const h = Math.floor(val);
      const m = Math.round((val - h) * 60);
      if (h > 0) {
        return `${h}${hours} ${m}${minutes}`;
      } else {
        return `${m}${minutes}`;
      }
    }
  }

  if (typeof val === "string") {
    const s = val.trim();

    if (s.includes(":")) {
      const [hStr, mStr] = s.split(":");
      const h = parseInt(hStr, 10);
      const m = parseInt(mStr ?? "0", 10);
      if (!Number.isNaN(h) && !Number.isNaN(m)) {
        if (h > 0) {
          return `${h}${hours} ${m}${minutes}`;
        } else {
          return `${m}${minutes}`;
        }
      }
    }

    const hMatch = s.match(/(\d+)\s*h/i);
    const mMatch = s.match(/(\d+)\s*m/i);
    if (hMatch || mMatch) {
      const h = hMatch ? parseInt(hMatch[1], 10) : 0;
      const m = mMatch ? parseInt(mMatch[1], 10) : 0;
      if (h > 0) {
        return `${h}${hours} ${m}${minutes}`;
      } else {
        return `${m}${minutes}`;
      }
    }

    const n = Number(s);
    if (Number.isFinite(n)) {
      if (n >= 20) {
        const h = Math.floor(n / 60);
        const m = Math.round(n % 60);
        if (h > 0) {
          return `${h}${hours} ${m}${minutes}`;
        } else {
          return `${m}${minutes}`;
        }
      } else {
        const h = Math.floor(n);
        const m = Math.round((n - h) * 60);
        if (h > 0) {
          return `${h}${hours} ${m}${minutes}`;
        } else {
          return `${m}${minutes}`;
        }
      }
    }
  }

  return "";
}
