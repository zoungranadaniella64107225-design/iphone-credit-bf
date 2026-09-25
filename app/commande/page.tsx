"use client";

import Link from "next/link";
import Image from "next/image";
import { useSearchParams, useRouter } from "next/navigation";
import { useState, Suspense, useRef } from "react";
import {
  ArrowLeft,
  ArrowRight,
  User,
  Phone,
  MapPin,
  FileText,
  Upload,
  AlertCircle,
  Camera,
  CheckCircle,
  Shield,
  X,
} from "lucide-react";

const allPhones = [
  {
    id: 1,
    name: "iPhone 13",
    price: 180000,
    storage: "128 Go",
    color: "Minuit",
    image: "/images/products/iphone1.jpg",
  },
  {
    id: 2,
    name: "iPhone 12",
    price: 150000,
    storage: "64 Go",
    color: "Noir",
    image: "/images/products/iphone2.jpg",
  },
  {
    id: 3,
    name: "iPhone 11",
    price: 120000,
    storage: "64 Go",
    color: "Blanc",
    image: "/images/products/iphone3.jpg",
  },
  {
    id: 4,
    name: "iPhone 13 Pro",
    price: 220000,
    storage: "128 Go",
    color: "Graphite",
    image: "/images/products/iphone4.jpg",
  },
];

