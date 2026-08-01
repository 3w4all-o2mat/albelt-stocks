import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { NavBar } from "@/components/ui/NavBar";
import { PageBreadcrumb } from "@/components/ui/PageBreadcrumb";

export const metadata: Metadata = {
  title: "Albelt Stocks",
  description: "Gestion des bobines et chutes d'atelier",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body>
        <Providers>
          <div className="min-h-screen flex flex-col">
            <NavBar />
            <PageBreadcrumb />
            <main className="flex-1">{children}</main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
