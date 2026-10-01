"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Save,
  ImagePlus,
  X,
  CheckCircle,
  AlertCircle,
  Loader2,
  LogOut,
  RefreshCcw,
  Package,
  Smartphone,
  Trash2,
  LayoutDashboard,
  FolderOpen,
  CreditCard,
  ExternalLink,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Product = {
  id: number;
  name: string;
  price: number;
  storage: string;
  color: string;
  grade: string;
  battery: string | null;
  stock: number;
  description: string | null;
  images: string[];
  created_at: string;
  updated_at: string;
};

type ProductForm = {
  name: string;
  price: string;
  storage: string;
  color: string;
  grade: string;
  battery: string;
  stock: string;
  description: string;
};

const STOCK_ROUTE = "/admin/produits/stock";

const INITIAL_FORM: ProductForm = {
  name: "",
  price: "",
  storage: "",
  color: "",
  grade: "Grade A",
  battery: "",
  stock: "0",
  description: "",
};

export default function AdminEditProductPage() {
  const router = useRouter();
  const params = useParams();

  const supabase = createClient();

  const productId = Number(params.id);

  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [product, setProduct] = useState<Product | null>(null);

  const [form, setForm] = useState<ProductForm>(INITIAL_FORM);
  const [images, setImages] = useState<string[]>([]);

  const [success, setSuccess] = useState("");
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
  // CHARGEMENT DU PRODUIT
  // =========================================================

  useEffect(() => {
    if (!ready) return;

    if (!Number.isInteger(productId) || productId <= 0) {
      setError("Identifiant du produit invalide.");
      setLoading(false);
      return;
    }

    fetchProduct();
  }, [ready, productId]);

  const fetchProduct = async () => {
    setLoading(true);
    setError("");

    try {
      const { data, error: fetchError } = await supabase
        .from("products")
        .select("*")
        .eq("id", productId)
        .single();

      if (fetchError) {
        console.error("Erreur chargement produit :", fetchError);

        if (fetchError.code === "PGRST116") {
          setError("Produit introuvable.");
        } else {
          setError(
            "Impossible de charger le produit depuis Supabase."
          );
        }

        return;
      }

      if (!data) {
        setError("Produit introuvable.");
        return;
      }

      const loadedProduct = data as Product;

      setProduct(loadedProduct);

      setForm({
        name: loadedProduct.name ?? "",
        price:
          loadedProduct.price !== null &&
          loadedProduct.price !== undefined
            ? String(loadedProduct.price)
            : "",
        storage: loadedProduct.storage ?? "",
        color: loadedProduct.color ?? "",
        grade: loadedProduct.grade ?? "Grade A",
        battery:
          loadedProduct.battery !== null &&
          loadedProduct.battery !== undefined
            ? String(loadedProduct.battery)
            : "",
        stock:
          loadedProduct.stock !== null &&
          loadedProduct.stock !== undefined
            ? String(loadedProduct.stock)
            : "0",
        description: loadedProduct.description ?? "",
      });

      setImages(
        Array.isArray(loadedProduct.images)
          ? loadedProduct.images
          : []
      );
    } catch (err) {
      console.error(err);
      setError("Une erreur est survenue lors du chargement.");
    } finally {
      setLoading(false);
    }
  };

  // =========================================================
  // FORMULAIRE
  // =========================================================

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));

    setError("");
    setSuccess("");
  };

  // =========================================================
  // IMAGES
  // =========================================================

  const handleImages = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = e.target.files;

    if (!files || files.length === 0) return;

    setError("");
    setSuccess("");

    const remaining = Math.max(0, 6 - images.length);

    if (remaining === 0) {
      setError("Vous pouvez ajouter au maximum 6 images.");
      e.target.value = "";
      return;
    }

    const selectedFiles = Array.from(files).slice(
      0,
      remaining
    );

    selectedFiles.forEach((file) => {
      if (!file.type.startsWith("image/")) {
        setError(
          `"${file.name}" n'est pas une image valide.`
        );
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        setError(
          `L'image "${file.name}" dépasse la limite de 5 Mo.`
        );
        return;
      }

      const reader = new FileReader();

      reader.onload = () => {
        const result = reader.result;

        if (typeof result !== "string") {
          setError(
            `Impossible de lire l'image "${file.name}".`
          );
          return;
        }

        setImages((prev) => {
          if (prev.length >= 6) return prev;

          return [...prev, result];
        });
      };

      reader.onerror = () => {
        setError(
          `Impossible de lire l'image "${file.name}".`
        );
      };

      reader.readAsDataURL(file);
    });

    e.target.value = "";
  };

  const removeImage = (index: number) => {
    setImages((prev) =>
      prev.filter((_, i) => i !== index)
    );

    setSuccess("");
    setError("");
  };

  // =========================================================
  // VALIDATION
  // =========================================================

  const validate = () => {
    const name = form.name.trim();
    const price = Number(form.price);
    const stock = Number(form.stock);
    const storage = form.storage.trim();
    const color = form.color.trim();
    const battery = form.battery.trim();
    const description = form.description.trim();

    if (!name) {
      setError("Le nom du produit est obligatoire.");
      return false;
    }

    if (
      !form.price ||
      !Number.isFinite(price) ||
      price <= 0
    ) {
      setError("Veuillez entrer un prix valide.");
      return false;
    }

    if (!storage) {
      setError("Le stockage est obligatoire.");
      return false;
    }

    if (!color) {
      setError("La couleur est obligatoire.");
      return false;
    }

    if (battery) {
      const batteryNumber = Number(
        battery.replace("%", "").trim()
      );

      if (
        !Number.isFinite(batteryNumber) ||
        batteryNumber < 0 ||
        batteryNumber > 100
      ) {
        setError(
          "La batterie doit être comprise entre 0 et 100 %."
        );
        return false;
      }
    }

    if (
      form.stock === "" ||
      !Number.isFinite(stock) ||
      stock < 0 ||
      !Number.isInteger(stock)
    ) {
      setError(
        "Le stock doit être un nombre entier positif ou égal à 0."
      );
      return false;
    }

    if (!description) {
      setError("La description est obligatoire.");
      return false;
    }

    if (images.length === 0) {
      setError("Ajoutez au moins une image du produit.");
      return false;
    }

    return true;
  };

  // =========================================================
  // ENREGISTREMENT
  // =========================================================

  const handleSubmit = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    if (saving || deleting) return;

    setError("");
    setSuccess("");

    if (!validate()) return;

    setSaving(true);

    try {
      const updatedProduct = {
        name: form.name.trim(),
        price: Number(form.price),
        storage: form.storage.trim(),
        color: form.color.trim(),
        grade: form.grade.trim(),
        battery: form.battery.trim() || null,
        stock: Number(form.stock),
        description: form.description.trim(),
        images,
        updated_at: new Date().toISOString(),
      };

      const { data, error: updateError } = await supabase
        .from("products")
        .update(updatedProduct)
        .eq("id", productId)
        .select()
        .single();

      if (updateError) {
        console.error(
          "Erreur modification produit :",
          updateError
        );

        throw updateError;
      }

      if (!data) {
        throw new Error(
          "La modification a été effectuée mais aucune donnée n'a été retournée."
        );
      }

      const updated = data as Product;

      setProduct(updated);

      setSuccess(
        "Les informations du produit ont été mises à jour avec succès."
      );

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    } catch (err: unknown) {
      console.error(err);

      if (
        err &&
        typeof err === "object" &&
        "message" in err
      ) {
        const message = String(
          (err as { message?: unknown }).message ||
            "Impossible de modifier le produit."
        );

        setError(message);
      } else {
        setError(
          "Une erreur est survenue pendant la modification du produit."
        );
      }
    } finally {
      setSaving(false);
    }
  };

  // =========================================================
  // SUPPRESSION
  // =========================================================

  const handleDelete = async () => {
    if (saving || deleting || !product) return;

    const confirmed = window.confirm(
      `Voulez-vous vraiment supprimer "${product.name}" ?\n\nCette action est définitive.`
    );

    if (!confirmed) return;

    setDeleting(true);
    setError("");
    setSuccess("");

    try {
      const { error: deleteError } = await supabase
        .from("products")
        .delete()
        .eq("id", productId);

      if (deleteError) {
        console.error(
          "Erreur suppression produit :",
          deleteError
        );

        throw deleteError;
      }

      router.push(STOCK_ROUTE);
      router.refresh();
    } catch (err: unknown) {
      console.error(err);

      if (
        err &&
        typeof err === "object" &&
        "message" in err
      ) {
        setError(
          String(
            (err as { message?: unknown }).message ||
              "Impossible de supprimer le produit."
          )
        );
      } else {
        setError(
          "Une erreur est survenue lors de la suppression."
        );
      }
    } finally {
      setDeleting(false);
    }
  };

  // =========================================================
  // RESET
  // =========================================================

  const resetChanges = () => {
    if (!product) return;

    setForm({
      name: product.name ?? "",
      price:
        product.price !== null &&
        product.price !== undefined
          ? String(product.price)
          : "",
      storage: product.storage ?? "",
      color: product.color ?? "",
      grade: product.grade ?? "Grade A",
      battery:
        product.battery !== null &&
        product.battery !== undefined
          ? String(product.battery)
          : "",
      stock:
        product.stock !== null &&
        product.stock !== undefined
          ? String(product.stock)
          : "0",
      description: product.description ?? "",
    });

    setImages(
      Array.isArray(product.images)
        ? product.images
        : []
    );

    setError("");
    setSuccess("Les modifications ont été annulées.");
  };

  // =========================================================
  // LOGOUT
  // =========================================================

  const logout = () => {
    localStorage.removeItem("admin");
    router.push("/admin/login");
  };

  // =========================================================
  // MENU
  // =========================================================

  const menu = [
    {
      href: "/admin",
      label: "Dashboard",
      icon: <LayoutDashboard className="w-4 h-4" />,
    },
    {
      href: "/admin/dossiers",
      label: "Dossiers",
      icon: <FolderOpen className="w-4 h-4" />,
    },
    {
      href: STOCK_ROUTE,
      label: "Stock",
      icon: <Package className="w-4 h-4" />,
      active: true,
    },
    {
      href: "/admin/paiements",
      label: "Paiements",
      icon: <CreditCard className="w-4 h-4" />,
    },
  ];

  // =========================================================
  // LOADING AUTH
  // =========================================================

  if (!ready) {
    return (
      <div className="min-h-screen bg-[#0b1120] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />

          <p className="text-xs text-slate-500">
            Vérification de la session...
          </p>
        </div>
      </div>
    );
  }

  // =========================================================
  // LOADING PRODUIT
  // =========================================================

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b1120] text-white">
        <div className="min-h-screen flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />

            <p className="text-sm text-slate-400">
              Chargement du produit...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================
  // PRODUIT INTROUVABLE
  // =========================================================

  if (!product) {
    return (
      <div className="min-h-screen bg-[#0b1120] text-white">
        <header className="border-b border-white/5 bg-[#0f172a]/90 backdrop-blur-xl">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center shrink-0">
                <Package className="w-5 h-5 text-white" />
              </div>

              <div className="min-w-0">
                <h1 className="text-base font-bold">
                  iPhone Credit BF
                </h1>

                <p className="text-[11px] text-slate-400">
                  Panel d'administration
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={logout}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-red-400 transition-colors px-3 py-2 rounded-lg hover:bg-red-500/10"
            >
              <LogOut className="w-3.5 h-3.5" />

              <span className="hidden sm:inline">
                Déconnexion
              </span>
            </button>
          </div>
        </header>

        <main className="max-w-xl mx-auto px-4 py-16">
          <div className="rounded-2xl bg-[#131c31] border border-red-500/20 p-8 text-center">
            <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-5">
              <AlertCircle className="w-7 h-7 text-red-400" />
            </div>

            <h2 className="text-lg font-bold">
              Produit introuvable
            </h2>

            <p className="text-sm text-slate-500 mt-2">
              {error ||
                "Ce produit n'existe pas ou a été supprimé."}
            </p>

            <Link
              href={STOCK_ROUTE}
              className="inline-flex items-center gap-2 mt-6 rounded-xl bg-primary-600 hover:bg-primary-500 px-5 py-3 text-sm font-semibold transition"
            >
              <ArrowLeft className="w-4 h-4" />
              Retour au stock
            </Link>
          </div>
        </main>
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
      ====================================================== */}

      <header className="border-b border-white/5 bg-[#0f172a]/95 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center shadow-lg shadow-primary-500/25 shrink-0">
              <Smartphone className="w-5 h-5 text-white" />
            </div>

            <div className="min-w-0">
              <h1 className="text-base font-bold tracking-tight truncate">
                iPhone Credit BF
              </h1>

              <p className="text-[11px] text-slate-400 truncate">
                Modification du produit #{product.id}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={STOCK_ROUTE}
              className="hidden sm:inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.07] hover:border-white/15 px-3.5 py-2 text-xs font-medium text-slate-300 hover:text-white transition-all"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Retour au stock
            </Link>

            <button
              type="button"
              onClick={logout}
              className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-red-400 transition-colors px-3 py-2 rounded-xl hover:bg-red-500/10"
            >
              <LogOut className="w-3.5 h-3.5" />

              <span className="hidden sm:inline">
                Déconnexion
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* =====================================================
          NAVIGATION
      ====================================================== */}

      <nav className="border-b border-white/5 bg-[#0f172a]/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex gap-1 overflow-x-auto py-2 scrollbar-hide">
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
              </Link>
            ))}
          </div>
        </div>
      </nav>

      {/* =====================================================
          CONTENT
      ====================================================== */}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* ===================================================
            PAGE HEADER
        ==================================================== */}

        <div className="mb-7">
          <Link
            href={STOCK_ROUTE}
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-primary-300 mb-4 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Retour à la gestion du stock
          </Link>

          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-500/10 border border-primary-500/20 px-2.5 py-1 text-[10px] font-semibold text-primary-300">
                  <Package className="w-3 h-3" />
                  Produit #{product.id}
                </span>

                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                    Number(form.stock) === 0
                      ? "bg-red-500/10 border border-red-500/20 text-red-300"
                      : Number(form.stock) <= 3
                      ? "bg-amber-500/10 border border-amber-500/20 text-amber-300"
                      : "bg-emerald-500/10 border border-emerald-500/20 text-emerald-300"
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-current" />
                  {Number(form.stock) === 0
                    ? "Rupture"
                    : `${form.stock} en stock`}
                </span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
                Modifier le produit
              </h2>

              <p className="text-sm text-slate-400 mt-1.5 max-w-2xl">
                Modifiez les informations de{" "}
                <span className="text-slate-200 font-medium">
                  {product.name}
                </span>{" "}
                puis enregistrez vos changements.
              </p>
            </div>

            <Link
              href={STOCK_ROUTE}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 px-4 py-2.5 text-xs font-medium text-slate-300 hover:text-white transition sm:w-auto w-full lg:w-auto"
            >
              <Package className="w-3.5 h-3.5" />
              Voir le stock
              <ExternalLink className="w-3 h-3 opacity-50" />
            </Link>
          </div>
        </div>

        {/* ===================================================
            SUCCESS
        ==================================================== */}

        {success && (
          <div className="mb-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/15 flex items-center justify-center shrink-0">
                <CheckCircle className="w-5 h-5 text-emerald-400" />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-emerald-300">
                  Modification enregistrée
                </p>

                <p className="text-xs text-emerald-300/70 mt-1">
                  {success}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSuccess("")}
                className="text-emerald-400/60 hover:text-emerald-300 shrink-0"
                aria-label="Fermer le message"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ===================================================
            ERROR
        ==================================================== */}

        {error && (
          <div className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-red-500/15 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5 text-red-400" />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-red-300">
                  Une erreur est survenue
                </p>

                <p className="text-xs text-red-300/70 mt-1 break-words">
                  {error}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setError("")}
                className="text-red-400/60 hover:text-red-300 shrink-0"
                aria-label="Fermer le message"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ===================================================
            FORMULAIRE
        ==================================================== */}

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
            {/* =================================================
                COLONNE PRINCIPALE
            ================================================== */}

            <div className="xl:col-span-2 min-w-0 space-y-6">
              {/* =================================================
                  INFORMATIONS
              ================================================== */}

              <section className="rounded-2xl bg-[#131c31] border border-white/5 overflow-hidden shadow-xl shadow-black/5">
                <div className="px-5 py-4 border-b border-white/5">
                  <h3 className="text-sm font-bold">
                    Informations du produit
                  </h3>

                  <p className="text-[11px] text-slate-500 mt-1">
                    Modifiez les informations principales du
                    téléphone.
                  </p>
                </div>

                <div className="p-5 space-y-5">
                  {/* NOM */}

                  <div>
                    <label
                      htmlFor="name"
                      className="block text-xs font-semibold text-slate-300 mb-2"
                    >
                      Nom du téléphone *
                    </label>

                    <input
                      id="name"
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      placeholder="Ex : iPhone 13 Pro"
                      autoComplete="off"
                      className="w-full rounded-xl bg-[#0b1120] border border-white/10 px-4 py-3 text-sm text-white placeholder:text-slate-600 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 transition"
                    />
                  </div>

                  {/* PRIX + STOCK */}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="price"
                        className="block text-xs font-semibold text-slate-300 mb-2"
                      >
                        Prix total *
                      </label>

                      <div className="relative">
                        <input
                          id="price"
                          name="price"
                          type="number"
                          min="1"
                          step="1"
                          value={form.price}
                          onChange={handleChange}
                          placeholder="180000"
                          className="w-full rounded-xl bg-[#0b1120] border border-white/10 px-4 py-3 pr-12 text-sm text-white placeholder:text-slate-600 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 transition"
                        />

                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-500">
                          F
                        </span>
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="stock"
                        className="block text-xs font-semibold text-slate-300 mb-2"
                      >
                        Quantité en stock *
                      </label>

                      <input
                        id="stock"
                        name="stock"
                        type="number"
                        min="0"
                        step="1"
                        value={form.stock}
                        onChange={handleChange}
                        placeholder="5"
                        className="w-full rounded-xl bg-[#0b1120] border border-white/10 px-4 py-3 text-sm text-white placeholder:text-slate-600 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 transition"
                      />
                    </div>
                  </div>

                  {/* STOCKAGE + COULEUR */}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="storage"
                        className="block text-xs font-semibold text-slate-300 mb-2"
                      >
                        Stockage *
                      </label>

                      <select
                        id="storage"
                        name="storage"
                        value={form.storage}
                        onChange={handleChange}
                        className="w-full rounded-xl bg-[#0b1120] border border-white/10 px-4 py-3 text-sm text-white outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 transition"
                      >
                        <option value="">
                          Sélectionner
                        </option>

                        <option value="64 Go">
                          64 Go
                        </option>

                        <option value="128 Go">
                          128 Go
                        </option>

                        <option value="256 Go">
                          256 Go
                        </option>

                        <option value="512 Go">
                          512 Go
                        </option>

                        <option value="1 To">
                          1 To
                        </option>
                      </select>
                    </div>

                    <div>
                      <label
                        htmlFor="color"
                        className="block text-xs font-semibold text-slate-300 mb-2"
                      >
                        Couleur *
                      </label>

                      <input
                        id="color"
                        name="color"
                        value={form.color}
                        onChange={handleChange}
                        placeholder="Ex : Minuit"
                        className="w-full rounded-xl bg-[#0b1120] border border-white/10 px-4 py-3 text-sm text-white placeholder:text-slate-600 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 transition"
                      />
                    </div>
                  </div>

                  {/* GRADE + BATTERIE */}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="grade"
                        className="block text-xs font-semibold text-slate-300 mb-2"
                      >
                        Grade *
                      </label>

                      <select
                        id="grade"
                        name="grade"
                        value={form.grade}
                        onChange={handleChange}
                        className="w-full rounded-xl bg-[#0b1120] border border-white/10 px-4 py-3 text-sm text-white outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 transition"
                      >
                        <option value="Grade A+">
                          Grade A+
                        </option>

                        <option value="Grade A">
                          Grade A
                        </option>

                        <option value="Grade B">
                          Grade B
                        </option>

                        <option value="Grade C">
                          Grade C
                        </option>
                      </select>
                    </div>

                    <div>
                      <label
                        htmlFor="battery"
                        className="block text-xs font-semibold text-slate-300 mb-2"
                      >
                        Batterie
                      </label>

                      <div className="relative">
                        <input
                          id="battery"
                          name="battery"
                          value={form.battery}
                          onChange={handleChange}
                          placeholder="Ex : 86"
                          inputMode="numeric"
                          className="w-full rounded-xl bg-[#0b1120] border border-white/10 px-4 py-3 pr-10 text-sm text-white placeholder:text-slate-600 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 transition"
                        />

                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-500">
                          %
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* DESCRIPTION */}

                  <div>
                    <label
                      htmlFor="description"
                      className="block text-xs font-semibold text-slate-300 mb-2"
                    >
                      Description *
                    </label>

                    <textarea
                      id="description"
                      name="description"
                      value={form.description}
                      onChange={handleChange}
                      rows={7}
                      placeholder="Décrivez le téléphone, son état, ses caractéristiques..."
                      className="w-full resize-y min-h-[150px] rounded-xl bg-[#0b1120] border border-white/10 px-4 py-3 text-sm text-white placeholder:text-slate-600 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 transition"
                    />

                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mt-2">
                      <p className="text-[10px] text-slate-600">
                        Cette description sera visible sur la
                        page produit.
                      </p>

                      <p className="text-[10px] text-slate-600">
                        {form.description.length} caractères
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              {/* =================================================
                  IMAGES
              ================================================== */}

              <section className="rounded-2xl bg-[#131c31] border border-white/5 overflow-hidden shadow-xl shadow-black/5">
                <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-bold">
                      Photos du produit
                    </h3>

                    <p className="text-[11px] text-slate-500 mt-1">
                      Ajoutez jusqu'à 6 photos.
                    </p>
                  </div>

                  <span className="shrink-0 text-[10px] font-semibold text-slate-400 bg-white/5 border border-white/5 px-2.5 py-1 rounded-lg">
                    {images.length}/6
                  </span>
                </div>

                <div className="p-5">
                  {images.length < 6 && (
                    <label className="flex flex-col items-center justify-center min-h-[170px] rounded-2xl border-2 border-dashed border-white/10 bg-[#0b1120] hover:border-primary-500/50 hover:bg-primary-500/[0.03] cursor-pointer transition">
                      <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mb-3">
                        <ImagePlus className="w-6 h-6 text-slate-500" />
                      </div>

                      <span className="text-sm font-semibold text-slate-300">
                        Ajouter des photos
                      </span>

                      <span className="text-[11px] text-slate-600 mt-1 text-center px-4">
                        JPG, PNG ou WEBP • 5 Mo maximum par
                        image
                      </span>

                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        multiple
                        onChange={handleImages}
                        className="hidden"
                      />
                    </label>
                  )}

                  {images.length > 0 && (
                    <div
                      className={`grid grid-cols-2 ${
                        images.length >= 3
                          ? "sm:grid-cols-3"
                          : "sm:grid-cols-2"
                      } gap-3 ${
                        images.length < 6 ? "mt-4" : ""
                      }`}
                    >
                      {images.map((image, index) => (
                        <div
                          key={`${image.slice(
                            0,
                            20
                          )}-${index}`}
                          className="relative aspect-square rounded-xl overflow-hidden border border-white/10 bg-[#0b1120] group"
                        >
                          <img
                            src={image}
                            alt={`Photo ${index + 1} de ${
                              form.name || "produit"
                            }`}
                            className="w-full h-full object-cover"
                          />

                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/35 transition" />

                          <button
                            type="button"
                            onClick={() =>
                              removeImage(index)
                            }
                            disabled={saving || deleting}
                            className="absolute top-2 right-2 w-8 h-8 rounded-lg bg-black/70 text-white flex items-center justify-center opacity-100 sm:opacity-0 group-hover:opacity-100 transition hover:bg-red-500 disabled:opacity-40"
                            aria-label={`Supprimer la photo ${
                              index + 1
                            }`}
                          >
                            <X className="w-4 h-4" />
                          </button>

                          {index === 0 && (
                            <span className="absolute bottom-2 left-2 bg-primary-600 text-white text-[9px] font-semibold px-2 py-1 rounded-md shadow-lg">
                              Principale
                            </span>
                          )}

                          <span className="absolute bottom-2 right-2 bg-black/60 text-white text-[9px] px-2 py-1 rounded-md">
                            {index + 1}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            </div>

            {/* =================================================
                COLONNE DROITE
            ================================================== */}

            <div className="min-w-0 space-y-6 xl:sticky xl:top-28 xl:max-h-[calc(100vh-8rem)] xl:overflow-y-auto xl:pr-1">
              {/* =================================================
                  APERCU
              ================================================== */}

              <section className="rounded-2xl bg-[#131c31] border border-white/5 overflow-hidden shadow-xl shadow-black/5">
                <div className="px-5 py-4 border-b border-white/5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-bold">
                        Aperçu
                      </h3>

                      <p className="text-[11px] text-slate-500 mt-1">
                        Aperçu en temps réel du produit.
                      </p>
                    </div>

                    <div className="w-8 h-8 rounded-lg bg-primary-500/10 flex items-center justify-center">
                      <Smartphone className="w-4 h-4 text-primary-400" />
                    </div>
                  </div>
                </div>

                <div className="p-5">
                  <div className="w-full aspect-square rounded-2xl bg-[#0b1120] border border-white/5 flex items-center justify-center mb-5 overflow-hidden">
                    {images[0] ? (
                      <img
                        src={images[0]}
                        alt="Aperçu du produit"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Smartphone className="w-16 h-16 text-slate-700" />
                    )}
                  </div>

                  <h4 className="text-lg font-bold truncate">
                    {form.name || "Nom du produit"}
                  </h4>

                  <p className="text-xs text-slate-500 mt-1 truncate">
                    {form.storage || "Stockage"}

                    {form.color &&
                      ` • ${form.color}`}
                  </p>

                  <div className="mt-5 pt-5 border-t border-white/5 space-y-3.5">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-xs text-slate-500">
                        Prix
                      </span>

                      <span className="text-sm font-bold text-primary-400">
                        {form.price
                          ? Number(
                              form.price
                            ).toLocaleString("fr-FR")
                          : "0"}{" "}
                        F
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <span className="text-xs text-slate-500">
                        Stock
                      </span>

                      <span
                        className={`text-sm font-bold ${
                          Number(form.stock) === 0
                            ? "text-red-400"
                            : Number(form.stock) <= 3
                            ? "text-amber-400"
                            : "text-emerald-400"
                        }`}
                      >
                        {form.stock || "0"} unité(s)
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <span className="text-xs text-slate-500">
                        Stockage
                      </span>

                      <span className="text-xs font-semibold text-slate-300">
                        {form.storage || "--"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <span className="text-xs text-slate-500">
                        Couleur
                      </span>

                      <span className="text-xs font-semibold text-slate-300 truncate max-w-[130px]">
                        {form.color || "--"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <span className="text-xs text-slate-500">
                        Grade
                      </span>

                      <span className="text-xs font-semibold text-slate-300">
                        {form.grade || "--"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <span className="text-xs text-slate-500">
                        Batterie
                      </span>

                      <span className="text-xs font-semibold text-slate-300">
                        {form.battery
                          ? `${form.battery.replace(
                              "%",
                              ""
                            )}%`
                          : "--"}
                      </span>
                    </div>
                  </div>
                </div>
              </section>

              {/* =================================================
                  ACTIONS
              ================================================== */}

              <section className="rounded-2xl bg-gradient-to-br from-primary-600/20 via-primary-500/10 to-[#131c31] border border-primary-500/20 p-5 shadow-xl shadow-black/10">
                <div className="flex items-start gap-3 mb-5">
                  <div className="w-10 h-10 rounded-xl bg-primary-500/15 border border-primary-500/20 flex items-center justify-center shrink-0">
                    <Save className="w-4 h-4 text-primary-400" />
                  </div>

                  <div className="min-w-0">
                    <p className="text-sm font-bold text-white">
                      Enregistrer les modifications
                    </p>

                    <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                      Vérifiez les informations puis
                      enregistrez les changements apportés à
                      ce produit.
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <button
                    type="submit"
                    disabled={saving || deleting}
                    className="w-full min-h-[48px] flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-primary-500/20 transition-all"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Enregistrement...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        Enregistrer les modifications
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={resetChanges}
                    disabled={saving || deleting}
                    className="w-full min-h-[44px] flex items-center justify-center gap-2 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed border border-white/10 px-4 py-3 text-xs font-medium text-slate-300 transition"
                  >
                    <RefreshCcw className="w-3.5 h-3.5" />
                    Annuler les modifications
                  </button>

                  <Link
                    href={STOCK_ROUTE}
                    className="w-full min-h-[44px] flex items-center justify-center gap-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/5 px-4 py-3 text-xs font-medium text-slate-400 hover:text-white transition"
                  >
                    <Package className="w-3.5 h-3.5" />
                    Voir le stock
                    <ExternalLink className="w-3 h-3 opacity-50" />
                  </Link>
                </div>
              </section>

              {/* =================================================
                  SUPPRESSION
              ================================================== */}

              <section className="rounded-2xl bg-red-500/5 border border-red-500/15 p-5">
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-9 h-9 rounded-xl bg-red-500/10 flex items-center justify-center shrink-0">
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </div>

                  <div className="min-w-0">
                    <p className="text-sm font-bold text-red-300">
                      Zone dangereuse
                    </p>

                    <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                      La suppression du produit est
                      définitive et ne peut pas être annulée.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={saving || deleting}
                  className="w-full min-h-[44px] flex items-center justify-center gap-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/30 disabled:opacity-40 disabled:cursor-not-allowed px-4 py-3 text-xs font-semibold text-red-400 transition"
                >
                  {deleting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Suppression...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      Supprimer le produit
                    </>
                  )}
                </button>
              </section>

              {/* =================================================
                  LIEN STOCK
              ================================================== */}

              <Link
                href={STOCK_ROUTE}
                className="group flex items-center gap-3 rounded-2xl bg-[#131c31] border border-white/5 hover:border-primary-500/30 hover:bg-primary-500/[0.04] p-4 transition-all"
              >
                <div className="w-10 h-10 rounded-xl bg-primary-500/10 flex items-center justify-center shrink-0 group-hover:bg-primary-500/15 transition">
                  <Package className="w-4 h-4 text-primary-400" />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-200">
                    Gestion du stock
                  </p>

                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Retourner à la liste des produits
                  </p>
                </div>

                <ArrowLeft className="w-4 h-4 text-slate-500 rotate-180 group-hover:text-primary-400 transition" />
              </Link>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}
