import "server-only";
import { redirect } from "next/navigation";
import { allowedGithubIds, auth } from "@/auth";

export interface Admin {
  githubId: string;
  login: string;
  authTime: number;
}

interface AdminSession {
  githubId?: string;
  login?: string;
  authTime?: number;
}

/** Recent login required for destructive actions such as deleting a demo. */
export const RECENT_AUTH_MS = 15 * 60 * 1000;

/**
 * Must be called by every admin page and every server action. Proxy-level checks
 * alone are not enough: authorization is enforced where the data is touched.
 */
export async function requireAdmin(): Promise<Admin> {
  const session = (await auth()) as AdminSession | null;
  const githubId = session?.githubId;
  if (!githubId || !allowedGithubIds().has(githubId)) redirect("/admin/login");
  return { githubId, login: session.login ?? githubId, authTime: session.authTime ?? 0 };
}
