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

type PreviewItem = {
  id: string;
  file: File;
  preview: string; // blob: URL pour l'aperçu seulement
};

/** Upload vers Storage bucket "products" → URL publique */
async function uploadProductImage(file: File): Promise<string> {
  const supabase = createClient();

  if (file.size > 2 * 1024 * 1024) {
    throw new Error(
      `"${file.name}" dépasse 2 Mo. Compresse l'image avant l'envoi.`
    );
  }

  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { error } = await supabase.storage.from("products").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || "image/jpeg",
  });

  if (error) {
    throw new Error(error.message || "Échec upload Storage");
  }

  const { data } = supabase.storage.from("products").getPublicUrl(path);
  return data.publicUrl;
}

export default function AdminNewProductPage() {
  const router = useRouter();
  const supabase = createClient();

  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const [form, setForm] = useState(INITIAL_FORM);
  const [imageItems, setImageItems] = useState<PreviewItem[]>([]);

  useEffect(() => {
    const init = async () => {
      // Session Supabase obligatoire pour Storage + RLS
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/admin/login");
        return;
      }

      setReady(true);
    };
    init();
  }, [router, supabase]);

  // Libérer les blob URLs au démontage
  useEffect(() => {
    return () => {
      imageItems.forEach((item) => URL.revokeObjectURL(item.preview));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (error) setError("");
    if (success) setSuccess("");
  };

  const handleImages = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;

    setError("");
    const remaining = Math.max(0, 6 - imageItems.length);
    if (remaining === 0) {
      setError("Maximum 6 images.");
      e.target.value = "";
      return;
    }

    const selected = Array.from(files).slice(0, remaining);
    const next: PreviewItem[] = [];

    for (const file of selected) {
      if (!file.type.startsWith("image/")) {
        setError(`"${file.name}" n'est pas une image.`);
        continue;
      }
      if (file.size > 2 * 1024 * 1024) {
        setError(`"${file.name}" > 2 Mo. Compresse-la.`);
        continue;
      }
      next.push({
        id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
        file,
        preview: URL.createObjectURL(file),
      });
    }

    setImageItems((prev) => [...prev, ...next].slice(0, 6));
    e.target.value = "";
  };

  const removeImage = (id: string) => {
    setImageItems((prev) => {
      const item = prev.find((i) => i.id === id);
      if (item) URL.revokeObjectURL(item.preview);
      return prev.filter((i) => i.id !== id);
    });
  };

  const resetForm = () => {
    imageItems.forEach((i) => URL.revokeObjectURL(i.preview));
    setForm({ ...INITIAL_FORM });
    setImageItems([]);
    setError("");
    setSuccess("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const validate = () => {
    const name = form.name.trim();
    const price = Number(form.price);
    const stock = Number(form.stock);

    if (!name) {
      setError("Le nom du produit est obligatoire.");
      return false;
    }
    if (!form.price || !Number.isFinite(price) || price <= 0) {
      setError("Prix invalide.");
      return false;
    }
    if (!form.storage.trim()) {
      setError("Stockage obligatoire.");
      return false;
    }
    if (!form.color.trim()) {
      setError("Couleur obligatoire.");
      return false;
    }
    if (form.battery.trim()) {
      const b = Number(form.battery.replace("%", "").trim());
      if (!Number.isFinite(b) || b < 0 || b > 100) {
        setError("Batterie entre 0 et 100 %.");
        return false;
      }
    }
    if (
      form.stock === "" ||
      !Number.isFinite(stock) ||
      stock < 0 ||
      !Number.isInteger(stock)
    ) {
      setError("Stock = entier ≥ 0.");
      return false;
    }
    if (!form.description.trim()) {
      setError("Description obligatoire.");
      return false;
    }
    if (imageItems.length === 0) {
      setError("Ajoutez au moins une image.");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;

    setError("");
    setSuccess("");
    if (!validate()) return;

    setSaving(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Session expirée. Reconnecte-toi (admin Supabase).");
      }

      // 1) Upload Storage (pas de base64 en base)
      const imageUrls: string[] = [];
      for (const item of imageItems) {
        const url = await uploadProductImage(item.file);
        imageUrls.push(url);
      }

      // 2) Insert produit avec URLs courtes uniquement
      const product = {
        name: form.name.trim(),
        price: Number(form.price),
        storage: form.storage.trim(),
        color: form.color.trim(),
        grade: form.grade.trim() || "Grade A",
        battery: form.battery.trim()
          ? `${form.battery.replace("%", "").trim()}%`
          : null,
        stock: Number(form.stock),
        description: form.description.trim(),
        images: imageUrls,
      };

      const { data, error: insertError } = await supabase
        .from("products")
        .insert(product)
        .select("id, name")
        .single();

      if (insertError) throw insertError;
      if (!data) throw new Error("Aucune donnée retournée.");

      imageItems.forEach((i) => URL.revokeObjectURL(i.preview));
      setForm({ ...INITIAL_FORM });
      setImageItems([]);
      setSuccess(
        `Produit « ${product.name} » enregistré (images dans Storage).`
      );
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: unknown) {
      console.error(err);
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Erreur pendant l'enregistrement.";
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem("admin");
    router.push("/admin/login");
  };

  if (!ready) {
    return (
      <div className="min-h-screen bg-[#0b1120] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
      </div>
    );
  }

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
      <header className="sticky top-0 z-50 border-b border-white/5 bg-[#0f172a]/95 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center shrink-0">
              <Smartphone className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base font-bold truncate">iPhone Credit BF</h1>
              <p className="text-[11px] text-slate-400">Panel d’administration</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={STOCK_PATH}
              className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Stock
            </Link>
            <button
              type="button"
              onClick={logout}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-red-400 px-3 py-1.5 rounded-lg"
            >
              <LogOut className="w-3.5 h-3.5" />
              Déconnexion
            </button>
          </div>
        </div>
      </header>

      <nav className="border-b border-white/5 bg-[#0f172a]/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex gap-1 overflow-x-auto py-2">
          {menu.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-medium whitespace-nowrap ${
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
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-8">
          <Link
            href={STOCK_PATH}
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-primary-300 mb-4"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Retour au stock
          </Link>
          <h2 className="text-2xl font-bold">Ajouter un produit</h2>
          <p className="text-sm text-slate-400 mt-1">
            Photos → bucket Storage <code className="text-primary-300">products</code>{" "}
            (pas de base64 en base).
          </p>
        </div>

        {success && (
          <div className="mb-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 flex gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
            <p className="text-sm text-emerald-300">{success}</p>
            <button type="button" onClick={() => setSuccess("")}>
              <X className="w-4 h-4 text-emerald-400" />
            </button>
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-red-300">
                Enregistrement impossible
              </p>
              <p className="text-xs text-red-300/80 mt-1 break-words">{error}</p>
            </div>
            <button type="button" onClick={() => setError("")}>
              <X className="w-4 h-4 text-red-400" />
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            <div className="lg:col-span-2 space-y-6">
              <section className="rounded-2xl bg-[#131c31] border border-white/5 overflow-hidden">
                <div className="px-5 py-4 border-b border-white/5">
                  <h3 className="text-sm font-bold">Informations du produit</h3>
                </div>
                <div className="p-5 space-y-5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-2">
                      Nom *
                    </label>
                    <input
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      placeholder="Ex : iPhone 13 Pro"
                      className="w-full rounded-xl bg-[#0b1120] border border-white/10 px-4 py-3 text-sm outline-none focus:border-primary-500"
                    />
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-2">
                        Prix *
                      </label>
                      <input
                        name="price"
                        type="number"
                        min="1"
                        value={form.price}
                        onChange={handleChange}
                        className="w-full rounded-xl bg-[#0b1120] border border-white/10 px-4 py-3 text-sm outline-none focus:border-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-2">
                        Stock *
                      </label>
                      <input
                        name="stock"
                        type="number"
                        min="0"
                        value={form.stock}
                        onChange={handleChange}
                        className="w-full rounded-xl bg-[#0b1120] border border-white/10 px-4 py-3 text-sm outline-none focus:border-primary-500"
                      />
                    </div>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-2">
                        Stockage *
                      </label>
                      <select
                        name="storage"
                        value={form.storage}
                        onChange={handleChange}
                        className="w-full rounded-xl bg-[#0b1120] border border-white/10 px-4 py-3 text-sm outline-none focus:border-primary-500"
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
                        className="w-full rounded-xl bg-[#0b1120] border border-white/10 px-4 py-3 text-sm outline-none focus:border-primary-500"
                      />
                    </div>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-2">
                        Grade *
                      </label>
                      <select
                        name="grade"
                        value={form.grade}
                        onChange={handleChange}
                        className="w-full rounded-xl bg-[#0b1120] border border-white/10 px-4 py-3 text-sm outline-none focus:border-primary-500"
                      >
                        <option value="Grade A+">Grade A+</option>
                        <option value="Grade A">Grade A</option>
                        <option value="Grade B">Grade B</option>
                        <option value="Grade C">Grade C</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-2">
                        Batterie %
                      </label>
                      <input
                        name="battery"
                        value={form.battery}
                        onChange={handleChange}
                        placeholder="86"
                        className="w-full rounded-xl bg-[#0b1120] border border-white/10 px-4 py-3 text-sm outline-none focus:border-primary-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-2">
                      Description *
                    </label>
                    <textarea
                      name="description"
                      value={form.description}
                      onChange={handleChange}
                      rows={5}
                      className="w-full resize-none rounded-xl bg-[#0b1120] border border-white/10 px-4 py-3 text-sm outline-none focus:border-primary-500"
                    />
                  </div>
                </div>
              </section>

              <section className="rounded-2xl bg-[#131c31] border border-white/5 overflow-hidden">
                <div className="px-5 py-4 border-b border-white/5 flex justify-between">
                  <div>
                    <h3 className="text-sm font-bold">Photos</h3>
                    <p className="text-[11px] text-slate-500">
                      Max 6 • max 2 Mo chacune • stockées dans Storage
                    </p>
                  </div>
                  <span className="text-[10px] text-slate-500">
                    {imageItems.length}/6
                  </span>
                </div>
                <div className="p-5">
                  {imageItems.length < 6 && (
                    <label className="flex flex-col items-center justify-center min-h-[140px] rounded-2xl border-2 border-dashed border-white/10 cursor-pointer hover:border-primary-500/50">
                      <ImagePlus className="w-8 h-8 text-slate-500 mb-2" />
                      <span className="text-sm text-slate-300">
                        Ajouter des photos
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
                  {imageItems.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
                      {imageItems.map((item, index) => (
                        <div
                          key={item.id}
                          className="relative aspect-square rounded-xl overflow-hidden border border-white/10 group"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={item.preview}
                            alt={`Photo ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => removeImage(item.id)}
                            className="absolute top-2 right-2 w-8 h-8 rounded-lg bg-black/70 flex items-center justify-center opacity-0 group-hover:opacity-100"
                          >
                            <X className="w-4 h-4" />
                          </button>
                          {index === 0 && (
                            <span className="absolute bottom-2 left-2 bg-primary-600 text-[9px] px-2 py-1 rounded-md">
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

            <aside className="lg:col-span-1">
              <div className="lg:sticky lg:top-28 space-y-6">
                <section className="rounded-2xl bg-[#131c31] border border-white/5 p-5">
                  <div className="aspect-square rounded-2xl bg-[#0b1120] overflow-hidden mb-4 flex items-center justify-center">
                    {imageItems[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={imageItems[0].preview}
                        alt="Aperçu"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Smartphone className="w-16 h-16 text-slate-700" />
                    )}
                  </div>
                  <h4 className="font-bold truncate">
                    {form.name || "Nom du produit"}
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">
                    {form.storage || "Stockage"}
                    {form.color && ` • ${form.color}`}
                  </p>
                </section>

                <section className="rounded-2xl border border-primary-500/20 bg-primary-600/10 p-5">
                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary-600 hover:bg-primary-500 disabled:opacity-50 py-3.5 text-sm font-semibold"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Upload + enregistrement...
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
                    className="w-full mt-2 flex items-center justify-center gap-2 rounded-xl bg-white/5 py-3 text-xs text-slate-300"
                  >
                    <RefreshCcw className="w-3.5 h-3.5" />
                    Réinitialiser
                  </button>
                </section>
              </div>
            </aside>
          </div>
        </form>
      </main>
    </div>
  );
}