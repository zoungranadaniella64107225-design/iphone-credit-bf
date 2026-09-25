"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { useParams } from "next/navigation";
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
} from "lucide-react";

const allPhones = [
  {
    id: 1,
    name: "iPhone 13",
    price: 180000,
    storage: "128 Go",
    color: "Minuit",
    grade: "Grade A",
    battery: "86%",
    stock: 5,
    description:
      "iPhone 13 reconditionné d’origine américaine. Écran Super Retina XDR, double appareil photo, très bon état général. Idéal pour un usage quotidien fluide et durable.",
    images: [
      "/images/products/iphone1.jpg",
      "/images/products/iphone2.jpg",
      "/images/products/iphone3.jpg",
    ],
  },
  {
    id: 2,
    name: "iPhone 12",
    price: 150000,
    storage: "64 Go",
    color: "Noir",
    grade: "Grade A",
    battery: "88%",
    stock: 3,
    description:
      "iPhone 12 reconditionné. Performances excellentes, design élégant, idéal pour un usage quotidien.",
    images: [
      "/images/products/iphone2.jpg",
      "/images/products/iphone1.jpg",
      "/images/products/iphone4.jpg",
    ],
  },
  {
    id: 3,
    name: "iPhone 11",
    price: 120000,
    storage: "64 Go",
    color: "Blanc",
    grade: "Grade A",
    battery: "90%",
    stock: 8,
    description:
      "iPhone 11 reconditionné. Excellent rapport qualité-prix, batterie en très bon état.",
    images: [
      "/images/products/iphone3.jpg",
      "/images/products/iphone2.jpg",
      "/images/products/iphone1.jpg",
    ],
  },
  {
    id: 4,
    name: "iPhone 13 Pro",
    price: 220000,
    storage: "128 Go",
    color: "Graphite",
    grade: "Grade A",
    battery: "87%",
    stock: 2,
    description:
      "iPhone 13 Pro reconditionné. Écran ProMotion 120 Hz, triple caméra, performances maximales.",
    images: [
      "/images/products/iphone4.jpg",
      "/images/products/iphone1.jpg",
      "/images/products/iphone2.jpg",
    ],
  },
];

