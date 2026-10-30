import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";

// Admin login via GitHub. Only GitHub user IDs listed in ADMIN_GITHUB_IDS get in.
// All Auth.js routes and cookies live under /admin, so the session cookie is never
// sent along with requests to the proxied client demos.

export const ADMIN_BASE = "/admin";
const SESSION_HOURS = 8;

export function allowedGithubIds(): Set<string> {
  return new Set(
    (process.env.ADMIN_GITHUB_IDS ?? "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean),
  );
}

const secure = process.env.NODE_ENV === "production";

// SameSite=Lax (not Strict): the OAuth callback is a cross-site navigation from
// github.com and needs the state/PKCE cookies. Server actions are additionally
// protected by Next.js' Origin check.
function adminCookie(name: string) {
  return {
    name: `${secure ? "__Secure-" : ""}authjs.${name}`,
    options: { httpOnly: true, sameSite: "lax" as const, path: ADMIN_BASE, secure },
  };
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  basePath: `${ADMIN_BASE}/api/auth`,
  trustHost: true,
  providers: [GitHub],
  session: { strategy: "jwt", maxAge: SESSION_HOURS * 60 * 60 },
  pages: { signIn: `${ADMIN_BASE}/login`, error: `${ADMIN_BASE}/login` },
  cookies: {
    sessionToken: adminCookie("session-token"),
    callbackUrl: adminCookie("callback-url"),
    csrfToken: adminCookie("csrf-token"),
    pkceCodeVerifier: adminCookie("pkce.code_verifier"),
    state: adminCookie("state"),
    nonce: adminCookie("nonce"),
  },
  callbacks: {
    signIn({ account, profile }) {
      return account?.provider === "github" && profile?.id != null && allowedGithubIds().has(String(profile.id));
    },
    jwt({ token, profile }) {
      if (profile) {
        token.githubId = String(profile.id);
        token.login = typeof profile.login === "string" ? profile.login : undefined;
        token.authTime = Date.now();
      }
      return token;
    },
    session({ session, token }) {
      return {
        ...session,
        githubId: typeof token.githubId === "string" ? token.githubId : undefined,
        login: typeof token.login === "string" ? token.login : undefined,
        authTime: typeof token.authTime === "number" ? token.authTime : 0,
      };
    },
    redirect({ url, baseUrl }) {
      // Only ever redirect back into the admin on this origin.
      const target = new URL(url, baseUrl);
      return target.origin === baseUrl && (target.pathname === ADMIN_BASE || target.pathname.startsWith(`${ADMIN_BASE}/`))
        ? target.href
        : `${baseUrl}${ADMIN_BASE}`;
    },
  },
});
