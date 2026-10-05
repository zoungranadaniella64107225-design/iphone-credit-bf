"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  FolderOpen,
  Package,
  CreditCard,
  Clock,
  CheckCircle,
  LogOut,
  AlertTriangle,
  ArrowUpRight,
  Smartphone,
  Eye,
  RefreshCw,
  AlertCircle,
  Loader2,
  FileText,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Product = {
  id: string;
  name: string;
  price: number | null;
  storage: string | null;
  color: string | null;
  grade: string | null;
  battery: string | null;
  stock: number | null;
  description: string | null;
  images: string[] | null;
  created_at: string;
};

type DossierMini = {
  id: string;
  reference: string;
  full_name: string;
  product_name: string | null;
  status: string;
  created_at: string;
};

type DashboardStats = {
  totalStock: number;
  totalModels: number;
  lowStockProducts: number;
  dossiersEnAttente: number;
  contratsEnAttente: number;
  pretPaiement: number;
};

type StockAlert = {
  id: string;
  name: string;
  stock: number;
};

function isAdminUser(user: {
  user_metadata?: Record<string, unknown>;
} | null): boolean {
  return user?.user_metadata?.role === "admin";
}

export default function AdminDashboard() {
  const router = useRouter();

  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");

  const [products, setProducts] = useState<Product[]>([]);
  const [recentDossiers, setRecentDossiers] = useState<DossierMini[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalStock: 0,
    totalModels: 0,
    lowStockProducts: 0,
    dossiersEnAttente: 0,
    contratsEnAttente: 0,
    pretPaiement: 0,
  });
  const [stockAlerts, setStockAlerts] = useState<StockAlert[]>([]);
  const [error, setError] = useState("");

  // ========== AUTH ADMIN ==========
  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const supabase = createClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.user || !isAdminUser(session.user)) {
          localStorage.removeItem("admin");
          localStorage.removeItem("adminUser");
          await supabase.auth.signOut().catch(() => {});
          router.replace("/admin/login");
          return;
        }

        setAdminEmail(session.user.email || "Admin");
        localStorage.setItem("admin", "true");
        setReady(true);
      } catch {
        router.replace("/admin/login");
      }
    };

    checkAdmin();
  }, [router]);

  const formatPrice = (value: number) =>
    `${value.toLocaleString("fr-FR")} F`;

  const formatDate = (date: string) =>
    new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date));

  const statusLabel = (s: string) => {
    const map: Record<string, string> = {
      en_attente: "Dossier à valider",
      valide: "Dossier OK",
      refuse: "Refusé",
      contrat_en_attente: "Contrat à valider",
      contrat_refuse: "Contrat refusé",
      pret_paiement: "Prêt paiement",
      paye: "Payé",
      livre: "Livré",
    };
    return map[s] || s;
  };

  const statusBadge = (s: string) => {
    if (s === "en_attente" || s === "contrat_en_attente")
      return "bg-amber-500/20 text-amber-300";
    if (s === "valide" || s === "pret_paiement" || s === "paye")
      return "bg-emerald-500/20 text-emerald-300";
    if (s === "refuse" || s === "contrat_refuse")
      return "bg-red-500/20 text-red-300";
    return "bg-slate-500/20 text-slate-300";
  };

  // ========== LOAD ==========
  const loadDashboard = useCallback(async () => {
    setError("");
    const supabase = createClient();

    try {
      const { data: productsData, error: productsError } = await supabase
        .from("products")
        .select(
          "id, name, price, storage, color, grade, battery, stock, description, images, created_at"
        )
        .order("created_at", { ascending: false });

      if (productsError) throw productsError;

      const productList = (productsData || []) as Product[];
      setProducts(productList);

      const totalStock = productList.reduce(
        (t, p) => t + Number(p.stock || 0),
        0
      );
      const uniqueModels = new Set(
        productList.map((p) => p.name?.trim()).filter(Boolean)
      );
      const alerts = productList
        .filter((p) => Number(p.stock || 0) <= 3)
        .map((p) => ({
          id: p.id,
          name: p.name,
          stock: Number(p.stock || 0),
        }))
        .sort((a, b) => a.stock - b.stock);

      setStockAlerts(alerts);

      // Dossiers
      const { data: dossiersData, error: dossiersError } = await supabase
        .from("dossiers")
        .select("id, reference, full_name, product_name, status, created_at")
        .order("created_at", { ascending: false })
        .limit(50);

      if (dossiersError) {
        console.warn("Dossiers:", dossiersError.message);
      }

      const dossiers = (dossiersData || []) as DossierMini[];
      setRecentDossiers(dossiers.slice(0, 6));

      const dossiersEnAttente = dossiers.filter(
        (d) => d.status === "en_attente"
      ).length;
      const contratsEnAttente = dossiers.filter(
        (d) => d.status === "contrat_en_attente"
      ).length;
      const pretPaiement = dossiers.filter(
        (d) => d.status === "pret_paiement"
      ).length;

      setStats({
        totalStock,
        totalModels: uniqueModels.size,
        lowStockProducts: alerts.length,
        dossiersEnAttente,
        contratsEnAttente,
        pretPaiement,
      });
    } catch (err: unknown) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "Impossible de charger le tableau de bord."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!ready) return;
    loadDashboard();
  }, [ready, loadDashboard]);

  const refreshDashboard = async () => {
    setRefreshing(true);
    await loadDashboard();
  };

  const logout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    localStorage.removeItem("admin");
    localStorage.removeItem("adminUser");
    router.push("/admin/login");
  };

  if (!ready || loading) {
    return (
      <div className="min-h-screen bg-[#0b1120] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
          <p className="text-xs text-slate-500">
            Vérification admin & chargement...
          </p>
        </div>
      </div>
    );
  }

  const menu = [
    {
      href: "/admin",
      label: "Dashboard",
      icon: <LayoutDashboard className="w-4 h-4" />,
      active: true,
    },
    {
      href: "/admin/dossiers",
      label: "Dossiers",
      icon: <FolderOpen className="w-4 h-4" />,
      badge: stats.dossiersEnAttente + stats.contratsEnAttente,
    },
    {
      href: "/admin/stock",
      label: "Stock",
      icon: <Package className="w-4 h-4" />,
    },
    {
      href: "/admin/paiements",
      label: "Paiements",
      icon: <CreditCard className="w-4 h-4" />,
    },
  ];

  const statsCards = [
    {
      label: "Dossiers à valider",
      value: stats.dossiersEnAttente,
      sub: "CNIB / infos client",
      icon: <Clock className="w-5 h-5" />,
      gradient: "from-amber-500 to-orange-500",
      bgIcon: "bg-amber-500/20 text-amber-400",
      href: "/admin/dossiers",
    },
    {
      label: "Contrats à valider",
      value: stats.contratsEnAttente,
      sub: "Photos contrat signé",
      icon: <FileText className="w-5 h-5" />,
      gradient: "from-sky-500 to-blue-600",
      bgIcon: "bg-sky-500/20 text-sky-400",
      href: "/admin/dossiers",
    },
    {
      label: "Stock disponible",
      value: stats.totalStock,
      sub: `${stats.totalModels} modèle(s)`,
      icon: <Package className="w-5 h-5" />,
      gradient: "from-violet-500 to-purple-600",
      bgIcon: "bg-violet-500/20 text-violet-400",
      href: "/admin/stock",
    },
    {
      label: "Alertes stock",
      value: stats.lowStockProducts,
      sub: "≤ 3 unités",
      icon: <AlertTriangle className="w-5 h-5" />,
      gradient: "from-red-500 to-rose-500",
      bgIcon: "bg-red-500/20 text-red-400",
      href: "/admin/stock",
    },
  ];

  return (
    <div className="min-h-screen bg-[#0b1120] text-white">
      {/* HEADER */}
      <header className="border-b border-white/5 bg-[#0f172a]/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center shadow-lg shadow-primary-500/25">
              <Smartphone className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight">
                iPhone Credit BF
              </h1>
              <p className="text-[11px] text-slate-400 truncate max-w-[160px]">
                {adminEmail}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={refreshDashboard}
              disabled={refreshing}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/5"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`}
              />
              <span className="hidden sm:inline">Actualiser</span>
            </button>
            <Link
              href="/"
              className="hidden sm:inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white px-3 py-1.5"
            >
              <Eye className="w-3.5 h-3.5" />
              Site
            </Link>
            <button
              onClick={logout}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-red-400 px-3 py-1.5 rounded-lg hover:bg-red-500/10"
            >
              <LogOut className="w-3.5 h-3.5" />
              Déconnexion
            </button>
          </div>
        </div>
      </header>

      {/* NAV */}
      <nav className="border-b border-white/5 bg-[#0f172a]/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex gap-1 overflow-x-auto py-2">
            {menu.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`relative flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                  item.active
                    ? "bg-primary-500/15 text-primary-300 border border-primary-500/30"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                }`}
              >
                {item.icon}
                {item.label}
                {item.badge && item.badge > 0 ? (
                  <span className="ml-1 bg-amber-500 text-black text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                    {item.badge}
                  </span>
                ) : null}
              </Link>
            ))}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold tracking-tight">Tableau de bord</h2>
          <p className="text-sm text-slate-400 mt-1">
            Stock, dossiers clients et validations en attente.
          </p>
        </div>

        {error && (
          <div className="mb-6 flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-red-300">Erreur</p>
              <p className="text-xs text-red-300/70 mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* STATS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {statsCards.map((stat) => (
            <Link
              key={stat.label}
              href={stat.href}
              className="relative overflow-hidden rounded-2xl bg-[#131c31] border border-white/5 p-5 group hover:border-white/10 transition-all"
            >
              <div
                className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${stat.gradient} opacity-[0.07] rounded-full -translate-y-1/2 translate-x-1/2`}
              />
              <div
                className={`w-10 h-10 rounded-xl ${stat.bgIcon} flex items-center justify-center mb-4`}
              >
                {stat.icon}
              </div>
              <p className="text-2xl font-bold tracking-tight">{stat.value}</p>
              <p className="text-xs text-slate-400 mt-1">{stat.label}</p>
              <p className="text-[10px] text-slate-500 mt-2">{stat.sub}</p>
            </Link>
          ))}
        </div>
<Link
  href="/admin/user"
  className="grid lg:grid-cols-3 gap-6 mb-8"
>
  Utilisateurs
</Link>

        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          {/* DOSSIERS RÉCENTS */}
          <div className="lg:col-span-2 rounded-2xl bg-[#131c31] border border-white/5 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
              <div>
                <h3 className="text-sm font-bold">Dossiers récents</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  À vérifier ou en cours
                </p>
              </div>
              <Link
                href="/admin/dossiers"
                className="text-xs font-semibold text-primary-400 hover:text-primary-300 flex items-center gap-1"
              >
                Tout voir
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {recentDossiers.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <FolderOpen className="w-10 h-10 text-slate-700 mx-auto mb-3" />
                <p className="text-sm font-semibold text-slate-400">
                  Aucun dossier
                </p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {recentDossiers.map((d) => (
                  <Link
                    key={d.id}
                    href={`/admin/dossiers/${d.id}`}
                    className="flex items-center justify-between px-5 py-3.5 hover:bg-white/[0.03] transition"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">
                        {d.full_name}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate">
                        {d.reference} • {d.product_name || "—"} •{" "}
                        {formatDate(d.created_at)}
                      </p>
                    </div>
                    <span
                      className={`text-[10px] font-semibold px-2.5 py-1 rounded-full shrink-0 ml-2 ${statusBadge(
                        d.status
                      )}`}
                    >
                      {statusLabel(d.status)}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* ALERTES STOCK */}
          <div className="rounded-2xl bg-[#131c31] border border-white/5 overflow-hidden">
            <div className="px-5 py-4 border-b border-white/5 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <div>
                <h3 className="text-sm font-bold">Alertes stock</h3>
                <p className="text-[10px] text-slate-500">≤ 3 unités</p>
              </div>
            </div>
            <div className="p-4 space-y-3">
              {stockAlerts.length === 0 ? (
                <div className="py-6 text-center">
                  <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-slate-300">
                    Stock OK
                  </p>
                </div>
              ) : (
                stockAlerts.slice(0, 6).map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between bg-white/[0.03] rounded-xl px-3 py-2.5"
                  >
                    <div>
                      <p className="text-xs font-semibold">{p.name}</p>
                      <p className="text-[10px] text-slate-500">
                        {p.stock === 0 ? "Épuisé" : "Faible"}
                      </p>
                    </div>
                    <span
                      className={`text-sm font-bold ${
                        p.stock === 0 ? "text-red-400" : "text-amber-400"
                      }`}
                    >
                      {p.stock}
                    </span>
                  </div>
                ))
              )}
              <Link
                href="/admin/stock"
                className="block text-center text-xs font-semibold text-primary-400 pt-2"
              >
                Gérer le stock →
              </Link>
            </div>
          </div>
        </div>

        {/* PRODUITS + ACTIONS */}
        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          <div className="rounded-2xl bg-[#131c31] border border-white/5 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
              <h3 className="text-sm font-bold">Derniers produits</h3>
              <Link
                href="/admin/stock"
                className="text-xs font-semibold text-primary-400"
              >
                Stock →
              </Link>
            </div>
            {products.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-slate-500">
                Aucun produit
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {products.slice(0, 4).map((product) => (
                  <div
                    key={product.id}
                    className="flex items-center gap-3 px-5 py-3"
                  >
                    <div className="w-10 h-10 rounded-xl bg-[#0b1120] overflow-hidden flex items-center justify-center shrink-0">
                      {product.images?.[0] ? (
                        <img
                          src={product.images[0]}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Smartphone className="w-5 h-5 text-slate-600" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold truncate">
                        {product.name}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {product.storage} • {formatPrice(Number(product.price || 0))}
                      </p>
                    </div>
                    <span
                      className={`text-[10px] font-bold ${
                        Number(product.stock || 0) === 0
                          ? "text-red-400"
                          : Number(product.stock || 0) <= 3
                          ? "text-amber-400"
                          : "text-emerald-400"
                      }`}
                    >
                      {Number(product.stock || 0)} u.
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl bg-[#131c31] border border-white/5 p-5">
            <p className="text-xs font-bold text-slate-400 mb-4">
              Actions rapides
            </p>
            <div className="space-y-3">
              <Link
                href="/admin/dossiers"
                className="flex items-center gap-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 px-4 py-3"
              >
                <FolderOpen className="w-5 h-5 text-primary-400" />
                <div>
                  <p className="text-sm font-semibold">Valider les dossiers</p>
                  <p className="text-[10px] text-slate-500">
                    {stats.dossiersEnAttente} dossier(s) +{" "}
                    {stats.contratsEnAttente} contrat(s)
                  </p>
                </div>
              </Link>
              <Link
                href="/admin/stock"
                className="flex items-center gap-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 px-4 py-3"
              >
                <Package className="w-5 h-5 text-violet-400" />
                <div>
                  <p className="text-sm font-semibold">Gérer le stock</p>
                  <p className="text-[10px] text-slate-500">
                    {stats.totalStock} unité(s)
                  </p>
                </div>
              </Link>
              <Link
                href="/admin/paiements"
                className="flex items-center gap-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 px-4 py-3"
              >
                <CreditCard className="w-5 h-5 text-sky-400" />
                <div>
                  <p className="text-sm font-semibold">Paiements</p>
                  <p className="text-[10px] text-slate-500">
                    {stats.pretPaiement} prêt(s) à payer
                  </p>
                </div>
              </Link>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-gradient-to-r from-primary-600/20 via-primary-500/10 to-transparent border border-primary-500/20 p-5">
          <p className="text-sm font-bold">État système</p>
          <p className="text-xs text-slate-400 mt-1">
            {products.length} produit(s) • {stats.totalStock} en stock •{" "}
            {stats.dossiersEnAttente + stats.contratsEnAttente} validation(s) en
            attente
          </p>
        </div>
      </main>
    </div>
  );
}