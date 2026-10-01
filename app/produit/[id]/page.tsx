"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Star,
  ArrowLeft,
  ArrowRight,
  Shield,
  CreditCard,
  CheckCircle,
  Truck,
  Battery,
  Smartphone,
  ChevronRight,
  Package,
  Lock,
  Loader2,
  AlertTriangle,
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

type OpenDossier = {
  id: string;
  status: string;
  mode: string;
  reference: string;
};

/** Statuts d’un parcours encore ouvert (pas terminé / pas refusé) */
const OPEN_STATUSES = [
  "en_attente",
  "valide",
  "contrat_en_attente",
  "contrat_refuse",
  "pret_paiement",
];

function resumePath(d: OpenDossier, productId: string) {
  const q = `produit=${productId}&mode=${d.mode}&dossier=${d.id}`;

  switch (d.status) {
    case "en_attente":
    case "valide":
    case "contrat_en_attente":
    case "contrat_refuse":
      return `/contrat?${q}`;
    case "pret_paiement":
      return `/paiement?${q}`;
    case "paye":
    case "livre":
      return `/client`;
    default:
      return `/contrat?${q}`;
  }
}

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = String(params.id || "");

  const [phone, setPhone] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [paymentMode, setPaymentMode] = useState<"credit" | "total">("credit");
  const [selectedImage, setSelectedImage] = useState(0);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [openDossier, setOpenDossier] = useState<OpenDossier | null>(null);
  const [buying, setBuying] = useState(false);
  const [buyError, setBuyError] = useState("");

  const formatPrice = (price: number) =>
    price.toLocaleString("fr-FR") + " F";

  // Produit
  useEffect(() => {
    if (!id) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    const loadProduct = async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("products")
          .select(
            "id, name, price, storage, color, grade, battery, stock, description, images, created_at"
          )
          .eq("id", id)
          .single();

        if (error || !data) {
          setNotFound(true);
          setPhone(null);
        } else {
          setPhone(data as Product);
          setSelectedImage(0);
        }
      } catch (err) {
        console.error(err);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };

    loadProduct();
  }, [id]);

  // Session + dossier en cours
  useEffect(() => {
    const check = async () => {
      try {
        const supabase = createClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();

        const logged = !!session?.user;
        setIsLoggedIn(logged);

        if (session?.user && id) {
          const { data } = await supabase
            .from("dossiers")
            .select("id, status, mode, reference")
            .eq("user_id", session.user.id)
            .eq("product_id", Number(id) || id)
            .in("status", OPEN_STATUSES)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          setOpenDossier(data ? (data as OpenDossier) : null);
        } else {
          setOpenDossier(null);
        }
      } catch {
        setIsLoggedIn(false);
        setOpenDossier(null);
      } finally {
        setCheckingAuth(false);
      }
    };

    check();

    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      check();
    });

    return () => subscription.unsubscribe();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
          <p className="text-sm text-gray-500">Chargement du produit...</p>
        </div>
      </div>
    );
  }

  if (notFound || !phone) {
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

  const price = Number(phone.price || 0);
  const stock = Number(phone.stock || 0);
  const images =
    phone.images && phone.images.length > 0
      ? phone.images
      : ["/images/products/iphone1.jpg"];

  const downPayment = Math.round(price * 0.5);
  const deposit = Math.round(price * 0.1);
  const totalBefore = downPayment + deposit;
  const remaining = price - downPayment;
  const inStock = stock > 0;

  /**
   * Clic achat :
   * 1) Reprendre dossier existant (même si stock 0 — déjà engagé)
   * 2) Nouveau parcours → re-vérifier le stock EN DIRECT dans Supabase
   */
  const handleBuy = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (buying) return;

    setBuyError("");

    if (!isLoggedIn) {
      router.push(
        `/login?redirect=${encodeURIComponent(`/produit/${phone.id}`)}`
      );
      return;
    }

    setBuying(true);

    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        router.push(
          `/login?redirect=${encodeURIComponent(`/produit/${phone.id}`)}`
        );
        return;
      }

      // Dossier déjà en cours → reprendre (pas besoin de stock pour continuer)
      const { data: existing } = await supabase
        .from("dossiers")
        .select("id, status, mode, reference")
        .eq("user_id", session.user.id)
        .eq("product_id", Number(phone.id) || phone.id)
        .in("status", OPEN_STATUSES)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existing) {
        localStorage.setItem(
          "lastDossier",
          JSON.stringify({
            id: existing.id,
            reference: existing.reference,
            produitId: phone.id,
            mode: existing.mode,
          })
        );
        router.push(resumePath(existing as OpenDossier, phone.id));
        return;
      }

      // ========== NOUVEAU PARCOURS → STOCK OBLIGATOIRE ==========
      const { data: fresh, error: stockErr } = await supabase
        .from("products")
        .select("id, stock, name")
        .eq("id", phone.id)
        .single();

      if (stockErr || !fresh) {
        setBuyError("Impossible de vérifier le stock. Réessayez.");
        return;
      }

      const liveStock = Number(fresh.stock || 0);

      // Mettre à jour l’affichage local
      setPhone((prev) =>
        prev ? { ...prev, stock: liveStock } : prev
      );

      if (liveStock <= 0) {
        setBuyError(
          "Rupture de stock : ce modèle n’est plus disponible. Choisissez un autre iPhone."
        );
        return;
      }

      // Stock OK → conditions
      router.push(
        `/conditions?produit=${encodeURIComponent(phone.id)}&mode=${paymentMode}`
      );
    } catch (err) {
      console.error(err);
      setBuyError("Une erreur est survenue. Réessayez.");
    } finally {
      setBuying(false);
    }
  };

  const renderImg = (src: string, alt: string, className?: string) => {
    if (src.startsWith("http")) {
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          className={className || "absolute inset-0 w-full h-full object-cover"}
        />
      );
    }
    return (
      <Image
        src={src}
        alt={alt}
        fill
        className={className || "object-cover"}
        sizes="(max-width: 1024px) 100vw, 50vw"
        priority
      />
    );
  };

  const buttonLabel = !inStock
    ? "Rupture de stock"
    : openDossier
    ? openDossier.status === "pret_paiement"
      ? "Reprendre le paiement"
      : "Reprendre ma commande"
    : paymentMode === "credit"
    ? "Commencer le crédit"
    : "Acheter maintenant";

  // Nouveau parcours bloqué si pas de stock ; reprise toujours possible
  const canClick =
    openDossier || inStock
      ? !buying
      : false;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Link href="/" className="hover:text-primary-600">
              Accueil
            </Link>
            <ChevronRight className="w-3 h-3" />
            <Link href="/catalogue" className="hover:text-primary-600">
              Catalogue
            </Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-gray-900 font-medium">{phone.name}</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 sm:py-10">
        <div className="grid lg:grid-cols-2 gap-6 lg:gap-10">
          {/* Galerie */}
          <div>
            <div className="bg-white rounded-2xl p-3 border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.04)] mb-3">
              <div className="relative aspect-square rounded-xl overflow-hidden bg-gray-50">
                {renderImg(
                  images[selectedImage] || images[0],
                  `${phone.name} photo ${selectedImage + 1}`
                )}
              </div>
            </div>

            {images.length > 1 && (
              <div className="grid grid-cols-3 gap-2">
                {images.map((img, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImage(index)}
                    className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all ${
                      selectedImage === index
                        ? "border-primary-500 shadow-md"
                        : "border-gray-100 hover:border-gray-300"
                    }`}
                  >
                    {img.startsWith("http") ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={img}
                        alt={`${phone.name} vue ${index + 1}`}
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    ) : (
                      <Image
                        src={img}
                        alt={`${phone.name} vue ${index + 1}`}
                        fill
                        className="object-cover"
                        sizes="120px"
                      />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Infos */}
          <div>
            <Link
              href="/catalogue"
              className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-primary-600 mb-3"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Retour au catalogue
            </Link>

            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
              {phone.name}
            </h1>

            <div className="flex items-center gap-2 mb-4">
              <div className="flex items-center gap-0.5 text-accent-400">
                <Star className="w-4 h-4 fill-current" />
                <span className="text-sm font-medium text-gray-700">4.8</span>
              </div>
              <span className="text-gray-300">•</span>
              <span className="text-sm text-gray-500">
                {phone.storage || "—"}
                {phone.color ? ` • ${phone.color}` : ""}
              </span>
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              {phone.grade && (
                <span className="inline-flex items-center gap-1 bg-primary-50 text-primary-700 text-xs font-medium px-2.5 py-1 rounded-lg border border-primary-100">
                  <Smartphone className="w-3 h-3" />
                  {phone.grade}
                </span>
              )}
              {phone.battery && (
                <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 text-xs font-medium px-2.5 py-1 rounded-lg border border-green-100">
                  <Battery className="w-3 h-3" />
                  Batterie {phone.battery}
                </span>
              )}
              <span
                className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-lg border ${
                  inStock
                    ? "bg-green-50 text-green-700 border-green-100"
                    : "bg-red-50 text-red-700 border-red-100"
                }`}
              >
                <Package className="w-3 h-3" />
                {inStock ? `En stock (${stock})` : "Rupture de stock"}
              </span>
            </div>

            {!inStock && !openDossier && (
              <div className="flex gap-2 bg-red-50 border border-red-200 text-red-800 text-xs rounded-xl p-3 mb-4">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <p>
                  Ce modèle n’est plus disponible. Vous ne pouvez pas démarrer
                  une nouvelle commande. Parcourez le catalogue pour un autre
                  iPhone.
                </p>
              </div>
            )}

            <p className="text-sm text-gray-600 mb-5 leading-relaxed">
              {phone.description ||
                "iPhone reconditionné de qualité, testé et prêt à l’emploi."}
            </p>

            <div className="mb-5">
              <p className="text-2xl sm:text-3xl font-bold text-primary-600">
                {formatPrice(price)}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">Prix total</p>
            </div>

            {openDossier && (
              <div className="bg-primary-50 border border-primary-200 rounded-xl p-3 mb-4 text-xs text-primary-800">
                <p className="font-semibold">
                  Commande en cours — #{openDossier.reference}
                </p>
                <p className="mt-0.5">
                  Statut : {openDossier.status.replace(/_/g, " ")}. Reprenez où
                  vous vous êtes arrêté.
                </p>
              </div>
            )}

            {!openDossier && (
              <div className="mb-5">
                <p className="text-sm font-semibold text-gray-900 mb-2.5">
                  Mode de paiement
                </p>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    onClick={() => setPaymentMode("credit")}
                    disabled={!inStock}
                    className={`p-3.5 rounded-xl border-2 text-left transition-all ${
                      paymentMode === "credit"
                        ? "border-primary-500 bg-primary-50"
                        : "border-gray-200 bg-white hover:border-gray-300"
                    } ${!inStock ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <CreditCard
                        className={`w-4 h-4 ${
                          paymentMode === "credit"
                            ? "text-primary-600"
                            : "text-gray-400"
                        }`}
                      />
                      <span
                        className={`text-sm font-semibold ${
                          paymentMode === "credit"
                            ? "text-primary-700"
                            : "text-gray-700"
                        }`}
                      >
                        À crédit
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-500">
                      Dès {formatPrice(totalBefore)}
                    </p>
                  </button>

                  <button
                    onClick={() => setPaymentMode("total")}
                    disabled={!inStock}
                    className={`p-3.5 rounded-xl border-2 text-left transition-all ${
                      paymentMode === "total"
                        ? "border-primary-500 bg-primary-50"
                        : "border-gray-200 bg-white hover:border-gray-300"
                    } ${!inStock ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <CheckCircle
                        className={`w-4 h-4 ${
                          paymentMode === "total"
                            ? "text-primary-600"
                            : "text-gray-400"
                        }`}
                      />
                      <span
                        className={`text-sm font-semibold ${
                          paymentMode === "total"
                            ? "text-primary-700"
                            : "text-gray-700"
                        }`}
                      >
                        Paiement total
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-500">
                      {formatPrice(price)}
                    </p>
                  </button>
                </div>
              </div>
            )}

            {!openDossier && paymentMode === "credit" && inStock && (
              <div className="bg-white border border-gray-100 rounded-xl p-4 mb-5 shadow-sm">
                <p className="text-xs font-semibold text-gray-900 mb-3">
                  Détail du crédit
                </p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">50% maintenant</span>
                    <span className="font-medium text-gray-900">
                      {formatPrice(downPayment)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Caution (10%)</span>
                    <span className="font-medium text-gray-900">
                      {formatPrice(deposit)}
                    </span>
                  </div>
                  <div className="border-t border-gray-100 pt-2 flex justify-between">
                    <span className="font-semibold text-gray-900">
                      Total avant livraison
                    </span>
                    <span className="font-bold text-primary-600">
                      {formatPrice(totalBefore)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Reste à payer</span>
                    <span className="font-medium text-gray-900">
                      {formatPrice(remaining)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {!checkingAuth && !isLoggedIn && inStock && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 text-xs text-amber-800">
                Connectez-vous pour commander ou reprendre un dossier.
              </div>
            )}

            {buyError && (
              <div className="flex gap-2 bg-red-50 border border-red-200 text-red-800 text-xs rounded-xl p-3 mb-4">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                {buyError}
              </div>
            )}

            <button
              type="button"
              onClick={handleBuy}
              disabled={!canClick}
              className={`flex items-center justify-center gap-2 w-full font-semibold text-sm py-3.5 rounded-xl shadow-lg transition-all mb-4 ${
                canClick
                  ? "bg-accent-400 hover:bg-accent-500 text-white shadow-accent-400/25 active:scale-[0.98]"
                  : "bg-gray-300 text-gray-500 cursor-not-allowed"
              }`}
            >
              {buying ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Vérification du stock...
                </>
              ) : (
                <>
                  {buttonLabel}
                  {(inStock || openDossier) && <ArrowRight className="w-4 h-4" />}
                </>
              )}
            </button>

            <div className="grid grid-cols-3 gap-2">
              {[
                { icon: <Shield className="w-3.5 h-3.5" />, text: "Contrat clair" },
                { icon: <Truck className="w-3.5 h-3.5" />, text: "Livraison suivie" },
                { icon: <Lock className="w-3.5 h-3.5" />, text: "Paiement sécurisé" },
              ].map((item, i) => (
                <div
                  key={i}
                  className="flex flex-col items-center gap-1 bg-white border border-gray-100 rounded-lg py-2.5 text-center"
                >
                  <span className="text-primary-500">{item.icon}</span>
                  <span className="text-[10px] text-gray-600">{item.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}