export default function ProductDetailPage() {
  const params = useParams();
  const id = Number(params.id);
  const phone = allPhones.find((p) => p.id === id);

  const [paymentMode, setPaymentMode] = useState<"credit" | "total">("credit");
  const [selectedImage, setSelectedImage] = useState(0);

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
  const inStock = phone.stock > 0;

  const formatPrice = (price: number) => {
    return price.toLocaleString("fr-FR") + " F";
  };

  return (
    <div className="min-h-screen bg-gray-50">
      
      {/* Fil d'Ariane */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Link href="/" className="hover:text-primary-600">Accueil</Link>
            <ChevronRight className="w-3 h-3" />
            <Link href="/catalogue" className="hover:text-primary-600">Catalogue</Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-gray-900 font-medium">{phone.name}</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 sm:py-10">
        <div className="grid lg:grid-cols-2 gap-6 lg:gap-10">
          
          {/* ===== GALERIE ===== */}
          <div>
            <div className="bg-white rounded-2xl p-3 border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.04)] mb-3">
              <div className="relative aspect-square rounded-xl overflow-hidden bg-gray-50">
                <Image
                  src={phone.images[selectedImage]}
                  alt={`${phone.name} photo ${selectedImage + 1}`}
                  fill
                  className="object-cover"
                  priority
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {phone.images.map((img, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedImage(index)}
                  className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all ${
                    selectedImage === index
                      ? "border-primary-500 shadow-md"
                      : "border-gray-100 hover:border-gray-300"
                  }`}
                >
                  <Image
                    src={img}
                    alt={`${phone.name} vue ${index + 1}`}
                    fill
                    className="object-cover"
                    sizes="120px"
                  />
                </button>
              ))}
            </div>
          </div>

          {/* ===== INFOS + ACHAT ===== */}
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
                {phone.storage} • {phone.color}
              </span>
            </div>

            {/* Badges */}
            <div className="flex flex-wrap gap-2 mb-4">
              <span className="inline-flex items-center gap-1 bg-primary-50 text-primary-700 text-xs font-medium px-2.5 py-1 rounded-lg border border-primary-100">
                <Smartphone className="w-3 h-3" />
                {phone.grade}
              </span>
              <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 text-xs font-medium px-2.5 py-1 rounded-lg border border-green-100">
                <Battery className="w-3 h-3" />
                Batterie {phone.battery}
              </span>
              <span
                className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-lg border ${
                  inStock
                    ? "bg-green-50 text-green-700 border-green-100"
                    : "bg-red-50 text-red-700 border-red-100"
                }`}
              >
                <Package className="w-3 h-3" />
                {inStock ? `En stock (${phone.stock})` : "Rupture de stock"}
              </span>
            </div>

            <p className="text-sm text-gray-600 mb-5 leading-relaxed">
              {phone.description}
            </p>

            {/* Prix */}
            <div className="mb-5">
              <p className="text-2xl sm:text-3xl font-bold text-primary-600">
                {formatPrice(phone.price)}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">Prix total</p>
            </div>

            {/* Mode de paiement */}
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
                    <CreditCard className={`w-4 h-4 ${paymentMode === "credit" ? "text-primary-600" : "text-gray-400"}`} />
                    <span className={`text-sm font-semibold ${paymentMode === "credit" ? "text-primary-700" : "text-gray-700"}`}>
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
                    <CheckCircle className={`w-4 h-4 ${paymentMode === "total" ? "text-primary-600" : "text-gray-400"}`} />
                    <span className={`text-sm font-semibold ${paymentMode === "total" ? "text-primary-700" : "text-gray-700"}`}>
                      Paiement total
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500">
                    {formatPrice(phone.price)}
                  </p>
                </button>
              </div>
            </div>

            {/* Simulateur crédit */}
            {paymentMode === "credit" && (
              <div className="bg-white border border-gray-100 rounded-xl p-4 mb-5 shadow-sm">
                <p className="text-xs font-semibold text-gray-900 mb-3">
                  Détail du crédit
                </p>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">50% maintenant</span>
                    <span className="font-medium text-gray-900">{formatPrice(downPayment)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Caution (10%)</span>
                    <span className="font-medium text-gray-900">{formatPrice(deposit)}</span>
                  </div>
                  <div className="border-t border-gray-100 pt-2 flex justify-between">
                    <span className="font-semibold text-gray-900">Total avant livraison</span>
                    <span className="font-bold text-primary-600">{formatPrice(totalBefore)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Reste à payer</span>
                    <span className="font-medium text-gray-900">{formatPrice(remaining)}</span>
                  </div>
                </div>

                <p className="text-[11px] text-gray-400 mt-3">
                  La caution est restituée à la fin si le téléphone est en bon état.
                </p>
              </div>
            )}

            {/* Bouton Commander */}
            <Link
              href={inStock ? `/conditions?produit=${phone.id}&mode=${paymentMode}` : "#"}
              onClick={(e) => {
                if (!inStock) e.preventDefault();
              }}
              className={`flex items-center justify-center gap-2 w-full font-semibold text-sm py-3.5 rounded-xl shadow-lg transition-all mb-4 ${
                inStock
                  ? "bg-accent-400 hover:bg-accent-500 text-white shadow-accent-400/25 active:scale-[0.98]"
                  : "bg-gray-300 text-gray-500 cursor-not-allowed"
              }`}
            >
              {inStock
                ? paymentMode === "credit"
                  ? "Commencer le crédit"
                  : "Acheter maintenant"
                : "Rupture de stock"}
              {inStock && <ArrowRight className="w-4 h-4" />}
            </Link>

            {/* Mini garanties */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { icon: <Shield className="w-3.5 h-3.5" />, text: "Contrat clair" },
                { icon: <Truck className="w-3.5 h-3.5" />, text: "Livraison suivie" },
                { icon: <Lock className="w-3.5 h-3.5" />, text: "Paiement sécurisé" },
              ].map((item, i) => (
                <div key={i} className="flex flex-col items-center gap-1 bg-white border border-gray-100 rounded-lg py-2.5 text-center">
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