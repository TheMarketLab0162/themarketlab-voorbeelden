import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "The MarketLab | Voorbeeldwebsites",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl">
      <body>{children}</body>
    </html>
  );
}
