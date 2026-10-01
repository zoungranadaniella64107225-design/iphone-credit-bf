"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  FolderOpen,
  Package,
  CreditCard,
  Smartphone,
  ArrowLeft,
  Save,
  ImagePlus,
  X,
  CheckCircle,
  AlertCircle,
  Loader2,
  LogOut,
  RefreshCcw,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const STOCK_PATH = "/admin/produits/stock";
const NEW_PRODUCT_PATH = "/admin/produits/nouveau";

const INITIAL_FORM = {
  name: "",
  price: "",
  storage: "",
  color: "",
  grade: "Grade A",
  battery: "",
  stock: "0",
  description: "",
};

export default function AdminNewProductPage() {
  const router = useRouter();
  const supabase = createClient();

  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);

  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const [form, setForm] = useState(INITIAL_FORM);
  const [images, setImages] = useState<string[]>([]);

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
  // FORM
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

    if (error) {
      setError("");
    }

    if (success) {
      setSuccess("");
    }
  };

  // =========================================================
  // IMAGES
  // =========================================================

  const handleImages = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;

    if (!files || files.length === 0) return;

    setError("");

    const selectedFiles = Array.from(files);
    const remaining = Math.max(0, 6 - images.length);

    if (remaining === 0) {
      setError("Vous pouvez ajouter au maximum 6 images.");
      e.target.value = "";
      return;
    }

    const validFiles = selectedFiles.slice(0, remaining);

    validFiles.forEach((file) => {
      if (!file.type.startsWith("image/")) {
        setError(`Le fichier "${file.name}" n'est pas une image.`);
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        setError(`L'image "${file.name}" dépasse la limite de 5 Mo.`);
        return;
      }

      const reader = new FileReader();

      reader.onload = () => {
        if (typeof reader.result !== "string") return;

        setImages((prev) => {
          if (prev.length >= 6) return prev;

          return [...prev, reader.result as string];
        });
      };

      reader.onerror = () => {
        setError(`Impossible de lire l'image "${file.name}".`);
      };

      reader.readAsDataURL(file);
    });

    e.target.value = "";
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  // =========================================================
  // RESET
  // =========================================================

  const resetForm = () => {
    setForm({ ...INITIAL_FORM });
    setImages([]);
    setError("");
    setSuccess("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
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

    if (!form.price || !Number.isFinite(price) || price <= 0) {
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
      const batteryNumber = Number(battery.replace("%", "").trim());

      if (
        !Number.isFinite(batteryNumber) ||
        batteryNumber < 0 ||
        batteryNumber > 100
      ) {
        setError("La batterie doit être comprise entre 0 et 100 %.");
        return false;
      }
    }

    if (
      !form.stock ||
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
  // SAVE PRODUCT
  // =========================================================

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (saving) return;

    setError("");
    setSuccess("");

    if (!validate()) return;

    setSaving(true);

    try {
      const product = {
        name: form.name.trim(),
        price: Number(form.price),
        storage: form.storage.trim(),
        color: form.color.trim(),
        grade: form.grade.trim(),
        battery: form.battery.trim() || null,
        stock: Number(form.stock),
        description: form.description.trim(),
        images,
      };

      const { data, error: insertError } = await supabase
        .from("products")
        .insert(product)
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      if (!data) {
        throw new Error(
          "Le produit a été enregistré mais aucune donnée n'a été retournée."
        );
      }

      console.log("Produit enregistré :", data);

      setForm({ ...INITIAL_FORM });
      setImages([]);

      setSuccess(
        `Produit "${product.name}" enregistré avec succès. Vous pouvez en ajouter un autre.`
      );

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    } catch (err: unknown) {
      console.error("Erreur création produit :", err);

      if (err && typeof err === "object" && "message" in err) {
        const message = String(
          (err as { message?: unknown }).message ||
            "Une erreur est survenue pendant l'enregistrement."
        );

        setError(message);
      } else {
        setError(
          "Une erreur est survenue pendant l'enregistrement du produit."
        );
      }
    } finally {
      setSaving(false);
    }
  };

  // =========================================================
  // LOGOUT
  // =========================================================

  const logout = () => {
    localStorage.removeItem("admin");
    router.push("/admin/login");
  };

  // =========================================================
  // LOADING
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
  // NAVIGATION
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
      href: STOCK_PATH,
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

  return (
    <div className="min-h-screen bg-[#0b1120] text-white">
      {/* =====================================================
          HEADER
      ===================================================== */}

      <header className="sticky top-0 z-50 border-b border-white/5 bg-[#0f172a]/95 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center shadow-lg shadow-primary-500/25 shrink-0">
              <Smartphone className="w-5 h-5 text-white" />
            </div>

            <div className="min-w-0">
              <h1 className="text-base font-bold tracking-tight truncate">
                iPhone Credit BF
              </h1>

              <p className="text-[11px] text-slate-400">
                Panel d’administration
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link
              href={STOCK_PATH}
              className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Retour au stock
            </Link>

            <button
              type="button"
              onClick={logout}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-red-400 transition-colors px-3 py-1.5 rounded-lg hover:bg-red-500/10"
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
      ===================================================== */}

      <nav className="border-b border-white/5 bg-[#0f172a]/60">
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
              </Link>
            ))}
          </div>
        </div>
      </nav>

      {/* =====================================================
          CONTENT
      ===================================================== */}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* PAGE HEADER */}

        <div className="mb-8">
          <Link
            href={STOCK_PATH}
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-primary-300 mb-4 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Retour à la gestion du stock
          </Link>

          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">
                Ajouter un produit
              </h2>

              <p className="text-sm text-slate-400 mt-1">
                Ajoutez un téléphone directement dans votre catalogue.
              </p>
            </div>

            <div className="flex items-center gap-2 text-[11px] text-slate-500">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
              Les données sont enregistrées dans Supabase
            </div>
          </div>
        </div>

        {/* =====================================================
            SUCCESS
        ===================================================== */}

        {success && (
          <div className="mb-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/15 flex items-center justify-center shrink-0">
                <CheckCircle className="w-5 h-5 text-emerald-400" />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-emerald-300">
                  Produit enregistré
                </p>

                <p className="text-xs text-emerald-300/70 mt-1">
                  {success}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSuccess("")}
                className="text-emerald-400/60 hover:text-emerald-300 shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* =====================================================
            ERROR
        ===================================================== */}

        {error && (
          <div className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-red-500/15 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5 text-red-400" />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-red-300">
                  Enregistrement impossible
                </p>

                <p className="text-xs text-red-300/70 mt-1 break-words">
                  {error}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setError("")}
                className="text-red-400/60 hover:text-red-300 shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* =====================================================
            FORM
        ===================================================== */}

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {/* =================================================
                COLONNE PRINCIPALE
            ================================================= */}

            <div className="lg:col-span-2 space-y-6 min-w-0">
              {/* INFORMATIONS */}

              <section className="rounded-2xl bg-[#131c31] border border-white/5 overflow-hidden">
                <div className="px-5 py-4 border-b border-white/5">
                  <h3 className="text-sm font-bold">
                    Informations du produit
                  </h3>

                  <p className="text-[11px] text-slate-500 mt-1">
                    Ces informations seront enregistrées dans la base de
                    données.
                  </p>
                </div>

                <div className="p-5 space-y-5">
                  {/* NOM */}

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-2">
                      Nom du téléphone *
                    </label>

                    <input
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      placeholder="Ex : iPhone 13 Pro"
                      autoComplete="off"
                      className="w-full rounded-xl bg-[#0b1120] border border-white/10 px-4 py-3 text-sm text-white placeholder:text-slate-600 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 transition"
                    />
                  </div>

                  {/* PRIX + STOCK */}

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-2">
                        Prix total *
                      </label>

                      <div className="relative">
                        <input
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
                      <label className="block text-xs font-semibold text-slate-300 mb-2">
                        Stock initial *
                      </label>

                      <input
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

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-2">
                        Stockage *
                      </label>

                      <select
                        name="storage"
                        value={form.storage}
                        onChange={handleChange}
                        className="w-full rounded-xl bg-[#0b1120] border border-white/10 px-4 py-3 text-sm text-white outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 transition"
                      >
                        <option value="">Sélectionner</option>
                        <option value="64 Go">64 Go</option>
                        <option value="128 Go">128 Go</option>
                        <option value="256 Go">256 Go</option>
                        <option value="512 Go">512 Go</option>
                        <option value="1 To">1 To</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-2">
                        Couleur *
                      </label>

                      <input
                        name="color"
                        value={form.color}
                        onChange={handleChange}
                        placeholder="Ex : Minuit"
                        className="w-full rounded-xl bg-[#0b1120] border border-white/10 px-4 py-3 text-sm text-white placeholder:text-slate-600 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 transition"
                      />
                    </div>
                  </div>

                  {/* GRADE + BATTERIE */}

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-2">
                        Grade *
                      </label>

                      <select
                        name="grade"
                        value={form.grade}
                        onChange={handleChange}
                        className="w-full rounded-xl bg-[#0b1120] border border-white/10 px-4 py-3 text-sm text-white outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 transition"
                      >
                        <option value="Grade A+">Grade A+</option>
                        <option value="Grade A">Grade A</option>
                        <option value="Grade B">Grade B</option>
                        <option value="Grade C">Grade C</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-2">
                        Batterie
                      </label>

                      <div className="relative">
                        <input
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
                    <label className="block text-xs font-semibold text-slate-300 mb-2">
                      Description *
                    </label>

                    <textarea
                      name="description"
                      value={form.description}
                      onChange={handleChange}
                      rows={5}
                      placeholder="Décrivez le téléphone, son état, ses caractéristiques..."
                      className="w-full resize-none rounded-xl bg-[#0b1120] border border-white/10 px-4 py-3 text-sm text-white placeholder:text-slate-600 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 transition"
                    />

                    <div className="flex justify-between gap-4 mt-2">
                      <p className="text-[10px] text-slate-600">
                        Cette description sera visible sur la page produit.
                      </p>

                      <p className="text-[10px] text-slate-600 shrink-0">
                        {form.description.length} caractères
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              {/* IMAGES */}

              <section className="rounded-2xl bg-[#131c31] border border-white/5 overflow-hidden">
                <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold">
                      Photos du produit
                    </h3>

                    <p className="text-[11px] text-slate-500 mt-1">
                      Ajoutez jusqu'à 6 photos.
                    </p>
                  </div>

                  <span className="text-[10px] font-semibold text-slate-500">
                    {images.length}/6
                  </span>
                </div>

                <div className="p-5">
                  {images.length < 6 && (
                    <label className="flex flex-col items-center justify-center min-h-[160px] rounded-2xl border-2 border-dashed border-white/10 bg-[#0b1120] hover:border-primary-500/50 hover:bg-primary-500/[0.03] cursor-pointer transition">
                      <ImagePlus className="w-8 h-8 text-slate-500 mb-3" />

                      <span className="text-sm font-semibold text-slate-300">
                        Ajouter des photos
                      </span>

                      <span className="text-[11px] text-slate-600 mt-1 text-center px-4">
                        JPG, PNG ou WEBP • 5 Mo maximum par image
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
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
                      {images.map((image, index) => (
                        <div
                          key={`${image.slice(0, 20)}-${index}`}
                          className="relative aspect-square rounded-xl overflow-hidden border border-white/10 bg-[#0b1120] group"
                        >
                          <img
                            src={image}
                            alt={`Photo ${index + 1}`}
                            className="w-full h-full object-cover"
                          />

                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition" />

                          <button
                            type="button"
                            onClick={() => removeImage(index)}
                            className="absolute top-2 right-2 w-8 h-8 rounded-lg bg-black/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition hover:bg-red-500"
                            aria-label={`Supprimer la photo ${index + 1}`}
                          >
                            <X className="w-4 h-4" />
                          </button>

                          {index === 0 && (
                            <span className="absolute bottom-2 left-2 bg-primary-600 text-white text-[9px] font-semibold px-2 py-1 rounded-md">
                              Principale
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            </div>

            {/* =================================================
                COLONNE DROITE
            ================================================= */}

            <aside className="lg:col-span-1 min-w-0">
              <div className="lg:sticky lg:top-28 z-20 space-y-6">
                {/* APERÇU */}

                <section className="rounded-2xl bg-[#131c31] border border-white/5 overflow-hidden shadow-xl shadow-black/10">
                  <div className="px-5 py-4 border-b border-white/5">
                    <h3 className="text-sm font-bold">
                      Aperçu
                    </h3>

                    <p className="text-[11px] text-slate-500 mt-1">
                      Aperçu avant enregistrement.
                    </p>
                  </div>

                  <div className="p-5">
                    <div className="w-full aspect-square max-w-full rounded-2xl bg-[#0b1120] border border-white/5 flex items-center justify-center mb-5 overflow-hidden">
                      {images[0] ? (
                        <img
                          src={images[0]}
                          alt="Aperçu produit"
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
                      {form.color && ` • ${form.color}`}
                    </p>

                    <div className="mt-5 pt-5 border-t border-white/5 space-y-3">
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-xs text-slate-500">
                          Prix
                        </span>

                        <span className="text-sm font-bold text-primary-400 text-right">
                          {form.price
                            ? Number(form.price).toLocaleString("fr-FR")
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
                          Grade
                        </span>

                        <span className="text-xs font-semibold text-slate-300">
                          {form.grade}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-4">
                        <span className="text-xs text-slate-500">
                          Batterie
                        </span>

                        <span className="text-xs font-semibold text-slate-300">
                          {form.battery
                            ? `${form.battery.replace("%", "")}%`
                            : "--"}
                        </span>
                      </div>
                    </div>
                  </div>
                </section>

                {/* ACTION */}

                <section className="rounded-2xl bg-gradient-to-br from-primary-600/20 to-primary-500/5 border border-primary-500/20 p-5 shadow-xl shadow-black/10">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-9 h-9 rounded-xl bg-primary-500/15 flex items-center justify-center shrink-0">
                      <Package className="w-4 h-4 text-primary-400" />
                    </div>

                    <div className="min-w-0">
                      <p className="text-sm font-bold">
                        Prêt à enregistrer ?
                      </p>

                      <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                        Le produit sera enregistré dans la base de données
                        et ajouté au catalogue.
                      </p>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-3.5 text-sm font-semibold shadow-lg shadow-primary-500/20 transition-all"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Enregistrement...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        Enregistrer le produit
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={resetForm}
                    disabled={saving}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed border border-white/5 px-4 py-3 mt-2 text-xs font-medium text-slate-300 transition"
                  >
                    <RefreshCcw className="w-3.5 h-3.5" />
                    Réinitialiser
                  </button>

                  <Link
                    href={STOCK_PATH}
                    className="w-full flex items-center justify-center gap-2 rounded-xl px-4 py-3 mt-2 text-xs font-medium text-slate-500 hover:text-white hover:bg-white/5 transition"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Retour au stock
                  </Link>
                </section>
              </div>
            </aside>
          </div>
        </form>
      </main>
    </div>
  );
}
