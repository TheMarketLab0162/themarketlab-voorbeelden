import type { Metadata } from "next";
import { connection } from "next/server";

export const metadata: Metadata = { title: "Demo-beheer | The MarketLab" };

// Always render the admin per request: the CSP nonce is per request and no admin
// page may ever be served from a cache.
export default async function AdminRootLayout({ children }: { children: React.ReactNode }) {
  await connection();
  return <div className="admin">{children}</div>;
}
