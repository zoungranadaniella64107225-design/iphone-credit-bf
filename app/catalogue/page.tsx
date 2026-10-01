"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import {
  Search,
  Smartphone,
  Package,
  Loader2,
  AlertCircle,
  Star,
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

export default function CataloguePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filterStorage, setFilterStorage] = useState("tous");
  const [sortBy, setSortBy] = useState("recent");

  const formatPrice = (n: number) => n.toLocaleString("fr-FR") + " F";

  useEffect(() => {
    const load = async () => {
      setError("");
      try {
        const supabase = createClient();
        const { data, error: fetchError } = await supabase
          .from("products")
          .select(
            "id, name, price, storage, color, grade, battery, stock, description, images, created_at"
          )
          .order("created_at", { ascending: false });

        if (fetchError) throw fetchError;
        setProducts((data || []) as Product[]);
      } catch (err: unknown) {
        console.error(err);
        setError(
          err instanceof Error
            ? err.message
            : "Impossible de charger le catalogue."
        );
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const storages = useMemo(() => {
    const set = new Set(
      products.map((p) => p.storage).filter(Boolean) as string[]
    );
    return Array.from(set);
  }, [products]);

  const filtered = useMemo(() => {
    let list = [...products];

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.name?.toLowerCase().includes(q) ||
          p.storage?.toLowerCase().includes(q) ||
          p.color?.toLowerCase().includes(q) ||
          p.grade?.toLowerCase().includes(q)
      );
    }

    if (filterStorage !== "tous") {
      list = list.filter((p) => p.storage === filterStorage);
    }

    if (sortBy === "prix_asc") {
      list.sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
    } else if (sortBy === "prix_desc") {
      list.sort((a, b) => Number(b.price || 0) - Number(a.price || 0));
    } else {
      list.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    }

    return list;
  }, [products, search, filterStorage, sortBy]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
          <p className="text-sm text-gray-500">Chargement du catalogue...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
            Catalogue iPhone
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {products.length} produit(s) • Reconditionnés Grade A
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {error && (
          <div className="mb-5 flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Filtres */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un iPhone..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <select
            value={filterStorage}
            onChange={(e) => setFilterStorage(e.target.value)}
            className="px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="tous">Tous les stockages</option>
            {storages.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="recent">Plus récents</option>
            <option value="prix_asc">Prix croissant</option>
            <option value="prix_desc">Prix décroissant</option>
          </select>
        </div>

        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
            <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-semibold text-gray-600">
              Aucun produit trouvé
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {products.length === 0
                ? "Ajoute des produits depuis l’admin."
                : "Modifie ta recherche ou tes filtres."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {filtered.map((product) => {
              const inStock = Number(product.stock || 0) > 0;
              const img =
                product.images?.[0] || "/images/products/iphone1.jpg";

              return (
                <Link
                  key={product.id}
                  href={`/produit/${product.id}`}
                  className="group bg-white rounded-xl overflow-hidden border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.04)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.1)] transition-all active:scale-[0.98]"
                >
                  <div className="relative aspect-[3/4] overflow-hidden bg-gray-50">
                    {/* Si images externes (Supabase Storage), utilise <img> */}
                    {img.startsWith("http") ? (
                      <img
                        src={img}
                        alt={product.name}
                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <Image
                        src={img}
                        alt={product.name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                        sizes="(max-width: 640px) 50vw, 25vw"
                      />
                    )}

                    {!inStock && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <span className="text-white text-xs font-semibold bg-red-500 px-2 py-1 rounded-lg">
                          Rupture
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="p-2.5 sm:p-3">
                    <div className="flex justify-between items-start gap-1">
                      <h3 className="text-xs sm:text-sm font-bold text-gray-900 truncate">
                        {product.name}
                      </h3>
                      <div className="flex items-center gap-0.5 text-accent-400 shrink-0">
                        <Star className="w-3 h-3 fill-current" />
                        <span className="text-[10px]">4.8</span>
                      </div>
                    </div>

                    <p className="text-[10px] text-gray-500 mt-0.5 mb-1.5 truncate">
                      {product.storage || "—"}
                      {product.grade ? ` • ${product.grade}` : ""}
                      {product.color ? ` • ${product.color}` : ""}
                    </p>

                    <div className="flex items-center justify-between gap-1">
                      <p className="text-sm font-bold text-primary-600">
                        {formatPrice(Number(product.price || 0))}
                      </p>
                      <span
                        className={`text-[10px] font-medium ${
                          inStock ? "text-green-600" : "text-red-500"
                        }`}
                      >
                        {inStock
                          ? `${product.stock} en stock`
                          : "Épuisé"}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}