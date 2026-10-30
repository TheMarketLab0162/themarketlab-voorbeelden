import { NextResponse, type NextRequest } from "next/server";
import { get } from "@vercel/global-config";
import { buildUpstreamUrl, demoKey, isDemo, isValidSlug, stripAdminCookies, type Demo } from "./lib/demos";

// Routes voorbeeld.themarketlab.nl/{slug}/... to the client's own Vercel
// deployment. The routing table lives in Global Config, so adding a demo needs no
// redeploy of this project. /admin only gets security headers here; its auth is
// enforced in the pages and server actions themselves.

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (pathname === "/admin" || pathname.startsWith("/admin/")) return adminResponse(request);

  const slug = pathname.split("/")[1];
  if (!isValidSlug(slug)) return statusPage(404, "Pagina niet gevonden", "Deze pagina bestaat niet.");

  let demo: Demo | null;
  try {
    const value = await get(demoKey(slug));
    demo = isDemo(value) ? value : null;
  } catch (error) {
    console.error("Global Config lookup failed", error);
    return statusPage(503, "Tijdelijk niet beschikbaar", "Probeer het over een paar minuten opnieuw.");
  }

  if (!demo) return statusPage(404, "Demo niet gevonden", "Er is geen demo op dit adres.");
  if (!demo.enabled) return statusPage(410, "Demo niet beschikbaar", "Deze demo is niet meer online.");

  // Relative URLs in a root-static site only resolve correctly with a trailing slash.
  // The redirect target is built from the validated slug, never from user input.
  if (demo.mode === "root-static" && pathname === `/${slug}`) {
    return NextResponse.redirect(new URL(`/${slug}/${search}`, request.url), 308);
  }

  const target = buildUpstreamUrl(demo, pathname, search);

  const headers = new Headers(request.headers);
  const cookie = stripAdminCookies(headers.get("cookie"));
  if (cookie) headers.set("cookie", cookie);
  else headers.delete("cookie");
  headers.delete("authorization");
  if (demo.bypassSecret) headers.set("x-vercel-protection-bypass", demo.bypassSecret);
  else headers.delete("x-vercel-protection-bypass");

  const response = NextResponse.rewrite(target, { request: { headers } });
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}

function adminResponse(request: NextRequest) {
  const nonce = btoa(crypto.randomUUID());
  const dev = process.env.NODE_ENV === "development";
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https://avatars.githubusercontent.com",
    "font-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'none'",
    "frame-ancestors 'none'",
    "form-action 'self' https://github.com",
  ].join("; ");

  // Next.js reads the nonce from the request's CSP header and applies it to its scripts.
  const headers = new Headers(request.headers);
  headers.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers } });
  response.headers.set("Content-Security-Policy", csp);
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "same-origin");
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}

function statusPage(status: number, title: string, message: string) {
  const html = `<!doctype html><html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${title} | The MarketLab</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;font-family:system-ui,sans-serif;background:#111827;color:#fff;text-align:center}p{color:#9ca3af}a{color:#93c5fd}</style></head><body><main><h1>${title}</h1><p>${message}</p><p><a href="/">voorbeeld.themarketlab.nl</a></p></main></body></html>`;
  return new NextResponse(html, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex" },
  });
}

export const config = {
  // Everything except the root page and this app's own assets. Client assets live
  // under /{slug}/_next/..., which still matches.
  matcher: ["/((?!_next/|favicon\\.ico$|robots\\.txt$).+)"],
};
