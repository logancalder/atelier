const FALLBACK_DESTINATION = "/coding";
const LOCAL_ORIGIN = "https://atelier.invalid";

export function safeRedirectDestination(value: string | null | undefined, fallback = FALLBACK_DESTINATION) {
  if (!value || !value.startsWith("/")) return fallback;

  let decoded = value;
  try {
    for (let pass = 0; pass < 3; pass += 1) {
      const next = decodeURIComponent(decoded);
      if (next === decoded) break;
      decoded = next;
    }
  } catch {
    return fallback;
  }

  if (!decoded.startsWith("/") || decoded.startsWith("//") || decoded.includes("\\") || /[\u0000-\u001f\u007f]/.test(decoded)) return fallback;

  try {
    const resolved = new URL(value, LOCAL_ORIGIN);
    return resolved.origin === LOCAL_ORIGIN
      ? `${resolved.pathname}${resolved.search}${resolved.hash}`
      : fallback;
  } catch {
    return fallback;
  }
}
