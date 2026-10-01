"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  FolderOpen,
  Package,
  CreditCard,
  CheckCircle,
} from "lucide-react";

const PAIEMENTS = [
  { id: "PAY-001", client: "Traoré Aïcha", product: "iPhone 12", montant: 90000, method: "Orange Money", type: "Acompte + caution", date: "27/09/2026", status: "confirme" },
  { id: "PAY-002", client: "Zongo Ibrahim", product: "iPhone 13", montant: 108000, method: "Moov Money", type: "Acompte + caution", date: "25/09/2026", status: "confirme" },
  { id: "PAY-003", client: "Ouédraogo Jean", product: "iPhone 13", montant: 30000, method: "Wave", type: "Échéance 1", date: "28/09/2026", status: "en_attente" },
];

export default function AdminPaiementsPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (localStorage.getItem("admin") !== "true") {
      router.replace("/admin/login");
      return;
    }
    setReady(true);
  }, [router]);

  if (!ready) return null;

  const formatPrice = (n: number) => n.toLocaleString("fr-FR") + " F";

  const menu = [
    { href: "/admin", label: "Dashboard", icon: <LayoutDashboard className="w-4 h-4" /> },
    { href: "/admin/dossiers", label: "Dossiers", icon: <FolderOpen className="w-4 h-4" /> },
    { href: "/admin/stock", label: "Stock", icon: <Package className="w-4 h-4" /> },
    { href: "/admin/paiements", label: "Paiements", icon: <CreditCard className="w-4 h-4" />, active: true },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-primary-800 text-white">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-lg font-bold">Paiements</h1>
          <p className="text-xs text-primary-200">{PAIEMENTS.length} transaction(s)</p>
        </div>
      </div>

      <div className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto py-2">
            {menu.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap ${
                  item.active ? "bg-primary-50 text-primary-700" : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                {item.icon}
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="divide-y divide-gray-50">
            {PAIEMENTS.map((p) => (
              <div key={p.id} className="px-4 sm:px-5 py-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{p.client}</p>
                  <p className="text-xs text-gray-500">
                    {p.product} • {p.type} • {p.method}
                  </p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{p.id} • {p.date}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-gray-900">{formatPrice(p.montant)}</p>
                  <span className={`text-[10px] font-semibold ${
                    p.status === "confirme" ? "text-green-600" : "text-amber-600"
                  }`}>
                    {p.status === "confirme" ? "Confirmé" : "En attente"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-gray-400 mt-4 text-center">
          Les paiements réels (Orange Money, Moov, Wave) seront reliés ici via API.
        </p>
      </div>
    </div>
  );
}