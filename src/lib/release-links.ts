const HTTPS = "https:";

function parsePublicHttpsUrl(value: string): URL | null {
  try {
    const url = new URL(value);
    if (
      url.protocol !== HTTPS ||
      url.username ||
      url.password ||
      url.port ||
      url.search ||
      url.hash
    ) {
      return null;
    }
    return url;
  } catch {
    return null;
  }
}

export function isValidTestFlightUrl(value: string): boolean {
  const url = parsePublicHttpsUrl(value);
  return Boolean(
    url &&
      url.hostname === "testflight.apple.com" &&
      /^\/join\/[A-Za-z0-9]+\/?$/.test(url.pathname),
  );
}

export function isValidAppStoreUrl(value: string): boolean {
  const url = parsePublicHttpsUrl(value);
  return Boolean(
    url &&
      url.hostname === "apps.apple.com" &&
      /\/app(?:\/[^/]+)?\/id\d+\/?$/.test(url.pathname),
  );
}

export function isValidNogginRepositoryUrl(value: string): boolean {
  const url = parsePublicHttpsUrl(value);
  if (!url || url.hostname !== "github.com") return false;

  const segments = url.pathname.split("/").filter(Boolean);
  return segments.length === 2 && segments.every((segment) => /^[A-Za-z0-9._-]+$/.test(segment));
}
