"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { signIn, signOut } from "@/auth";
import { RECENT_AUTH_MS, requireAdmin } from "@/lib/admin";
import { isValidBypassSecret, isValidSlug, parseVercelHost, type Demo } from "@/lib/demos";
import * as vercel from "@/lib/vercel";

export interface FormState {
  error?: string;
}

const demoInput = z.object({
  intent: z.enum(["create", "update"]),
  clientName: z.string().trim().min(1, "Vul een klantnaam in.").max(100, "Klantnaam is te lang."),
  slug: z.string().trim().toLowerCase().refine(isValidSlug, {
    message: "Slug: 1–40 tekens, alleen a-z, 0-9 en '-', niet beginnen of eindigen met '-', geen gereserveerd woord.",
  }),
  url: z.string().max(300),
  mode: z.enum(["basePath", "root-static"]),
  enabled: z.boolean(),
  bypassSecret: z
    .string()
    .trim()
    .refine((s) => s === "" || isValidBypassSecret(s), { message: "Het bypass-geheim heeft een ongeldig formaat." }),
  clearBypassSecret: z.boolean(),
});

export async function saveDemo(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();

  const parsed = demoInput.safeParse({
    intent: formData.get("intent"),
    clientName: formData.get("clientName") ?? "",
    slug: formData.get("slug") ?? "",
    url: formData.get("url") ?? "",
    mode: formData.get("mode"),
    enabled: formData.get("enabled") === "on",
    bypassSecret: formData.get("bypassSecret") ?? "",
    clearBypassSecret: formData.get("clearBypassSecret") === "on",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Ongeldige invoer." };
  const input = parsed.data;

  let host: string;
  try {
    host = parseVercelHost(input.url);
  } catch (error) {
    return { error: (error as Error).message };
  }

  try {
    const { projectId } = await vercel.resolveTeamProject(host);
    const now = new Date().toISOString();

    if (input.intent === "create") {
      await vercel.createDemo({
        slug: input.slug,
        clientName: input.clientName,
        host,
        projectId,
        mode: input.mode,
        enabled: input.enabled,
        ...(input.bypassSecret ? { bypassSecret: input.bypassSecret } : {}),
        createdAt: now,
        updatedAt: now,
        updatedBy: admin.login,
      });
    } else {
      const existing = await vercel.getDemo(input.slug);
      if (!existing) return { error: "Deze demo bestaat niet meer." };
      const bypassSecret = input.clearBypassSecret ? undefined : input.bypassSecret || existing.bypassSecret;
      const next: Demo = {
        ...existing,
        clientName: input.clientName,
        host,
        projectId,
        mode: input.mode,
        enabled: input.enabled,
        updatedAt: now,
        updatedBy: admin.login,
      };
      if (bypassSecret) next.bypassSecret = bypassSecret;
      else delete next.bypassSecret;
      await vercel.updateDemo(next);
    }
  } catch (error) {
    if (error instanceof vercel.VercelApiError) {
      if (input.intent === "create" && (error.status === 409 || error.status === 400)) {
        return { error: `Opslaan mislukt. Bestaat de slug "${input.slug}" al? (${error.message})` };
      }
      console.error("Vercel API error", error.status, error.code, error.message);
      return { error: "De Vercel API gaf een fout. Probeer het opnieuw." };
    }
    return { error: (error as Error).message };
  }

  revalidatePath("/admin");
  redirect(`/admin?opgeslagen=${encodeURIComponent(input.slug)}`);
}

function slugFrom(formData: FormData): string {
  const slug = String(formData.get("slug") ?? "");
  if (!isValidSlug(slug)) throw new Error("Ongeldige slug.");
  return slug;
}

export async function setDemoEnabled(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const slug = slugFrom(formData);
  const existing = await vercel.getDemo(slug);
  if (!existing) redirect("/admin");

  await vercel.updateDemo({
    ...existing,
    enabled: formData.get("enabled") === "true",
    updatedAt: new Date().toISOString(),
    updatedBy: admin.login,
  });
  revalidatePath("/admin");
  redirect(`/admin/demo/${slug}`);
}

export async function removeDemo(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const slug = slugFrom(formData);

  if (String(formData.get("confirm") ?? "").trim() !== slug) {
    return { error: `Typ "${slug}" om het verwijderen te bevestigen.` };
  }
  if (Date.now() - admin.authTime > RECENT_AUTH_MS) {
    return { error: "Log voor de zekerheid opnieuw in (maximaal 15 minuten geleden) en probeer het daarna nog eens." };
  }

  try {
    await vercel.deleteDemo(slug);
  } catch (error) {
    console.error("Delete failed", error);
    return { error: "Verwijderen mislukt. Probeer het opnieuw." };
  }

  revalidatePath("/admin");
  redirect(`/admin?verwijderd=${encodeURIComponent(slug)}`);
}

export async function login(): Promise<void> {
  await signIn("github", { redirectTo: "/admin" });
}

export async function relogin(): Promise<void> {
  await signOut({ redirect: false });
  await signIn("github", { redirectTo: "/admin" });
}

export async function logout(): Promise<void> {
  await signOut({ redirectTo: "/admin/login" });
}
