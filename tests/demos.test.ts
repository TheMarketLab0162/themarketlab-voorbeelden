import { describe, expect, it } from "vitest";
import { buildUpstreamUrl, isDemo, isValidSlug, parseVercelHost, stripAdminCookies } from "../lib/demos";

describe("isValidSlug", () => {
  it.each(["bakkerij-jansen", "a", "klant1", "a-b-c"])("accepts %s", (slug) => {
    expect(isValidSlug(slug)).toBe(true);
  });

  it.each(["", "-a", "a-", "Hoofdletter", "a_b", "a/b", "a.b", "admin", "_next", "api", "x".repeat(41)])(
    "rejects %j",
    (slug) => {
      expect(isValidSlug(slug)).toBe(false);
    },
  );
});

describe("parseVercelHost", () => {
  it.each([
    ["https://klant-x.vercel.app", "klant-x.vercel.app"],
    ["https://klant-x.vercel.app/", "klant-x.vercel.app"],
    ["klant-x.vercel.app", "klant-x.vercel.app"],
    ["  HTTPS://Klant-X.Vercel.App  ", "klant-x.vercel.app"],
  ])("accepts %j", (input, host) => {
    expect(parseVercelHost(input)).toBe(host);
  });

  it.each([
    "http://klant-x.vercel.app",
    "https://klant-x.vercel.app:8443",
    "https://user:pass@klant-x.vercel.app",
    "https://klant-x.vercel.app/pad",
    "https://klant-x.vercel.app/?q=1",
    "https://vercel.app",
    "https://klant-x.vercel.app.evil.com",
    "https://evil.com/klant-x.vercel.app",
    "https://evil.com#.vercel.app",
    "https://evil.com\\@klant-x.vercel.app",
    "https://169.254.169.254",
    "https://localhost",
    "javascript:alert(1)",
    "file:///etc/passwd",
    "",
  ])("rejects %j", (input) => {
    expect(() => parseVercelHost(input)).toThrow();
  });
});

describe("buildUpstreamUrl", () => {
  const base = { slug: "klant", host: "klant-x.vercel.app", mode: "basePath" as const };
  const root = { ...base, mode: "root-static" as const };

  it("keeps the full path in basePath mode", () => {
    expect(buildUpstreamUrl(base, "/klant/_next/static/a.js", "?v=1").href).toBe(
      "https://klant-x.vercel.app/klant/_next/static/a.js?v=1",
    );
    expect(buildUpstreamUrl(base, "/klant", "").href).toBe("https://klant-x.vercel.app/klant");
  });

  it("strips the slug in root-static mode", () => {
    expect(buildUpstreamUrl(root, "/klant/css/style.css", "").href).toBe("https://klant-x.vercel.app/css/style.css");
    expect(buildUpstreamUrl(root, "/klant/", "").href).toBe("https://klant-x.vercel.app/");
  });

  it("never lets the path change the host", () => {
    for (const path of ["/klant//evil.com", "/klant/@evil.com", "/klant/\\\\evil.com", "/klant/%2F%2Fevil.com"]) {
      expect(buildUpstreamUrl(base, path, "").hostname).toBe("klant-x.vercel.app");
      expect(buildUpstreamUrl(root, path, "").hostname).toBe("klant-x.vercel.app");
    }
  });

  it("rejects paths of another demo and invalid stored hosts", () => {
    expect(() => buildUpstreamUrl(base, "/klantx/a", "")).toThrow();
    expect(() => buildUpstreamUrl({ ...base, host: "evil.com" }, "/klant/", "")).toThrow();
  });
});

describe("stripAdminCookies", () => {
  it("removes Auth.js cookies and keeps the rest", () => {
    expect(
      stripAdminCookies("a=1; __Secure-authjs.session-token=x; authjs.csrf-token=y; __Host-authjs.csrf-token=z; b=2"),
    ).toBe("a=1; b=2");
    expect(stripAdminCookies("__Secure-authjs.session-token=x")).toBeNull();
    expect(stripAdminCookies(null)).toBeNull();
  });
});

describe("isDemo", () => {
  const valid = {
    slug: "klant",
    clientName: "Klant",
    host: "klant-x.vercel.app",
    projectId: "prj_1",
    mode: "basePath",
    enabled: true,
  };

  it("accepts a valid record and rejects tampered ones", () => {
    expect(isDemo(valid)).toBe(true);
    expect(isDemo({ ...valid, host: "10.0.0.1" })).toBe(false);
    expect(isDemo({ ...valid, slug: "admin" })).toBe(false);
    expect(isDemo({ ...valid, mode: "proxy" })).toBe(false);
    expect(isDemo(null)).toBe(false);
  });
});
