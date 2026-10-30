import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { logout } from "../actions";

export default async function BeheerLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  return (
    <>
      <header>
        <Link href="/admin" style={{ color: "inherit", textDecoration: "none" }}>
          <strong>The MarketLab · Demo-beheer</strong>
        </Link>
        <nav>
          <span className="muted">{admin.login}</span>
          <form action={logout}>
            <button type="submit" className="secondary">
              Uitloggen
            </button>
          </form>
        </nav>
      </header>
      {children}
    </>
  );
}
