import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { isValidSlug } from "@/lib/demos";
import { listDemos } from "@/lib/vercel";

export default async function DemoList({
  searchParams,
}: {
  searchParams: Promise<{ opgeslagen?: string; verwijderd?: string }>;
}) {
  await requireAdmin();
  const { opgeslagen, verwijderd } = await searchParams;
  const demos = await listDemos();

  return (
    <main>
      {opgeslagen && isValidSlug(opgeslagen) && (
        <p className="notice">
          Demo <code>/{opgeslagen}</code> is opgeslagen. Wijzigingen zijn binnen enkele seconden live.
        </p>
      )}
      {verwijderd && isValidSlug(verwijderd) && (
        <p className="notice">
          Demo <code>/{verwijderd}</code> is verwijderd.
        </p>
      )}

      <div className="row" style={{ justifyContent: "space-between", marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>Klantdemo's</h1>
        <Link href="/admin/nieuw" className="button">
          Nieuwe demo
        </Link>
      </div>

      <div className="panel table-wrap">
        {demos.length === 0 ? (
          <p className="muted">Er zijn nog geen demo's.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Klant</th>
                <th>Adres</th>
                <th>Vercel-host</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {demos.map((demo) => (
                <tr key={demo.slug}>
                  <td>
                    <Link href={`/admin/demo/${demo.slug}`}>{demo.clientName}</Link>
                  </td>
                  <td>
                    <a href={`/${demo.slug}${demo.mode === "root-static" ? "/" : ""}`} target="_blank" rel="noopener">
                      /{demo.slug}
                    </a>
                  </td>
                  <td className="muted">{demo.host}</td>
                  <td>
                    <span className={`badge ${demo.enabled ? "on" : "off"}`}>
                      {demo.enabled ? "Actief" : "Uitgeschakeld"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}
