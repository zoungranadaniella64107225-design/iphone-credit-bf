"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import {
  Smartphone,
  FileText,
  CreditCard,
  Package,
  ArrowRight,
  AlertTriangle,
  CheckCircle,
  Shield,
  Lock,
  Clock,
} from "lucide-react";

export default function CommentCaMarchePage() {
  const [showAlert, setShowAlert] = useState(true);

  // Faire clignoter l’alerte pour attirer l’attention
  const [blink, setBlink] = useState(true);
  useEffect(() => {
    const interval = setInterval(() => {
      setBlink((prev) => !prev);
    }, 800);
    return () => clearInterval(interval);
  }, []);

  const steps = [
    {
      number: "1",
      title: "Choisissez votre iPhone",
      description:
        "Parcourez le catalogue et sélectionnez le modèle qui vous convient. Vous pouvez choisir le paiement total ou le crédit.",
      icon: <Smartphone className="w-6 h-6" />,
      color: "bg-primary-500",
    },
    {
      number: "2",
      title: "Remplissez le dossier + signez",
      description:
        "Vous fournissez vos informations (CNIB, contacts) et vous signez le contrat. C’est une étape obligatoire et importante.",
      icon: <FileText className="w-6 h-6" />,
      color: "bg-accent-400",
    },
    {
      number: "3",
      title: "Payez 50% + Caution de 10%",
      description:
        "Avant de recevoir le téléphone, vous devez payer la moitié du prix + une caution de 10%. La caution vous sera rendue à la fin si tout est en ordre.",
      icon: <CreditCard className="w-6 h-6" />,
      color: "bg-primary-500",
    },
    {
      number: "4",
      title: "Recevez votre iPhone",
      description:
        "Une fois le paiement validé, nous vous expédions le téléphone avec suivi. Vous continuez ensuite à payer le solde sur 2 à 3 mois maximum.",
      icon: <Package className="w-6 h-6" />,
      color: "bg-accent-400",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      
      {/* ===== ALERTE URGENTE EN HAUT ===== */}
      {showAlert && (
        <div
          className={`sticky top-0 z-50 transition-all duration-300 ${
            blink ? "bg-red-600" : "bg-red-500"
          }`}
        >
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-white text-sm font-medium">
              <AlertTriangle className="w-5 h-5 shrink-0 animate-pulse" />
              <span>
                <strong>Important :</strong> Lisez attentivement toutes les conditions avant de commander. 
                En passant commande, vous acceptez le contrat.
              </span>
            </div>
            <button
              onClick={() => setShowAlert(false)}
              className="text-white/80 hover:text-white text-xs underline shrink-0"
            >
              Fermer
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 py-8 text-center">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            Comment ça marche ?
          </h1>
          <p className="text-sm text-gray-600 max-w-lg mx-auto">
            Le processus est simple, transparent et sécurisé. 
            Prenez le temps de bien comprendre chaque étape.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-10">
        
        {/* ===== LES 4 ÉTAPES ===== */}
        <div className="grid md:grid-cols-2 gap-5 mb-12">
          {steps.map((step, index) => (
            <div
              key={index}
              className="bg-white rounded-2xl p-5 border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.04)] flex gap-4"
            >
              <div
                className={`w-12 h-12 ${step.color} rounded-xl flex items-center justify-center text-white shrink-0 shadow-sm`}
              >
                {step.icon}
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold text-gray-400">
                    ÉTAPE {step.number}
                  </span>
                </div>
                <h3 className="text-base font-bold text-gray-900 mb-1">
                  {step.title}
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* ===== POINTS IMPORTANTS À LIRE ===== */}
        <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-5 sm:p-6 mb-10">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 bg-amber-400 rounded-xl flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-amber-900 mb-1">
                À lire obligatoirement avant de commander
              </h2>
              <p className="text-sm text-amber-800">
                Ces points sont essentiels. Ne les ignorez pas.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {[
              {
                title: "Le contrat est obligatoire",
                text: "Vous devez signer le contrat (photo du contrat signé + CNIB). Sans cela, aucune commande n’est validée.",
              },
              {
                title: "La caution de 10%",
                text: "Elle protège le vendeur. Elle vous est entièrement restituée à la fin si le téléphone est en bon état.",
              },
              {
                title: "Le système de blocage",
                text: "En cas de non-paiement, le téléphone peut être bloqué à distance. C’est clairement indiqué dans le contrat.",
              },
              {
                title: "Délai de paiement du solde",
                text: "Maximum 2 à 3 mois après réception. Des rappels seront envoyés en cas de retard.",
              },
              {
                title: "Retour possible",
                text: "Si vous ne pouvez plus payer, vous pouvez ramener le téléphone. Après inspection, une partie de votre argent peut être restituée.",
              },
            ].map((item, i) => (
              <div
                key={i}
                className="bg-white rounded-xl p-4 border border-amber-100 flex gap-3"
              >
                <CheckCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-gray-900 mb-0.5">
                    {item.title}
                  </p>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    {item.text}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ===== GARANTIES RAPIDES ===== */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          {[
            {
              icon: <Shield className="w-5 h-5 text-white" />,
              title: "Transparent",
              text: "Tout est écrit noir sur blanc dans le contrat.",
              color: "bg-primary-500",
            },
            {
              icon: <Lock className="w-5 h-5 text-white" />,
              title: "Sécurisé",
              text: "Paiements vérifiés + système de blocage.",
              color: "bg-accent-400",
            },
            {
              icon: <Clock className="w-5 h-5 text-white" />,
              title: "Flexible",
              text: "Payez selon vos capacités sur 2-3 mois.",
              color: "bg-primary-500",
            },
          ].map((item, i) => (
            <div
              key={i}
              className="bg-white rounded-2xl p-5 border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.04)] text-center"
            >
              <div
                className={`w-11 h-11 ${item.color} rounded-xl flex items-center justify-center mx-auto mb-3 shadow-sm`}
              >
                {item.icon}
              </div>
              <h3 className="text-sm font-bold text-gray-900 mb-1">
                {item.title}
              </h3>
              <p className="text-xs text-gray-600">{item.text}</p>
            </div>
          ))}
        </div>

        {/* ===== CTA ===== */}
        <div className="bg-primary-600 rounded-2xl p-6 sm:p-8 text-center">
          <h2 className="text-xl font-bold text-white mb-2">
            Vous avez bien tout lu ?
          </h2>
          <p className="text-primary-100 text-sm mb-5">
            Si oui, vous pouvez maintenant choisir votre iPhone en toute confiance.
          </p>
          <Link
            href="/catalogue"
            className="inline-flex items-center gap-2 bg-accent-400 hover:bg-accent-500 text-white font-semibold text-sm px-7 py-3 rounded-xl shadow-lg transition-all active:scale-95"
          >
            Voir le catalogue
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}