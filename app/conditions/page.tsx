"use client";

import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useState, Suspense, useEffect } from "react";
import {
  AlertTriangle,
  CheckCircle,
  Shield,
  FileText,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Smartphone,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Product = {
  id: string;
  name: string;
  price: number | null;
  storage: string | null;
  color: string | null;
};

function ConditionsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const produitId = searchParams.get("produit");
  const mode = searchParams.get("mode") === "total" ? "total" : "credit";

  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState(false);
  const [checking, setChecking] = useState(true);
  const [product, setProduct] = useState<Product | null>(null);
  const [productError, setProductError] = useState("");

  const formatPrice = (n: number) => n.toLocaleString("fr-FR") + " F";

  // Session + chargement produit
  useEffect(() => {
    const init = async () => {
      try {
        const supabase = createClient();

        // 1. Session obligatoire
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.user) {
          const currentUrl = `/conditions?produit=${produitId || ""}&mode=${mode}`;
          router.replace(`/login?redirect=${encodeURIComponent(currentUrl)}`);
          return;
        }

        // 2. Produit obligatoire (uuid)
        if (!produitId) {
          setProductError("Aucun produit sélectionné.");
          setChecking(false);
          return;
        }

        const { data, error: fetchError } = await supabase
          .from("products")
          .select("id, name, price, storage, color")
          .eq("id", produitId)
          .single();

        if (fetchError || !data) {
          setProductError("Produit introuvable.");
          setChecking(false);
          return;
        }

        setProduct(data as Product);
      } catch {
        router.replace("/login");
        return;
      } finally {
        setChecking(false);
      }
    };

    init();
  }, [router, produitId, mode]);

  const handleContinue = () => {
    if (!accepted) {
      setError(true);
      return;
    }

    if (!produitId) return;

    // Pas d’enregistrement ici : on le fera à l’étape Commande
    router.push(
      `/commande?produit=${encodeURIComponent(produitId)}&mode=${mode}&accepte=1`
    );
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-7 h-7 text-primary-500 animate-spin" />
          <p className="text-sm text-gray-500">Vérification...</p>
        </div>
      </div>
    );
  }

  if (productError || !product) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center max-w-sm">
          <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
          <p className="text-sm font-semibold text-gray-900 mb-2">
            {productError || "Produit introuvable"}
          </p>
          <Link
            href="/catalogue"
            className="inline-flex items-center gap-2 text-sm text-primary-600 font-medium"
          >
            Retour au catalogue
          </Link>
        </div>
      </div>
    );
  }

  const price = Number(product.price || 0);
  const downPayment = Math.round(price * 0.5);
  const deposit = Math.round(price * 0.1);
  const totalBefore = downPayment + deposit;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-4 py-6">
          <Link
            href={`/produit/${product.id}`}
            className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-primary-600 mb-4"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Retour au produit
          </Link>

          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
            Conditions importantes
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Lisez attentivement avant de continuer
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Récap produit */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center shrink-0">
            <Smartphone className="w-5 h-5 text-primary-600" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-gray-900 truncate">
              {product.name}
            </p>
            <p className="text-xs text-gray-500">
              {product.storage || "—"}
              {product.color ? ` • ${product.color}` : ""}
              {" • "}
              {formatPrice(price)}
            </p>
          </div>
          <span
            className={`text-[10px] font-semibold px-2.5 py-1 rounded-full shrink-0 ${
              mode === "credit"
                ? "bg-accent-100 text-accent-700"
                : "bg-primary-100 text-primary-700"
            }`}
          >
            {mode === "credit" ? "Crédit" : "Paiement total"}
          </span>
        </div>

        {mode === "credit" && (
          <div className="bg-primary-50 border border-primary-100 rounded-xl p-3 mb-5 text-xs text-primary-800 space-y-1">
            <div className="flex justify-between">
              <span>50% maintenant</span>
              <span className="font-semibold">{formatPrice(downPayment)}</span>
            </div>
            <div className="flex justify-between">
              <span>Caution 10%</span>
              <span className="font-semibold">{formatPrice(deposit)}</span>
            </div>
            <div className="flex justify-between border-t border-primary-200 pt-1 font-bold">
              <span>Total avant livraison</span>
              <span>{formatPrice(totalBefore)}</span>
            </div>
          </div>
        )}

        {/* Alerte */}
        <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4 mb-6 flex gap-3">
          <AlertTriangle className="w-6 h-6 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-red-800 mb-1">
              Lecture obligatoire
            </p>
            <p className="text-xs text-red-700 leading-relaxed">
              En continuant, vous reconnaissez avoir lu et accepté toutes les
              conditions. Elles font partie du contrat de vente.
            </p>
          </div>
        </div>

        {/* Conditions */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6 mb-6 space-y-4">
          <div className="flex gap-3">
            <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4 text-primary-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900 mb-1">
                1. Le contrat est obligatoire
              </h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                Vous devrez télécharger, signer et renvoyer une photo claire du
                contrat signé + votre CNIB. Sans cela, aucune commande ne sera
                validée.
              </p>
            </div>
          </div>

          {mode === "credit" && (
            <div className="border-t border-gray-100 pt-4 flex gap-3">
              <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center shrink-0">
                <Shield className="w-4 h-4 text-primary-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900 mb-1">
                  2. Caution de 10%
                </h3>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Une caution de 10% du prix total est exigée en plus des 50%.
                  Elle vous sera restituée à la fin si le téléphone est en bon
                  état.
                </p>
              </div>
            </div>
          )}

          <div className="border-t border-gray-100 pt-4 flex gap-3">
            <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center shrink-0">
              <CheckCircle className="w-4 h-4 text-primary-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900 mb-1">
                {mode === "credit" ? "3. Système de blocage" : "2. Système de blocage"}
              </h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                {mode === "credit"
                  ? "En cas de non-paiement du solde, le téléphone peut être bloqué à distance. Ce système protège le vendeur et est indiqué dans le contrat."
                  : "Le téléphone peut être équipé d’un système de protection selon les conditions du contrat."}
              </p>
            </div>
          </div>

          {mode === "credit" && (
            <div className="border-t border-gray-100 pt-4 flex gap-3">
              <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center shrink-0">
                <AlertTriangle className="w-4 h-4 text-primary-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900 mb-1">
                  4. Délai de paiement
                </h3>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Le solde restant doit être payé sous 2 à 3 mois maximum après
                  réception. Des rappels seront envoyés en cas de retard.
                </p>
              </div>
            </div>
          )}

          <div className="border-t border-gray-100 pt-4 flex gap-3">
            <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center shrink-0">
              <Shield className="w-4 h-4 text-primary-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900 mb-1">
                {mode === "credit" ? "5. Retour possible" : "3. Retour possible"}
              </h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                En cas de difficulté, un retour du téléphone peut être envisagé
                selon les termes du contrat (inspection et caution).
              </p>
            </div>
          </div>
        </div>

        {/* Case à cocher */}
        <div
          className={`bg-white rounded-2xl border-2 p-5 mb-6 transition-all ${
            error ? "border-red-400" : "border-gray-100"
          }`}
        >
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(e) => {
                setAccepted(e.target.checked);
                setError(false);
              }}
              className="mt-1 w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <div>
              <p className="text-sm font-semibold text-gray-900">
                J’ai lu et j’accepte toutes les conditions ci-dessus
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                Obligatoire pour continuer
              </p>
            </div>
          </label>

          {error && (
            <p className="text-xs text-red-600 mt-3 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              Vous devez accepter les conditions pour continuer
            </p>
          )}
        </div>

        <button
          onClick={handleContinue}
          className={`w-full flex items-center justify-center gap-2 font-semibold text-sm py-3.5 rounded-xl shadow-lg transition-all ${
            accepted
              ? "bg-accent-400 hover:bg-accent-500 text-white shadow-accent-400/25 active:scale-[0.98]"
              : "bg-gray-200 text-gray-500 cursor-not-allowed"
          }`}
        >
          Continuer vers la commande
          <ArrowRight className="w-4 h-4" />
        </button>

        <p className="text-center text-[11px] text-gray-400 mt-4">
          Aucune commande n’est enregistrée à cette étape. L’enregistrement
          se fera après vos informations et la CNIB.
        </p>
      </div>
    </div>
  );
}

export default function ConditionsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          Chargement...
        </div>
      }
    >
      <ConditionsContent />
    </Suspense>
  );
}