// Fonction simple de détection de flou
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

      // Réduire la taille pour performance
      const maxSize = 300;
      const scale = Math.min(maxSize / img.width, maxSize / img.height);
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      // Calcul de variance (Laplacian approximatif)
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

      // Seuil empirique : plus la variance est basse, plus c'est flou
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

  const produitId = Number(searchParams.get("produit"));
  const mode = searchParams.get("mode") || "credit";
  const accepte = searchParams.get("accepte");

  const phone = allPhones.find((p) => p.id === produitId);

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
            href={produitId ? `/conditions?produit=${produitId}&mode=${mode}` : "/catalogue"}
            className="inline-flex items-center gap-2 bg-primary-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl"
          >
            Voir les conditions
          </Link>
        </div>
      </div>
    );
  }

  if (!phone) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-500 mb-4">Produit introuvable</p>
          <Link href="/catalogue" className="text-primary-600 font-medium">
            Retour au catalogue
          </Link>
        </div>
      </div>
    );
  }

  const downPayment = Math.round(phone.price * 0.5);
  const deposit = Math.round(phone.price * 0.1);
  const totalBefore = downPayment + deposit;
  const remaining = phone.price - downPayment;

  const formatPrice = (price: number) => price.toLocaleString("fr-FR") + " F";

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleImageUpload = async (
    file: File | null,
    type: "recto" | "verso"
  ) => {
    if (!file) return;

    // Vérifier le type
    if (!file.type.startsWith("image/")) {
      if (type === "recto") setRectoError("Seules les images sont acceptées");
      else setVersoError("Seules les images sont acceptées");
      return;
    }

    // Vérifier la taille (max 8 Mo)
    if (file.size > 8 * 1024 * 1024) {
      if (type === "recto") setRectoError("Image trop lourde (max 8 Mo)");
      else setVersoError("Image trop lourde (max 8 Mo)");
      return;
    }

    // Détection de flou
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

    // OK
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: string[] = [];

    if (!form.fullName.trim()) newErrors.push("Le nom complet est obligatoire");
    if (!form.phone.trim() || form.phone.length < 8) {
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

    // Simulation (plus tard → Supabase)
    setTimeout(() => {
      setLoading(false);
      router.push(`/commande/confirmation?produit=${phone.id}&mode=${mode}`);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      
      {/* Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-4 py-5">
          <Link
            href={`/produit/${phone.id}`}
            className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-primary-600 mb-3"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Retour
          </Link>
          <h1 className="text-xl font-bold text-gray-900">Finaliser la commande</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Étape 1/3 — Informations & identité
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6">
        
        {/* Erreurs globales */}
        {errors.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-5">
            <p className="text-sm font-semibold text-red-800 mb-2">
              Veuillez corriger :
            </p>
            <ul className="space-y-1">
              {errors.map((err, i) => (
                <li key={i} className="text-xs text-red-700 flex items-center gap-1.5">
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
            <Image
              src={phone.image}
              alt={phone.name}
              fill
              className="object-cover"
              sizes="80px"
            />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-gray-900">{phone.name}</h3>
            <p className="text-xs text-gray-500">
              {phone.storage} • {phone.color}
            </p>
            <p className="text-sm font-bold text-primary-600 mt-1">
              {formatPrice(phone.price)}
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

        {/* Récap crédit */}
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

        {/* Formulaire */}
        <form onSubmit={handleSubmit} className="space-y-5">
          
          {/* Identité */}
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
                  placeholder="Ex: Commerçant, Étudiant, Salarié..."
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
                  placeholder="Ex: 50 000 F / mois ou 2 000 F / jour"
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
          </div>

          {/* Adresse détaillée */}
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
                  placeholder="Ex: Secteur 15, Ouaga 2000, Dassasgho..."
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
                  placeholder="Ex: Derrière la station Total, maison bleue"
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
          </div>

          {/* Contacts de référence */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <Phone className="w-4 h-4 text-primary-600" />
              <h2 className="text-sm font-bold text-gray-900">Contacts de référence</h2>
            </div>
            <p className="text-xs text-gray-500 mb-3">
              Au moins un contact proche (parent, ami, collègue…).
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

          {/* Upload CNIB avec caméra + détection flou */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4 text-primary-600" />
              <h2 className="text-sm font-bold text-gray-900">Pièce d’identité (CNIB)</h2>
            </div>
            
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 text-xs text-amber-800">
              <p className="font-semibold mb-1">Conseils pour une bonne photo :</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>Placez la CNIB sur une surface plane et bien éclairée</li>
                <li>Évitez les reflets et les ombres</li>
                <li>Le texte doit être parfaitement lisible</li>
                <li>Le système refuse automatiquement les photos floues</li>
              </ul>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* RECTO */}
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
                        setRectoError("");
                      }}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                    <div className="absolute bottom-2 left-2 bg-green-500 text-white text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      Acceptée
                    </div>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-primary-300 hover:bg-primary-50/30 transition-all">
                    <Camera className="w-7 h-7 text-gray-400 mb-1" />
                    <span className="text-xs text-gray-500 text-center px-2">
                      Prendre ou choisir une photo
                    </span>
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
                  <p className="text-xs text-red-600 mt-1.5 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {rectoError}
                  </p>
                )}
              </div>

              {/* VERSO */}
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
                        setVersoError("");
                      }}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                    <div className="absolute bottom-2 left-2 bg-green-500 text-white text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      Acceptée
                    </div>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-primary-300 hover:bg-primary-50/30 transition-all">
                    <Camera className="w-7 h-7 text-gray-400 mb-1" />
                    <span className="text-xs text-gray-500 text-center px-2">
                      Prendre ou choisir une photo
                    </span>
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
                  <p className="text-xs text-red-600 mt-1.5 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {versoError}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Sécurité */}
          <div className="bg-primary-50 border border-primary-100 rounded-xl p-4 flex gap-3">
            <Shield className="w-5 h-5 text-primary-600 shrink-0 mt-0.5" />
            <div className="text-xs text-primary-800">
              <p className="font-semibold mb-1">Vos données sont protégées</p>
              <p>
                Les photos de CNIB et vos informations ne seront utilisées que pour 
                cette commande et la vérification d’identité. Elles ne seront jamais partagées.
              </p>
            </div>
          </div>

          {/* Bouton */}
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-accent-400 hover:bg-accent-500 text-white font-semibold text-sm py-3.5 rounded-xl shadow-lg shadow-accent-400/25 transition-all active:scale-[0.98] disabled:opacity-60"
          >
            {loading ? (
              "Vérification en cours..."
            ) : (
              <>
                Continuer vers le contrat
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