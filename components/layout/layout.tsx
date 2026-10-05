import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import VisitTracker from "@/components/VisitTracker";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "iPhone Credit BF – iPhone reconditionnés à crédit au Burkina Faso",
  description:
    "Achetez votre iPhone reconditionné américain à crédit au Burkina Faso. Paiement en plusieurs fois, transparent et sécurisé.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body
        className={`${inter.className} bg-white text-gray-900 antialiased`}
      >
        <VisitTracker />
        <div className="min-h-screen flex flex-col">
          <Header />
          <main className="flex-grow">{children}</main>
          <Footer />
        </div>
      </body>
    </html>
  );
}