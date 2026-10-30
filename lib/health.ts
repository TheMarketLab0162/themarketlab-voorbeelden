import "server-only";
import { buildUpstreamUrl, type Demo } from "./demos";

export interface HealthResult {
  url: string;
  ok: boolean;
  checks: { label: string; ok: boolean; detail: string }[];
}

/**
 * Fetches the demo's start page straight from its Vercel host (the same request
 * the proxy makes) and checks it against the technical contract.
 */
export async function checkDemo(demo: Demo): Promise<HealthResult> {
  const path = `/${demo.slug}${demo.mode === "root-static" ? "/" : ""}`;
  const url = buildUpstreamUrl(demo, path, "");
  const checks: HealthResult["checks"] = [];

  let res: Response;
  try {
    res = await fetch(url, {
      redirect: "manual",
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
      headers: demo.bypassSecret ? { "x-vercel-protection-bypass": demo.bypassSecret } : {},
    });
  } catch (error) {
    return {
      url: url.href,
      ok: false,
      checks: [{ label: "Bereikbaar", ok: false, detail: `Geen antwoord: ${(error as Error).message}` }],
    };
  }

  const location = res.headers.get("location");
  if (res.status >= 300 && res.status < 400) {
    const target = location ? new URL(location, url) : null;
    const sameHost = target?.host === url.host;
    checks.push({
      label: "Geen redirect naar een ander domein",
      ok: sameHost && target!.pathname.startsWith(`/${demo.slug}`),
      detail: `${res.status} → ${location ?? "(geen Location)"}`,
    });
  } else {
    checks.push({ label: "Status 200", ok: res.status === 200, detail: `HTTP ${res.status}` });
  }

  if (res.status === 401 || res.status === 403) {
    checks.push({
      label: "Deployment Protection",
      ok: false,
      detail: "Het project is beveiligd. Vul het 'Protection Bypass for Automation'-geheim in.",
    });
  }

  const type = res.headers.get("content-type") ?? "";
  if (res.status === 200 && type.includes("text/html")) {
    const html = (await res.text()).slice(0, 500_000);
    if (demo.mode === "basePath") {
      checks.push({
        label: `Assets onder /${demo.slug}/`,
        ok: html.includes(`/${demo.slug}/`),
        detail: html.includes(`/${demo.slug}/`)
          ? "Base path gevonden in de HTML."
          : "Geen verwijzingen naar de base path gevonden. Is de site gebouwd met basePath?",
      });
      const rootAssets = /(?:src|href)=["']\/(?:_next|assets|static)\//.test(html);
      checks.push({
        label: "Geen root-assets",
        ok: !rootAssets,
        detail: rootAssets ? "Er staan nog verwijzingen naar /_next/, /assets/ of /static/ op de root." : "In orde.",
      });
    } else {
      const absolute = /(?:src|href)=["']\/(?!\/)/.test(html);
      checks.push({
        label: "Alleen relatieve paden",
        ok: !absolute,
        detail: absolute ? "Er staan root-relatieve paden (\"/...\") in de HTML." : "In orde.",
      });
    }
    const leaksHost = html.includes(demo.host);
    checks.push({
      label: "Geen absolute URL's naar *.vercel.app",
      ok: !leaksHost,
      detail: leaksHost ? `De HTML verwijst naar ${demo.host}.` : "In orde.",
    });
  }

  return { url: url.href, ok: checks.every((c) => c.ok), checks };
}
