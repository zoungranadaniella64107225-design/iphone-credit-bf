"use client";

import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useState, Suspense } from "react";
import {
  AlertTriangle,
  CheckCircle,
  Shield,
  FileText,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";

function ConditionsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const produitId = searchParams.get("produit");
  const mode = searchParams.get("mode") || "credit";

  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState(false);

  const handleContinue = () => {
    if (!accepted) {
      setError(true);
      return;
    }
    // Redirection vers la page de commande / contrat
    router.push(`/commande?produit=${produitId}&mode=${mode}&accepte=1`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      
      {/* Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-4 py-6">
          <Link
            href={produitId ? `/produit/${produitId}` : "/catalogue"}
            className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-primary-600 mb-4"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Retour
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
        
        {/* Alerte */}
        <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4 mb-6 flex gap-3">
          <AlertTriangle className="w-6 h-6 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-red-800 mb-1">
              Lecture obligatoire
            </p>
            <p className="text-xs text-red-700 leading-relaxed">
              En continuant, vous reconnaissez avoir lu et accepté toutes les conditions ci-dessous. 
              Ces conditions font partie du contrat.
            </p>
          </div>
        </div>

        {/* Liste des conditions */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6 mb-6 space-y-4">
          
          <div className="flex gap-3">
            <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4 text-primary-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900 mb-1">1. Le contrat est obligatoire</h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                Vous devrez imprimer, signer et renvoyer une photo claire du contrat signé + votre CNIB. 
                Sans cela, aucune commande ne sera validée.
              </p>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-4 flex gap-3">
            <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center shrink-0">
              <Shield className="w-4 h-4 text-primary-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900 mb-1">2. Caution de 10%</h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                Une caution de 10% du prix total est exigée en plus des 50%. 
                Elle vous sera entièrement restituée à la fin du contrat si le téléphone est en bon état.
              </p>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-4 flex gap-3">
            <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center shrink-0">
              <CheckCircle className="w-4 h-4 text-primary-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900 mb-1">3. Système de blocage</h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                En cas de non-paiement du solde, le téléphone peut être bloqué à distance. 
                Ce système est clairement indiqué dans le contrat et sert uniquement à protéger le vendeur.
              </p>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-4 flex gap-3">
            <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 h-4 text-primary-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900 mb-1">4. Délai de paiement</h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                Le solde restant doit être payé dans un délai maximum de 2 à 3 mois après réception du téléphone. 
                Des rappels seront envoyés en cas de retard.
              </p>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-4 flex gap-3">
            <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center shrink-0">
              <Shield className="w-4 h-4 text-primary-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900 mb-1">5. Retour possible</h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                Si vous ne pouvez plus payer, vous pouvez ramener le téléphone. 
                Après inspection, les dommages éventuels seront déduits de la caution et le reste vous sera restitué selon le contrat.
              </p>
            </div>
          </div>
        </div>

        {/* Case à cocher */}
        <div className={`bg-white rounded-2xl border-2 p-5 mb-6 transition-all ${
          error ? "border-red-400" : "border-gray-100"
        }`}>
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
                Cette case est obligatoire pour continuer
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

        {/* Bouton continuer */}
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
          En continuant, vous confirmez avoir compris et accepté les conditions.
        </p>
      </div>
    </div>
  );
}

export default function ConditionsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Chargement...</div>}>
      <ConditionsContent />
    </Suspense>
  );
}