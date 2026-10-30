import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { isValidSlug } from "@/lib/demos";
import { getDemo } from "@/lib/vercel";
import { setDemoEnabled } from "../../../actions";
import { DeleteForm } from "../../../delete-form";
import { DemoForm } from "../../../demo-form";

export default async function EditDemo({ params }: { params: Promise<{ slug: string }> }) {
  await requireAdmin();
  const { slug } = await params;
  if (!isValidSlug(slug)) notFound();
  const demo = await getDemo(slug);
  if (!demo) notFound();

  return (
    <main>
      <h1>{demo.clientName}</h1>
      <p className="muted">
        Laatst gewijzigd {new Date(demo.updatedAt).toLocaleString("nl-NL", { timeZone: "Europe/Amsterdam" })} door{" "}
        {demo.updatedBy}
      </p>

      <div className="panel row">
        <span className={`badge ${demo.enabled ? "on" : "off"}`}>{demo.enabled ? "Actief" : "Uitgeschakeld"}</span>
        <form action={setDemoEnabled}>
          <input type="hidden" name="slug" value={demo.slug} />
          <input type="hidden" name="enabled" value={demo.enabled ? "false" : "true"} />
          <button type="submit" className="secondary">
            {demo.enabled ? "Uitschakelen" : "Inschakelen"}
          </button>
        </form>
        <Link href={`/admin/demo/${demo.slug}/controle`} className="button secondary">
          Contract controleren
        </Link>
        <a href={`/${demo.slug}${demo.mode === "root-static" ? "/" : ""}`} target="_blank" rel="noopener">
          Bekijk demo ↗
        </a>
      </div>

      <div className="panel">
        <h2>Gegevens</h2>
        <DemoForm
          demo={{
            slug: demo.slug,
            clientName: demo.clientName,
            url: `https://${demo.host}`,
            mode: demo.mode,
            enabled: demo.enabled,
            hasBypassSecret: Boolean(demo.bypassSecret),
          }}
        />
      </div>

      <div className="panel">
        <h2>Verwijderen</h2>
        <p className="muted">
          Verwijdert de configuratie definitief. De klantwebsite op Vercel zelf blijft bestaan. Wil je de demo alleen
          tijdelijk offline halen, gebruik dan &quot;Uitschakelen&quot;.
        </p>
        <DeleteForm slug={demo.slug} />
      </div>
    </main>
  );
}
