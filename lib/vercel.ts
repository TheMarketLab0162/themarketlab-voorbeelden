import "server-only";
import { DEMO_KEY_PREFIX, demoKey, isDemo, type Demo } from "./demos";

// Server-side access to the Vercel REST API. Used only by the admin (writes,
// consistent reads, ownership checks); the proxy reads through the Global Config SDK.

const API = "https://api.vercel.com";

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Omgevingsvariabele ${name} ontbreekt.`);
  return value;
}

export class VercelApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string | undefined,
    message: string,
  ) {
    super(message);
  }
}

async function vercelFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const url = new URL(path, API);
  url.searchParams.set("teamId", requiredEnv("VERCEL_TEAM_ID"));

  const res = await fetch(url, {
    ...init,
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
    headers: {
      Authorization: `Bearer ${requiredEnv("VERCEL_API_TOKEN")}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: { code?: string; message?: string } } | null;
    throw new VercelApiError(res.status, body?.error?.code, body?.error?.message ?? `Vercel API ${res.status}`);
  }
  return (await res.json()) as T;
}

const store = () => `/v1/global-config/${encodeURIComponent(requiredEnv("GLOBAL_CONFIG_ID"))}`;

export async function listDemos(): Promise<Demo[]> {
  const items = await vercelFetch<{ key: string; value: unknown }[]>(`${store()}/items`);
  return items
    .filter((item) => item.key.startsWith(DEMO_KEY_PREFIX))
    .map((item) => item.value)
    .filter(isDemo)
    .sort((a, b) => a.clientName.localeCompare(b.clientName, "nl"));
}

export async function getDemo(slug: string): Promise<Demo | null> {
  try {
    const item = await vercelFetch<{ value: unknown }>(`${store()}/item/${demoKey(slug)}`);
    return isDemo(item.value) ? item.value : null;
  } catch (error) {
    if (error instanceof VercelApiError && error.status === 404) return null;
    throw error;
  }
}

type Operation = "create" | "update" | "delete";

async function patchDemo(operation: Operation, slug: string, value?: Demo): Promise<void> {
  await vercelFetch(`${store()}/items`, {
    method: "PATCH",
    body: JSON.stringify({ items: [{ operation, key: demoKey(slug), value: value ?? null }] }),
  });
}

/** Fails when the slug already exists, so two demos can never share a slug. */
export const createDemo = (demo: Demo) => patchDemo("create", demo.slug, demo);
export const updateDemo = (demo: Demo) => patchDemo("update", demo.slug, demo);
export const deleteDemo = (slug: string) => patchDemo("delete", slug);

/**
 * Confirms that a *.vercel.app hostname is an alias or deployment of a project in
 * our own team. Without this, anyone's public Vercel deployment could be proxied
 * under voorbeeld.themarketlab.nl.
 */
export async function resolveTeamProject(host: string): Promise<{ projectId: string; projectName: string }> {
  let projectId: string | undefined;

  try {
    const alias = await vercelFetch<{ projectId?: string }>(`/v4/aliases/${encodeURIComponent(host)}`);
    projectId = alias.projectId;
  } catch (error) {
    if (!(error instanceof VercelApiError && error.status === 404)) throw error;
  }

  if (!projectId) {
    try {
      const deployment = await vercelFetch<{ projectId?: string }>(`/v13/deployments/${encodeURIComponent(host)}`);
      projectId = deployment.projectId;
    } catch (error) {
      if (!(error instanceof VercelApiError && (error.status === 404 || error.status === 403))) throw error;
    }
  }

  if (!projectId) throw new Error("Deze URL hoort niet bij een project in het Vercel-team van The MarketLab.");

  // A deployment lookup can return public data for other teams; the project
  // lookup only succeeds for projects that really belong to our team.
  try {
    const project = await vercelFetch<{ id: string; name: string }>(`/v9/projects/${encodeURIComponent(projectId)}`);
    return { projectId: project.id, projectName: project.name };
  } catch (error) {
    if (error instanceof VercelApiError && (error.status === 404 || error.status === 403)) {
      throw new Error("Deze URL hoort niet bij een project in het Vercel-team van The MarketLab.");
    }
    throw error;
  }
}
