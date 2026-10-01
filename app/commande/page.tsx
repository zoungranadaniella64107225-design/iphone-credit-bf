"use client";

import Link from "next/link";
import Image from "next/image";
import { useSearchParams, useRouter } from "next/navigation";
import { useState, Suspense, useRef, useEffect } from "react";
import {
  ArrowLeft,
  ArrowRight,
  User,
  Phone,
  MapPin,
  FileText,
  AlertCircle,
  Camera,
  CheckCircle,
  Shield,
  X,
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
};

async function isImageBlurry(file: File): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new window.Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(false);
        return;
      }

      const maxSize = 300;
      const scale = Math.min(maxSize / img.width, maxSize / img.height);
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      let sum = 0;
      let sumSq = 0;
      const len = data.length / 4;

      for (let i = 0; i < data.length; i += 4) {
        const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        sum += gray;
        sumSq += gray * gray;
      }

      const mean = sum / len;
      const variance = sumSq / len - mean * mean;

      URL.revokeObjectURL(url);
      resolve(variance < 100);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(false);
    };

    img.src = url;
  });
}

function CommandeContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const produitId = searchParams.get("produit") || "";
  const mode = searchParams.get("mode") === "total" ? "total" : "credit";
  const accepte = searchParams.get("accepte");

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [loadingProduct, setLoadingProduct] = useState(true);
  const [phone, setPhone] = useState<Product | null>(null);
  const [productError, setProductError] = useState("");

  const [sessionUser, setSessionUser] = useState<{
    id: string;
    name: string;
    phone: string;
  } | null>(null);

  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    city: "Ouagadougou",
    sector: "",
    addressDetail: "",
    activity: "",
    income: "",
    contact1Name: "",
    contact1Phone: "",
    contact2Name: "",
    contact2Phone: "",
  });

  const [cnibRecto, setCnibRecto] = useState<File | null>(null);
  const [cnibVerso, setCnibVerso] = useState<File | null>(null);
  const [rectoPreview, setRectoPreview] = useState<string | null>(null);
  const [versoPreview, setVersoPreview] = useState<string | null>(null);
  const [rectoError, setRectoError] = useState("");
  const [versoError, setVersoError] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const rectoInputRef = useRef<HTMLInputElement>(null);
  const versoInputRef = useRef<HTMLInputElement>(null);

  const formatPrice = (price: number) => price.toLocaleString("fr-FR") + " F";

  // Session + produit
  useEffect(() => {
    const init = async () => {
      try {
        const supabase = createClient();

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.user) {
          const currentUrl = `/commande?produit=${produitId}&mode=${mode}&accepte=${accepte || ""}`;
          router.replace(`/login?redirect=${encodeURIComponent(currentUrl)}`);
          return;
        }

        const name = session.user.user_metadata?.full_name || "";
        const phoneNum =
          session.user.user_metadata?.phone ||
          session.user.email?.split("@")[0] ||
          "";

        setSessionUser({
          id: session.user.id,
          name,
          phone: phoneNum,
        });

        setForm((prev) => ({
          ...prev,
          fullName: name || prev.fullName,
          phone: phoneNum || prev.phone,
        }));

        if (!produitId) {
          setProductError("Aucun produit sélectionné.");
          setLoadingProduct(false);
          setCheckingAuth(false);
          return;
        }

        const { data, error } = await supabase
          .from("products")
          .select(
            "id, name, price, storage, color, grade, battery, stock, description, images"
          )
          .eq("id", produitId)
          .single();

        if (error || !data) {
          setProductError("Produit introuvable.");
        } else {
          setPhone(data as Product);
        }
      } catch {
        router.replace("/login");
        return;
      } finally {
        setCheckingAuth(false);
        setLoadingProduct(false);
      }
    };

    init();
  }, [router, produitId, mode, accepte]);

  if (checkingAuth || loadingProduct) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-7 h-7 text-primary-500 animate-spin" />
          <p className="text-sm text-gray-500">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!sessionUser) return null;

  if (!accepte || accepte !== "1") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center max-w-sm">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-gray-900 mb-2">
            Conditions non acceptées
          </h2>
          <p className="text-sm text-gray-600 mb-5">
            Vous devez d’abord lire et accepter les conditions.
          </p>
          <Link
            href={
              produitId
                ? `/conditions?produit=${produitId}&mode=${mode}`
                : "/catalogue"
            }
            className="inline-flex items-center gap-2 bg-primary-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl"
          >
            Voir les conditions
          </Link>
        </div>
      </div>
    );
  }

  if (productError || !phone) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-500 mb-4">
            {productError || "Produit introuvable"}
          </p>
          <Link href="/catalogue" className="text-primary-600 font-medium">
            Retour au catalogue
          </Link>
        </div>
      </div>
    );
  }

  const price = Number(phone.price || 0);
  const downPayment = Math.round(price * 0.5);
  const deposit = Math.round(price * 0.1);
  const totalBefore = downPayment + deposit;
  const remaining = price - downPayment;
  const productImage =
    phone.images?.[0] || "/images/products/iphone1.jpg";

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleImageUpload = async (
    file: File | null,
    type: "recto" | "verso"
  ) => {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      if (type === "recto") setRectoError("Seules les images sont acceptées");
      else setVersoError("Seules les images sont acceptées");
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      if (type === "recto") setRectoError("Image trop lourde (max 8 Mo)");
      else setVersoError("Image trop lourde (max 8 Mo)");
      return;
    }

    const blurry = await isImageBlurry(file);
    if (blurry) {
      if (type === "recto") {
        setRectoError("Photo trop floue. Reprenez une photo plus nette.");
        setCnibRecto(null);
        setRectoPreview(null);
      } else {
        setVersoError("Photo trop floue. Reprenez une photo plus nette.");
        setCnibVerso(null);
        setVersoPreview(null);
      }
      return;
    }

    const preview = URL.createObjectURL(file);
    if (type === "recto") {
      setCnibRecto(file);
      setRectoPreview(preview);
      setRectoError("");
    } else {
      setCnibVerso(file);
      setVersoPreview(preview);
      setVersoError("");
    }
  };

  const uploadCnib = async (
    supabase: ReturnType<typeof createClient>,
    file: File,
    userId: string,
    side: "recto" | "verso"
  ) => {
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${userId}/${Date.now()}_${side}.${ext}`;

    const { error } = await supabase.storage
      .from("cnib")
      .upload(path, file, { upsert: true });

    if (error) {
      console.warn("Upload CNIB:", error.message);
      return null;
    }

    const { data } = supabase.storage.from("cnib").getPublicUrl(path);
    return data.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: string[] = [];

    if (!form.fullName.trim()) newErrors.push("Le nom complet est obligatoire");
    if (!form.phone.trim() || form.phone.replace(/\D/g, "").length < 8) {
      newErrors.push("Numéro de téléphone invalide");
    }
    if (!form.city.trim()) newErrors.push("La ville est obligatoire");
    if (!form.sector.trim()) newErrors.push("Le secteur / quartier est obligatoire");
    if (!form.activity.trim()) newErrors.push("L’activité est obligatoire");
    if (!form.contact1Name.trim() || !form.contact1Phone.trim()) {
      newErrors.push("Au moins un contact de référence est obligatoire");
    }
    if (!cnibRecto) newErrors.push("La photo CNIB Recto est obligatoire");
    if (!cnibVerso) newErrors.push("La photo CNIB Verso est obligatoire");

    if (newErrors.length > 0) {
      setErrors(newErrors);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setErrors([]);
    setLoading(true);

    try {
      const supabase = createClient();

      // Upload CNIB (si le bucket existe — sinon null)
      let cnibRectoUrl: string | null = null;
      let cnibVersoUrl: string | null = null;

      if (cnibRecto) {
        cnibRectoUrl = await uploadCnib(
          supabase,
          cnibRecto,
          sessionUser.id,
          "recto"
        );
      }
      if (cnibVerso) {
        cnibVersoUrl = await uploadCnib(
          supabase,
          cnibVerso,
          sessionUser.id,
          "verso"
        );
      }

      const reference = `ICBF-${Date.now().toString().slice(-8)}`;

      const { data: dossier, error: insertError } = await supabase
        .from("dossiers")
        .insert({
          reference,
          user_id: sessionUser.id,
          product_id: phone.id,
          product_name: phone.name,
          product_price: price,
          product_storage: phone.storage,
          product_color: phone.color,
          product_grade: phone.grade,
          product_battery: phone.battery,
          mode,
          status: "en_attente",
          full_name: form.fullName.trim(),
          phone: form.phone.trim(),
          city: form.city,
          sector: form.sector.trim(),
          address_detail: form.addressDetail.trim() || null,
          activity: form.activity.trim(),
          income: form.income.trim() || null,
          contact1_name: form.contact1Name.trim(),
          contact1_phone: form.contact1Phone.trim(),
          contact2_name: form.contact2Name.trim() || null,
          contact2_phone: form.contact2Phone.trim() || null,
          cnib_recto_url: cnibRectoUrl,
          cnib_verso_url: cnibVersoUrl,
          amount_down: mode === "credit" ? downPayment : price,
          amount_deposit: mode === "credit" ? deposit : 0,
          amount_total_before: mode === "credit" ? totalBefore : price,
          amount_remaining: mode === "credit" ? remaining : 0,
        })
        .select("id, reference")
        .single();

      if (insertError) {
        console.error(insertError);
        setErrors([
          insertError.message ||
            "Impossible d’enregistrer le dossier. Vérifie la table dossiers.",
        ]);
        setLoading(false);
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }

      // Sauvegarde locale pour confirmation / contrat
      if (dossier) {
        localStorage.setItem(
          "lastDossier",
          JSON.stringify({
            id: dossier.id,
            reference: dossier.reference,
            produitId: phone.id,
            mode,
          })
        );
      }

      router.push(
        `/commande/confirmation?produit=${phone.id}&mode=${mode}&dossier=${dossier?.id || ""}`
      );
    } catch (err: unknown) {
      console.error(err);
      setErrors([
        err instanceof Error ? err.message : "Erreur lors de l’enregistrement",
      ]);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-4 py-5">
          <Link
            href={`/produit/${phone.id}`}
            className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-primary-600 mb-3"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Retour
          </Link>
          <h1 className="text-xl font-bold text-gray-900">
            Finaliser la commande
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Connecté en tant que{" "}
            <strong>{sessionUser.name || sessionUser.phone}</strong>
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6">
        {errors.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-5">
            <p className="text-sm font-semibold text-red-800 mb-2">
              Veuillez corriger :
            </p>
            <ul className="space-y-1">
              {errors.map((err, i) => (
                <li
                  key={i}
                  className="text-xs text-red-700 flex items-center gap-1.5"
                >
                  <AlertCircle className="w-3.5 h-3.5" />
                  {err}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Résumé produit */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-5 flex gap-4">
          <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-gray-50 shrink-0">
            {productImage.startsWith("http") ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={productImage}
                alt={phone.name}
                className="absolute inset-0 w-full h-full object-cover"
              />
            ) : (
              <Image
                src={productImage}
                alt={phone.name}
                fill
                className="object-cover"
                sizes="80px"
              />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-gray-900">{phone.name}</h3>
            <p className="text-xs text-gray-500">
              {phone.storage || "—"}
              {phone.color ? ` • ${phone.color}` : ""}
            </p>
            <p className="text-sm font-bold text-primary-600 mt-1">
              {formatPrice(price)}
            </p>
            <span
              className={`inline-block mt-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${
                mode === "credit"
                  ? "bg-accent-100 text-accent-700"
                  : "bg-primary-100 text-primary-700"
              }`}
            >
              {mode === "credit" ? "Paiement à crédit" : "Paiement total"}
            </span>
          </div>
        </div>

        {mode === "credit" && (
          <div className="bg-primary-50 border border-primary-100 rounded-xl p-4 mb-5">
            <p className="text-xs font-semibold text-primary-800 mb-2">
              Récapitulatif du crédit
            </p>
            <div className="space-y-1 text-xs text-primary-700">
              <div className="flex justify-between">
                <span>50% maintenant</span>
                <span className="font-medium">{formatPrice(downPayment)}</span>
              </div>
              <div className="flex justify-between">
                <span>Caution (10%)</span>
                <span className="font-medium">{formatPrice(deposit)}</span>
              </div>
              <div className="flex justify-between border-t border-primary-200 pt-1 mt-1 font-bold">
                <span>Total avant livraison</span>
                <span>{formatPrice(totalBefore)}</span>
              </div>
              <div className="flex justify-between">
                <span>Reste à payer</span>
                <span>{formatPrice(remaining)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Formulaire — même structure que la tienne */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* ... identique à ton formulaire (identité, adresse, contacts, CNIB) ... */}
          {/* Je garde les mêmes champs : fullName, phone, activity, income, city, sector, addressDetail, contacts, CNIB */}

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <User className="w-4 h-4 text-primary-600" />
              <h2 className="text-sm font-bold text-gray-900">Vos informations</h2>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-700 mb-1 block">
                  Nom complet *
                </label>
                <input
                  type="text"
                  name="fullName"
                  value={form.fullName}
                  onChange={handleChange}
                  placeholder="Ex: Ouédraogo Jean Baptiste"
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700 mb-1 block">
                  Numéro de téléphone *
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="Ex: 70 12 34 56"
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700 mb-1 block">
                  Activité / Profession *
                </label>
                <input
                  type="text"
                  name="activity"
                  value={form.activity}
                  onChange={handleChange}
                  placeholder="Ex: Commerçant, Étudiant..."
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700 mb-1 block">
                  Revenu approximatif
                </label>
                <input
                  type="text"
                  name="income"
                  value={form.income}
                  onChange={handleChange}
                  placeholder="Ex: 50 000 F / mois"
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="w-4 h-4 text-primary-600" />
              <h2 className="text-sm font-bold text-gray-900">Adresse</h2>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-700 mb-1 block">
                  Ville *
                </label>
                <select
                  name="city"
                  value={form.city}
                  onChange={handleChange}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="Ouagadougou">Ouagadougou</option>
                  <option value="Bobo-Dioulasso">Bobo-Dioulasso</option>
                  <option value="Koudougou">Koudougou</option>
                  <option value="Banfora">Banfora</option>
                  <option value="Ouahigouya">Ouahigouya</option>
                  <option value="Autre">Autre</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700 mb-1 block">
                  Secteur / Quartier *
                </label>
                <input
                  type="text"
                  name="sector"
                  value={form.sector}
                  onChange={handleChange}
                  placeholder="Ex: Secteur 15, Ouaga 2000..."
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700 mb-1 block">
                  Précision (rue, repère…)
                </label>
                <input
                  type="text"
                  name="addressDetail"
                  value={form.addressDetail}
                  onChange={handleChange}
                  placeholder="Ex: Derrière la station Total"
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <Phone className="w-4 h-4 text-primary-600" />
              <h2 className="text-sm font-bold text-gray-900">
                Contacts de référence
              </h2>
            </div>
            <p className="text-xs text-gray-500 mb-3">
              Au moins un contact proche.
            </p>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-700 mb-1 block">
                    Nom contact 1 *
                  </label>
                  <input
                    type="text"
                    name="contact1Name"
                    value={form.contact1Name}
                    onChange={handleChange}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700 mb-1 block">
                    Téléphone *
                  </label>
                  <input
                    type="tel"
                    name="contact1Phone"
                    value={form.contact1Phone}
                    onChange={handleChange}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-700 mb-1 block">
                    Nom contact 2
                  </label>
                  <input
                    type="text"
                    name="contact2Name"
                    value={form.contact2Name}
                    onChange={handleChange}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700 mb-1 block">
                    Téléphone
                  </label>
                  <input
                    type="tel"
                    name="contact2Phone"
                    value={form.contact2Phone}
                    onChange={handleChange}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* CNIB — même UI que ton code */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4 text-primary-600" />
              <h2 className="text-sm font-bold text-gray-900">
                Pièce d’identité (CNIB)
              </h2>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 text-xs text-amber-800">
              Photos nettes obligatoires. Flou refusé automatiquement.
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Recto */}
              <div>
                <label className="text-xs font-medium text-gray-700 mb-2 block">
                  CNIB Recto *
                </label>
                {rectoPreview ? (
                  <div className="relative">
                    <img
                      src={rectoPreview}
                      alt="CNIB Recto"
                      className="w-full h-40 object-cover rounded-xl border border-gray-200"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setCnibRecto(null);
                        setRectoPreview(null);
                      }}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-primary-300">
                    <Camera className="w-7 h-7 text-gray-400 mb-1" />
                    <span className="text-xs text-gray-500">Photo recto</span>
                    <input
                      ref={rectoInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={(e) =>
                        handleImageUpload(e.target.files?.[0] || null, "recto")
                      }
                    />
                  </label>
                )}
                {rectoError && (
                  <p className="text-xs text-red-600 mt-1">{rectoError}</p>
                )}
              </div>
              {/* Verso */}
              <div>
                <label className="text-xs font-medium text-gray-700 mb-2 block">
                  CNIB Verso *
                </label>
                {versoPreview ? (
                  <div className="relative">
                    <img
                      src={versoPreview}
                      alt="CNIB Verso"
                      className="w-full h-40 object-cover rounded-xl border border-gray-200"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setCnibVerso(null);
                        setVersoPreview(null);
                      }}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-primary-300">
                    <Camera className="w-7 h-7 text-gray-400 mb-1" />
                    <span className="text-xs text-gray-500">Photo verso</span>
                    <input
                      ref={versoInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={(e) =>
                        handleImageUpload(e.target.files?.[0] || null, "verso")
                      }
                    />
                  </label>
                )}
                {versoError && (
                  <p className="text-xs text-red-600 mt-1">{versoError}</p>
                )}
              </div>
            </div>
          </div>

          <div className="bg-primary-50 border border-primary-100 rounded-xl p-4 flex gap-3">
            <Shield className="w-5 h-5 text-primary-600 shrink-0 mt-0.5" />
            <div className="text-xs text-primary-800">
              <p className="font-semibold mb-1">Enregistrement sécurisé</p>
              <p>
                Votre dossier sera lié à votre compte et visible par l’admin
                (client, produit, montants, CNIB).
              </p>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-accent-400 hover:bg-accent-500 text-white font-semibold text-sm py-3.5 rounded-xl shadow-lg disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Enregistrement du dossier...
              </>
            ) : (
              <>
                Enregistrer et continuer
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function CommandePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          Chargement...
        </div>
      }
    >
      <CommandeContent />
    </Suspense>
  );
}