// Pure domain logic for client demos. No I/O here, so the proxy, the admin
// server actions and the unit tests all share exactly the same rules.

export type DemoMode = "basePath" | "root-static";

export interface Demo {
  slug: string;
  clientName: string;
  /** Bare hostname only, e.g. "klant-x.vercel.app". Never a full URL. */
  host: string;
  /** Vercel project the host belongs to, verified against our team at save time. */
  projectId: string;
  mode: DemoMode;
  enabled: boolean;
  /** "Protection Bypass for Automation" secret of the client project, if protected. */
  bypassSecret?: string;
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
}

export const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/;

// First path segments that belong to this app or to the platform itself.
export const RESERVED_SLUGS: ReadonlySet<string> = new Set([
  "admin",
  "api",
  "_next",
  "_vercel",
  ".well-known",
  "favicon.ico",
  "robots.txt",
  "sitemap.xml",
  "login",
  "logout",
  "static",
  "assets",
  "public",
]);

const VERCEL_HOST_PATTERN = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.vercel\.app$/;
const BYPASS_SECRET_PATTERN = /^[A-Za-z0-9_-]{16,128}$/;

export function isValidSlug(slug: string): boolean {
  return SLUG_PATTERN.test(slug) && !RESERVED_SLUGS.has(slug);
}

export function isVercelHostname(host: string): boolean {
  return host.length <= 253 && VERCEL_HOST_PATTERN.test(host);
}

export function isValidBypassSecret(secret: string): boolean {
  return BYPASS_SECRET_PATTERN.test(secret);
}

/** Global Config keys allow [A-Za-z0-9_-], which a valid slug always satisfies. */
export function demoKey(slug: string): string {
  return `demo_${slug}`;
}

export const DEMO_KEY_PREFIX = "demo_";

/**
 * Turns admin input such as "https://klant-x.vercel.app/" into "klant-x.vercel.app".
 * Anything other than a plain https origin on *.vercel.app is rejected.
 */
export function parseVercelHost(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) throw new Error("Vul de Vercel-URL in.");

  let url: URL;
  try {
    url = new URL(/^[a-z][a-z0-9+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`);
  } catch {
    throw new Error("Dit is geen geldige URL.");
  }

  if (url.protocol !== "https:") throw new Error("Alleen https-URL's zijn toegestaan.");
  if (url.username || url.password) throw new Error("De URL mag geen gebruikersnaam of wachtwoord bevatten.");
  if (url.port) throw new Error("De URL mag geen poortnummer bevatten.");
  if (url.pathname !== "/" || url.search || url.hash) {
    throw new Error("Geef alleen het domein op, zonder pad, query of #fragment.");
  }

  const host = url.hostname.toLowerCase();
  if (!isVercelHostname(host)) {
    throw new Error("Alleen adressen op *.vercel.app zijn toegestaan.");
  }
  return host;
}

/**
 * Builds the upstream URL for a proxied request. The host always comes from the
 * stored (validated) demo record and is never derived from the incoming request.
 * The path is assigned to `pathname` instead of being resolved against a base, so
 * inputs like "//evil.example" stay a path on the demo's own host.
 */
export function buildUpstreamUrl(demo: Pick<Demo, "slug" | "host" | "mode">, pathname: string, search: string): URL {
  if (!isVercelHostname(demo.host)) throw new Error("Ongeldige upstream-host.");

  const prefix = `/${demo.slug}`;
  if (pathname !== prefix && !pathname.startsWith(`${prefix}/`)) {
    throw new Error("Pad hoort niet bij deze demo.");
  }

  const upstreamPath = demo.mode === "basePath" ? pathname : pathname.slice(prefix.length) || "/";

  const url = new URL(`https://${demo.host}`);
  url.pathname = upstreamPath;
  url.search = search;

  if (url.hostname !== demo.host || url.protocol !== "https:") {
    throw new Error("Upstream-URL wijkt af van de opgeslagen host.");
  }
  return url;
}

const ADMIN_COOKIE_PATTERN = /^(?:__Secure-|__Host-)?authjs\./;

/** Removes the admin session cookies from a Cookie header before it is forwarded. */
export function stripAdminCookies(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  const kept = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .filter((part) => part && !ADMIN_COOKIE_PATTERN.test(part.split("=", 1)[0]));
  return kept.length ? kept.join("; ") : null;
}

/** Defensive shape check for values read back from Global Config. */
export function isDemo(value: unknown): value is Demo {
  if (!value || typeof value !== "object") return false;
  const d = value as Record<string, unknown>;
  return (
    typeof d.slug === "string" &&
    isValidSlug(d.slug) &&
    typeof d.host === "string" &&
    isVercelHostname(d.host) &&
    (d.mode === "basePath" || d.mode === "root-static") &&
    typeof d.enabled === "boolean" &&
    typeof d.clientName === "string" &&
    (d.bypassSecret === undefined || (typeof d.bypassSecret === "string" && isValidBypassSecret(d.bypassSecret)))
  );
}
