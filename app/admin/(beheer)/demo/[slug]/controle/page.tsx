import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { isValidSlug } from "@/lib/demos";
import { checkDemo } from "@/lib/health";
import { getDemo } from "@/lib/vercel";

export default async function CheckDemo({ params }: { params: Promise<{ slug: string }> }) {
  await requireAdmin();
  const { slug } = await params;
  if (!isValidSlug(slug)) notFound();
  const demo = await getDemo(slug);
  if (!demo) notFound();

  const result = await checkDemo(demo);

  return (
    <main>
      <p>
        <Link href={`/admin/demo/${demo.slug}`}>← {demo.clientName}</Link>
      </p>
      <h1>Contractcontrole</h1>
      <p className="muted">
        Opgehaald: <code>{result.url}</code>
      </p>
      <div className="panel">
        <ul>
          {result.checks.map((check) => (
            <li key={check.label}>
              <span className={check.ok ? "check-ok" : "check-fail"}>{check.ok ? "✓" : "✗"}</span>{" "}
              <strong>{check.label}</strong> <span className="muted">— {check.detail}</span>
            </li>
          ))}
        </ul>
        <p>
          {result.ok
            ? "De startpagina voldoet aan de automatische controles. Test subpagina's en formulieren nog handmatig."
            : "Niet alle controles slagen. Zie CONTRACT.md in de repository voor de eisen."}
        </p>
      </div>
    </main>
  );
}
