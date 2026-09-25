"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { 
  Smartphone, Shield, CreditCard, CheckCircle, 
  ArrowRight, Star, Truck, Lock, Zap, BadgeCheck
} from "lucide-react";

export default function HomePage() {
  const phones = [
    {
      name: "iPhone 13",
      price: "180 000 F",
      storage: "128 Go",
      image: "/images/products/iphone1.jpg",
      grade: "Grade A",
    },
    {
      name: "iPhone 12",
      price: "150 000 F",
      storage: "64 Go",
      image: "/images/products/iphone2.jpg",
      grade: "Grade A",
    },
    {
      name: "iPhone 11",
      price: "120 000 F",
      storage: "64 Go",
      image: "/images/products/iphone3.jpg",
      grade: "Grade A",
    },
    {
      name: "iPhone 13 Pro",
      price: "220 000 F",
      storage: "128 Go",
      image: "/images/products/iphone4.jpg",
      grade: "Grade A",
    },
  ];

  const [current, setCurrent] = useState(0);

  // Animation automatique toutes les 3.5 secondes
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % phones.length);
    }, 3500);
    return () => clearInterval(timer);
  }, [phones.length]);

  return (
    <div className="overflow-x-hidden bg-white">

      {/* ===== HERO + ANIMATION FUTURISTE ===== */}
      <section className="relative bg-gradient-to-b from-primary-50 via-white to-white pt-6 pb-8 sm:pt-10 sm:pb-12">
        <div className="max-w-7xl mx-auto px-4">
          
          {/* Badge */}
          <div className="flex justify-center mb-5">
            <div className="inline-flex items-center gap-1.5 bg-white border border-primary-100 text-primary-700 px-3 py-1 rounded-full text-xs font-medium shadow-sm">
              <Zap className="w-3.5 h-3.5 text-accent-400" />
              Crédit flexible • Livraison rapide
            </div>
          </div>

          {/* Titre */}
          <div className="text-center mb-6 sm:mb-8">
            <h1 className="text-[1.7rem] leading-tight sm:text-3xl md:text-4xl font-bold text-gray-900 mb-2">
              Ton iPhone maintenant,{" "}
              <span className="text-primary-600">paye plus tard</span>
            </h1>
            <p className="text-sm text-gray-600 max-w-md mx-auto">
              Paye seulement <span className="font-semibold text-gray-900">50% + caution</span> aujourd’hui. 
              Reçois ton iPhone, et finis de payer en 2 à 3 mois.
            </p>
          </div>

          {/* ===== ANIMATION FUTURISTE (cartes empilées) ===== */}
          <div className="relative h-[340px] sm:h-[380px] flex items-center justify-center mb-6">
            {phones.map((phone, index) => {
              // Calcul de la position pour l'effet empilé
              const offset = (index - current + phones.length) % phones.length;
              const isActive = offset === 0;
              const isNext = offset === 1;
              const isPrev = offset === phones.length - 1;

              let transform = "scale(0.75) translateY(40px)";
              let opacity = 0;
              let zIndex = 0;

              if (isActive) {
                transform = "scale(1) translateY(0)";
                opacity = 1;
                zIndex = 30;
              } else if (isNext) {
                transform = "scale(0.88) translateY(20px) translateX(60px)";
                opacity = 0.5;
                zIndex = 20;
              } else if (isPrev) {
                transform = "scale(0.88) translateY(20px) translateX(-60px)";
                opacity = 0.5;
                zIndex = 20;
              }

              return (
                <div
                  key={index}
                  className="absolute transition-all duration-700 ease-in-out"
                  style={{
                    transform,
                    opacity,
                    zIndex,
                  }}
                >
                  <div className="w-[200px] sm:w-[230px] bg-white rounded-2xl p-2 shadow-[0_20px_50px_rgba(0,0,0,0.12)] border border-gray-100">
                    <div className="relative aspect-[3/4] rounded-xl overflow-hidden bg-gray-50">
                      <Image
                        src={phone.image}
                        alt={phone.name}
                        fill
                        className="object-cover"
                        sizes="230px"
                      />
                    </div>
                    <div className="pt-2.5 pb-1 text-center">
                      <p className="text-xs font-bold text-gray-900">{phone.name}</p>
                      <p className="text-[11px] text-accent-500 font-semibold">{phone.price}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Indicateurs */}
          <div className="flex justify-center gap-1.5 mb-6">
            {phones.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrent(index)}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  index === current 
                    ? "w-6 bg-primary-500" 
                    : "w-1.5 bg-gray-300"
                }`}
              />
            ))}
          </div>

          {/* Boutons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-5">
            <Link
              href="/catalogue"
              className="inline-flex items-center justify-center gap-2 bg-accent-400 hover:bg-accent-500 text-white font-semibold text-sm px-7 py-3 rounded-xl shadow-lg shadow-accent-400/25 transition-all active:scale-95"
            >
              Voir les iPhones
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/comment-ca-marche"
              className="inline-flex items-center justify-center gap-2 bg-white border border-gray-200 text-gray-700 font-medium text-sm px-7 py-3 rounded-xl hover:bg-gray-50 transition-all"
            >
              Comment ça marche
            </Link>
          </div>

          {/* Confiance */}
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-gray-500">
            <div className="flex items-center gap-1.5">
              <BadgeCheck className="w-3.5 h-3.5 text-primary-500" />
              <span>Contrat clair</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-primary-500" />
              <span>Paiement sécurisé</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5 text-primary-500" />
              <span>Suivi de livraison</span>
            </div>
          </div>
        </div>
      </section>

      {/* ===== CATALOGUE ===== */}
      <section className="py-10 sm:py-12 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-end justify-between mb-5">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-gray-900">Nos iPhones</h2>
              <p className="text-xs text-gray-500 mt-0.5">Reconditionnés • Grade A</p>
            </div>
            <Link href="/catalogue" className="text-xs font-semibold text-primary-600 flex items-center gap-1">
              Tout voir <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {phones.map((phone, i) => (
              <Link
                href="/catalogue"
                key={i}
                className="group bg-white rounded-xl overflow-hidden border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.04)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.1)] transition-all active:scale-[0.98]"
              >
                <div className="relative aspect-[3/4] overflow-hidden bg-gray-50">
                  <Image
                    src={phone.image}
                    alt={phone.name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                    sizes="(max-width: 640px) 50vw, 25vw"
                  />
                </div>
                <div className="p-2.5 sm:p-3">
                  <div className="flex justify-between items-start gap-1">
                    <h3 className="text-xs sm:text-sm font-bold text-gray-900 truncate">
                      {phone.name}
                    </h3>
                    <div className="flex items-center gap-0.5 text-accent-400">
                      <Star className="w-3 h-3 fill-current" />
                      <span className="text-[10px]">4.8</span>
                    </div>
                  </div>
                  <p className="text-[10px] text-gray-500 mt-0.5 mb-1.5">
                    {phone.storage} • {phone.grade}
                  </p>
                  <p className="text-sm font-bold text-primary-600">{phone.price}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ===== POURQUOI ACHETER CHEZ NOUS (sous le catalogue) ===== */}
      <section className="py-10 sm:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <h2 className="text-lg sm:text-xl font-bold text-center text-gray-900 mb-6">
            Pourquoi acheter chez nous ?
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            {[
              {
                icon: <CreditCard className="w-5 h-5 text-white" />,
                title: "Paiement flexible",
                desc: "50% + caution maintenant, le reste en 2-3 mois.",
                color: "bg-primary-500",
              },
              {
                icon: <Shield className="w-5 h-5 text-white" />,
                title: "100% Transparent",
                desc: "Tu suis tout en temps réel. Rien n’est caché.",
                color: "bg-accent-400",
              },
              {
                icon: <CheckCircle className="w-5 h-5 text-white" />,
                title: "Qualité prouvée",
                desc: "iPhones américains testés et reconditionnés.",
                color: "bg-primary-500",
              },
            ].map((item, i) => (
              <div
                key={i}
                className="bg-white rounded-2xl p-4 border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.04)] flex sm:flex-col items-center gap-3 sm:gap-0 sm:text-center"
              >
                <div className={`w-10 h-10 ${item.color} rounded-xl flex items-center justify-center shrink-0 shadow-sm`}>
                  {item.icon}
                </div>
                <div className="sm:mt-3">
                  <h3 className="text-sm font-bold text-gray-900 mb-0.5">{item.title}</h3>
                  <p className="text-xs text-gray-600 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== COMMENT ÇA MARCHE ===== */}
      <section className="py-10 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <h2 className="text-lg sm:text-xl font-bold text-center text-gray-900 mb-6">
            Simple comme bonjour
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { step: "1", title: "Choisis", desc: "Ton iPhone" },
              { step: "2", title: "Signe", desc: "Le contrat" },
              { step: "3", title: "Paye 50%+", desc: "Moitié + caution" },
              { step: "4", title: "Reçois", desc: "Ton iPhone" },
            ].map((item) => (
              <div
                key={item.step}
                className="bg-white rounded-xl p-4 text-center border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.04)]"
              >
                <div className="w-8 h-8 bg-primary-500 text-white rounded-full flex items-center justify-center text-sm font-bold mx-auto mb-2">
                  {item.step}
                </div>
                <h3 className="font-bold text-gray-900 text-xs mb-0.5">{item.title}</h3>
                <p className="text-[10px] text-gray-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== CTA FINAL ===== */}
      <section className="py-11 bg-primary-600">
        <div className="max-w-lg mx-auto px-4 text-center">
          <h2 className="text-xl font-bold text-white mb-2">
            Prêt à avoir ton iPhone ?
          </h2>
          <p className="text-primary-100 text-sm mb-5">
            Commence maintenant, paie tranquillement.
          </p>
          <Link
            href="/catalogue"
            className="inline-flex items-center gap-2 bg-accent-400 hover:bg-accent-500 text-white font-semibold text-sm px-7 py-3 rounded-xl shadow-lg transition-all active:scale-95"
          >
            Voir le catalogue
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}