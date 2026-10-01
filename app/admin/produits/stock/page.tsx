"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  FolderOpen,
  Package,
  CreditCard,
  Plus,
  Minus,
  RefreshCw,
  Smartphone,
  AlertTriangle,
  CheckCircle,
  Search,
  LogOut,
  ArrowLeft,
  Loader2,
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
  updated_at?: string | null;
};

export default function AdminStockPage() {
  const router = useRouter();
  const supabase = createClient();

  const [ready, setReady] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  // =========================================================
  // AUTH ADMIN
  // =========================================================

  useEffect(() => {
    const admin = localStorage.getItem("admin");

    if (admin !== "true") {
      router.replace("/admin/login");
      return;
    }

    setReady(true);
  }, [router]);

  // =========================================================
  // RÉCUPÉRATION DES PRODUITS
  // =========================================================

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      /*
       * IMPORTANT
       * -------------------------------------------------------
       * La page "Ajouter un produit" utilise la table :
       *
       * products
       *
       * On utilise donc la même table ici.
       */

      const { data, error: productsError } = await supabase
        .from("products")
        .select(`
          id,
          name,
          price,
          storage,
          color,
          grade,
          battery,
          stock,
          description,
          images,
          created_at,
          updated_at
        `)
        .order("created_at", {
          ascending: false,
        });

      if (productsError) {
        console.error("Erreur récupération produits :", productsError);

        setError(
          productsError.message ||
            "Impossible de charger les produits."
        );

        return;
      }

      setProducts((data || []) as Product[]);
    } catch (err) {
      console.error("Erreur stock :", err);

      setError(
        "Une erreur est survenue pendant le chargement des produits."
      );
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  // =========================================================
  // INITIAL LOAD
  // =========================================================

  useEffect(() => {
    if (!ready) return;

    fetchProducts();
  }, [ready, fetchProducts]);

  // =========================================================
  // MODIFICATION DU STOCK
  // =========================================================

  const updateStock = async (
    product: Product,
    delta: number
  ) => {
    if (updatingId === product.id) return;

    const currentStock = Number(product.stock || 0);

    const newStock = Math.max(
      0,
      currentStock + delta
    );

    setUpdatingId(product.id);
    setError("");

    try {
      const { data, error: updateError } = await supabase
        .from("products")
        .update({
          stock: newStock,
          updated_at: new Date().toISOString(),
        })
        .eq("id", product.id)
        .select(`
          id,
          name,
          price,
          storage,
          color,
          grade,
          battery,
          stock,
          description,
          images,
          created_at,
          updated_at
        `)
        .single();

      if (updateError) {
        console.error(
          "Erreur modification stock :",
          updateError
        );

        setError(
          updateError.message ||
            "Impossible de modifier le stock."
        );

        return;
      }

      if (!data) {
        setError(
          "La modification du stock n'a retourné aucune donnée."
        );

        return;
      }

      setProducts((currentProducts) =>
        currentProducts.map((item) =>
          item.id === product.id
            ? {
                ...item,
                stock: data.stock,
                updated_at: data.updated_at,
              }
            : item
        )
      );
    } catch (err) {
      console.error(
        "Erreur modification stock :",
        err
      );

      setError(
        "Une erreur est survenue lors de la modification du stock."
      );
    } finally {
      setUpdatingId(null);
    }
  };

  // =========================================================
  // RECHERCHE
  // =========================================================

  const filteredProducts = useMemo(() => {
    const value = search.trim().toLowerCase();

    if (!value) {
      return products;
    }

    return products.filter((product) => {
      const name = product.name?.toLowerCase() || "";
      const storage =
        product.storage?.toLowerCase() || "";
      const color =
        product.color?.toLowerCase() || "";
      const grade =
        product.grade?.toLowerCase() || "";

      return (
        name.includes(value) ||
        storage.includes(value) ||
        color.includes(value) ||
        grade.includes(value)
      );
    });
  }, [products, search]);

  // =========================================================
  // STATISTIQUES
  // =========================================================

  const totalStock = products.reduce(
    (total, product) =>
      total + Number(product.stock || 0),
    0
  );

  const lowStock = products.filter((product) => {
    const stock = Number(product.stock || 0);

    return stock > 0 && stock <= 3;
  }).length;

  const outOfStock = products.filter((product) => {
    return Number(product.stock || 0) === 0;
  }).length;

  // =========================================================
  // FORMAT PRIX
  // =========================================================

  const formatPrice = (price: number | null) => {
    return `${Number(price || 0).toLocaleString("fr-FR")} F`;
  };

  // =========================================================
  // FORMAT BATTERIE
  // =========================================================

  const formatBattery = (battery: string | null) => {
    if (!battery) {
      return "--";
    }

    return `${battery.replace("%", "").trim()}%`;
  };

  // =========================================================
  // ÉTAT DU STOCK
  // =========================================================

  const getStockStatus = (stock: number | null) => {
    const value = Number(stock || 0);

    if (value === 0) {
      return {
        label: "Rupture",
        color:
          "bg-red-500/15 text-red-400 border-red-500/30",
        number: "text-red-400",
      };
    }

    if (value <= 3) {
      return {
        label: "Stock faible",
        color:
          "bg-amber-500/15 text-amber-400 border-amber-500/30",
        number: "text-amber-400",
      };
    }

    return {
      label: "Disponible",
      color:
        "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
      number: "text-emerald-400",
    };
  };

  // =========================================================
  // LOGOUT
  // =========================================================

  const logout = () => {
    localStorage.removeItem("admin");
    router.push("/admin/login");
  };

  // =========================================================
  // MENU ADMIN
  // =========================================================

  const menu = [
    {
      href: "/admin",
      label: "Dashboard",
      icon: (
        <LayoutDashboard className="w-4 h-4" />
      ),
    },
    {
      href: "/admin/dossiers",
      label: "Dossiers",
      icon: (
        <FolderOpen className="w-4 h-4" />
      ),
    },
    {
      href: "/admin/produits/stock",
      label: "Stock",
      icon: (
        <Package className="w-4 h-4" />
      ),
      active: true,
    },
    {
      href: "/admin/paiements",
      label: "Paiements",
      icon: (
        <CreditCard className="w-4 h-4" />
      ),
    },
  ];

  // =========================================================
  // LOADING AUTH
  // =========================================================

  if (!ready) {
    return (
      <div className="min-h-screen bg-[#0b1120] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />

          <p className="text-xs text-slate-500">
            Vérification de la session...
          </p>
        </div>
      </div>
    );
  }

  // =========================================================
  // PAGE
  // =========================================================

  return (
    <div className="min-h-screen bg-[#0b1120] text-white">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <header className="border-b border-white/5 bg-[#0f172a]/90 backdrop-blur-xl sticky top-0 z-50">

        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">

          <div className="flex items-center justify-between gap-4">

            <div className="flex items-center gap-3">

              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
                <Package className="w-5 h-5 text-white" />
              </div>

              <div>
                <h1 className="text-base font-bold">
                  Gestion du stock
                </h1>

                <p className="text-[11px] text-slate-400">
                  Produits et quantités disponibles
                </p>
              </div>

            </div>

            <div className="flex items-center gap-2">

              <Link
                href="/admin"
                className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs text-slate-400 hover:text-white hover:bg-white/5 transition"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Dashboard
              </Link>

              <button
                type="button"
                onClick={fetchProducts}
                disabled={loading}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-xs text-slate-300 transition-all disabled:opacity-50"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${
                    loading
                      ? "animate-spin"
                      : ""
                  }`}
                />

                Actualiser
              </button>

              <button
                type="button"
                onClick={logout}
                className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400 hover:text-red-400 transition-colors px-3 py-2 rounded-xl hover:bg-red-500/10"
              >
                <LogOut className="w-3.5 h-3.5" />

                Déconnexion
              </button>

            </div>

          </div>

        </div>

      </header>

      {/* =====================================================
          NAVIGATION
      ===================================================== */}

      <nav className="border-b border-white/5 bg-[#0f172a]/50">

        <div className="max-w-7xl mx-auto px-4 sm:px-6">

          <div className="flex gap-1 overflow-x-auto py-2">

            {menu.map((item) => (

              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                  item.active
                    ? "bg-primary-500/15 text-primary-300 border border-primary-500/30"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                }`}
              >
                {item.icon}
                {item.label}
              </Link>

            ))}

          </div>

        </div>

      </nav>

      {/* =====================================================
          CONTENT
      ===================================================== */}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">

        {/* ===================================================
            TITRE
        =================================================== */}

        <div className="mb-7">

          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">

            <div>

              <h2 className="text-2xl font-bold tracking-tight">
                Stock des téléphones
              </h2>

              <p className="text-sm text-slate-400 mt-1">
                Gérez les quantités disponibles directement
                depuis votre base de données.
              </p>

            </div>

            <Link
              href="/admin/produits/nouveau"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary-600 hover:bg-primary-500 px-4 py-2.5 text-xs font-semibold transition"
            >
              <Plus className="w-4 h-4" />
              Ajouter un produit
            </Link>

          </div>

        </div>

        {/* ===================================================
            STATISTIQUES
        =================================================== */}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-7">

          {/* TOTAL */}

          <div className="relative overflow-hidden rounded-2xl bg-[#131c31] border border-white/5 p-5">

            <div className="w-10 h-10 rounded-xl bg-violet-500/15 text-violet-400 flex items-center justify-center mb-4">
              <Package className="w-5 h-5" />
            </div>

            <p className="text-2xl font-bold">
              {totalStock.toLocaleString("fr-FR")}
            </p>

            <p className="text-xs text-slate-400 mt-1">
              Unités disponibles
            </p>

            <p className="text-[10px] text-slate-500 mt-2">
              {products.length} produit
              {products.length > 1 ? "s" : ""}
            </p>

          </div>

          {/* STOCK FAIBLE */}

          <div className="relative overflow-hidden rounded-2xl bg-[#131c31] border border-white/5 p-5">

            <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center mb-4">
              <AlertTriangle className="w-5 h-5" />
            </div>

            <p className="text-2xl font-bold">
              {lowStock}
            </p>

            <p className="text-xs text-slate-400 mt-1">
              Stocks faibles
            </p>

            <p className="text-[10px] text-slate-500 mt-2">
              3 unités ou moins
            </p>

          </div>

          {/* RUPTURE */}

          <div className="relative overflow-hidden rounded-2xl bg-[#131c31] border border-white/5 p-5">

            <div className="w-10 h-10 rounded-xl bg-red-500/15 text-red-400 flex items-center justify-center mb-4">
              <AlertTriangle className="w-5 h-5" />
            </div>

            <p className="text-2xl font-bold">
              {outOfStock}
            </p>

            <p className="text-xs text-slate-400 mt-1">
              Produits en rupture
            </p>

            <p className="text-[10px] text-slate-500 mt-2">
              Stock égal à 0
            </p>

          </div>

        </div>

        {/* ===================================================
            RECHERCHE
        =================================================== */}

        <div className="mb-5">

          <div className="relative max-w-md">

            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />

            <input
              type="text"
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
              placeholder="Rechercher un téléphone..."
              className="w-full bg-[#131c31] border border-white/5 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none focus:border-primary-500/50 transition-all"
            />

          </div>

        </div>

        {/* ===================================================
            ERREUR
        =================================================== */}

        {error && (

          <div className="mb-5 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">

            <div className="flex items-center gap-3">

              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />

              <p className="text-sm text-red-400">
                {error}
              </p>

            </div>

          </div>

        )}

        {/* ===================================================
            CHARGEMENT
        =================================================== */}

        {loading ? (

          <div className="rounded-2xl bg-[#131c31] border border-white/5 py-16 flex flex-col items-center justify-center">

            <Loader2 className="w-8 h-8 text-primary-400 animate-spin mb-4" />

            <p className="text-sm text-slate-400">
              Chargement des produits...
            </p>

          </div>

        ) : filteredProducts.length === 0 ? (

          /* =================================================
             AUCUN PRODUIT
          ================================================= */

          <div className="rounded-2xl bg-[#131c31] border border-white/5 py-16 text-center">

            <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">

              <Smartphone className="w-7 h-7 text-slate-500" />

            </div>

            <h3 className="text-sm font-bold">
              Aucun produit trouvé
            </h3>

            <p className="text-xs text-slate-500 mt-1">
              {search
                ? "Aucun produit ne correspond à votre recherche."
                : "Ajoutez d'abord des produits depuis votre espace produit."}
            </p>

            {!search && (

              <Link
                href="/admin/produits/nouveau"
                className="inline-flex items-center gap-2 mt-5 rounded-xl bg-primary-600 hover:bg-primary-500 px-4 py-2.5 text-xs font-semibold transition"
              >
                <Plus className="w-4 h-4" />
                Ajouter un produit
              </Link>

            )}

          </div>

        ) : (

          /* =================================================
             PRODUITS
          ================================================= */

          <div className="space-y-3">

            {filteredProducts.map((product) => {

              const status = getStockStatus(
                product.stock
              );

              const stock = Number(
                product.stock || 0
              );

              const isUpdating =
                updatingId === product.id;

              return (

                <div
                  key={product.id}
                  className="bg-[#131c31] border border-white/5 rounded-2xl p-4 sm:p-5 hover:border-white/10 transition-all"
                >

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">

                    {/* =================================================
                        PRODUIT
                    ================================================= */}

                    <div className="flex items-center gap-4 min-w-0">

                      {/* IMAGE */}

                      <Link
                        href={`/admin/produits/nouveau/${product.id}`}
                        className="w-16 h-16 rounded-xl bg-white/5 overflow-hidden shrink-0 flex items-center justify-center hover:ring-2 hover:ring-primary-500/40 transition"
                      >

                        {product.images?.[0] ? (

                          <img
                            src={product.images[0]}
                            alt={product.name}
                            className="w-full h-full object-cover"
                          />

                        ) : (

                          <Smartphone className="w-7 h-7 text-slate-600" />

                        )}

                      </Link>

                      <div className="min-w-0">

                        <div className="flex items-center gap-2 flex-wrap">

                          <Link
                            href={`/admin/produits/nouveau/${product.id}`}
                            className="text-sm font-bold text-white hover:text-primary-300 transition"
                          >
                            {product.name}
                          </Link>

                          <span
                            className={`text-[9px] font-semibold px-2 py-1 rounded-full border ${status.color}`}
                          >
                            {status.label}
                          </span>

                        </div>

                        <p className="text-xs text-slate-400 mt-1">

                          {product.storage ||
                            "Stockage non renseigné"}

                          {" • "}

                          {product.color ||
                            "Couleur non renseignée"}

                        </p>

                        <div className="flex items-center gap-2 mt-2 flex-wrap">

                          <span className="text-xs text-primary-300 font-semibold">
                            {formatPrice(
                              product.price
                            )}
                          </span>

                          <span className="text-slate-600">
                            •
                          </span>

                          <span className="text-[11px] text-slate-500">
                            {product.grade ||
                              "Grade non renseigné"}
                          </span>

                          <span className="text-slate-600">
                            •
                          </span>

                          <span className="text-[11px] text-slate-500">
                            Batterie{" "}
                            {formatBattery(
                              product.battery
                            )}
                          </span>

                        </div>

                      </div>

                    </div>

                    {/* =================================================
                        STOCK
                    ================================================= */}

                    <div className="flex items-center justify-between sm:justify-end gap-4">

                      <div className="text-right">

                        <p className="text-[10px] text-slate-500 uppercase tracking-wider">
                          Stock
                        </p>

                        <p
                          className={`text-2xl font-bold ${status.number}`}
                        >
                          {stock}
                        </p>

                      </div>

                      {/* CONTROLES */}

                      <div className="flex items-center gap-2">

                        <button
                          type="button"
                          onClick={() =>
                            updateStock(
                              product,
                              -1
                            )
                          }
                          disabled={
                            stock === 0 ||
                            isUpdating
                          }
                          className="w-10 h-10 rounded-xl bg-white/5 border border-white/5 hover:bg-red-500/10 hover:border-red-500/20 hover:text-red-400 flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                          aria-label={`Retirer une unité de ${product.name}`}
                        >
                          <Minus className="w-4 h-4" />
                        </button>

                        <div className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-center">

                          {isUpdating ? (

                            <Loader2 className="w-4 h-4 text-primary-400 animate-spin" />

                          ) : (

                            <span className="text-sm font-bold">
                              {stock}
                            </span>

                          )}

                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            updateStock(
                              product,
                              1
                            )
                          }
                          disabled={isUpdating}
                          className="w-10 h-10 rounded-xl bg-primary-500/10 border border-primary-500/20 text-primary-300 hover:bg-primary-500/20 hover:border-primary-500/30 flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                          aria-label={`Ajouter une unité à ${product.name}`}
                        >
                          <Plus className="w-4 h-4" />
                        </button>

                      </div>

                    </div>

                  </div>

                  {/* =================================================
                      INFO
                  ================================================= */}

                  <div className="mt-4 pt-3 border-t border-white/5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">

                    <div className="flex items-center gap-1.5 text-[10px] text-slate-500">

                      {stock > 0 ? (

                        <>
                          <CheckCircle className="w-3 h-3 text-emerald-400" />

                          <span>
                            Disponible à la vente
                          </span>
                        </>

                      ) : (

                        <>
                          <AlertTriangle className="w-3 h-3 text-red-400" />

                          <span>
                            Non disponible à la vente
                          </span>
                        </>

                      )}

                    </div>

                    <div className="flex items-center gap-3">

                      <Link
                        href={`/admin/produits/nouveau/${product.id}`}
                        className="text-[10px] text-primary-400 hover:text-primary-300 transition"
                      >
                        Modifier le produit
                      </Link>

                      <span className="text-[10px] text-slate-600">
                        ID #{product.id}
                      </span>

                    </div>

                  </div>

                </div>

              );

            })}

          </div>

        )}

        {/* ===================================================
            FOOTER INFO
        =================================================== */}

        <div className="mt-6 rounded-2xl bg-primary-500/5 border border-primary-500/10 px-4 py-3">

          <p className="text-[11px] text-slate-500 text-center">

            Les modifications du stock sont enregistrées
            directement dans Supabase et sont immédiatement
            disponibles sur le catalogue client.

          </p>

        </div>

      </main>

    </div>
  );
}
