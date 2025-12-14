export type SameSite = "Lax" | "Strict" | "None";

export function setCookie(
  name: string,
  value: string,
  {
    days = 1,
    path = "/",
    domain,
    sameSite = "Lax" as SameSite,
    secure,
  }: {
    days?: number;
    path?: string;
    domain?: string;
    sameSite?: SameSite;
    secure?: boolean;
  } = {}
) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  let cookie = `${encodeURIComponent(name)}=${encodeURIComponent(
    value
  )}; Expires=${expires}; Path=${path}; SameSite=${sameSite}`;
  // Default secure=true on https
  const shouldSecure =
    secure ??
    (typeof window !== "undefined" && window.location.protocol === "https:");
  if (shouldSecure) cookie += "; Secure";
  if (domain) cookie += `; Domain=${domain}`;
  document.cookie = cookie;
}

export function getCookie(name: string): string | null {
  const key = encodeURIComponent(name) + "=";
  const parts = document.cookie.split("; ");
  for (const p of parts) {
    if (p.startsWith(key)) {
      try {
        return decodeURIComponent(p.slice(key.length));
      } catch {
        return p.slice(key.length);
      }
    }
  }
  return null;
}

export function deleteCookie(name: string, path = "/", domain?: string) {
  let cookie = `${encodeURIComponent(
    name
  )}=; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=${path}`;
  if (domain) cookie += `; Domain=${domain}`;
  document.cookie = cookie;
}
