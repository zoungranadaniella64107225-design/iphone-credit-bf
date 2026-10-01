"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import {
  Shield,
  CreditCard,
  CheckCircle,
  ArrowRight,
  Star,
  Truck,
  Lock,
  Zap,
  BadgeCheck,
  User,
  Loader2,
  Package,
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
  images: string[] | null;
  created_at: string;
};

export default function HomePage() {
  const [user, setUser] = useState<{ name: string; phone: string } | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [current, setCurrent] = useState(0);

  const formatPrice = (n: number) => n.toLocaleString("fr-FR") + " F";

  // Session
  useEffect(() => {
    const loadSession = async () => {
      try {
        const supabase = createClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user) {
          setUser({
            name: session.user.user_metadata?.full_name || "Client",
            phone:
              session.user.user_metadata?.phone ||
              session.user.email?.split("@")[0] ||
              "",
          });
        } else {
          setUser(null);
        }
      } catch {
        setUser(null);
      }
    };

    loadSession();

    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser({
          name: session.user.user_metadata?.full_name || "Client",
          phone:
            session.user.user_metadata?.phone ||
            session.user.email?.split("@")[0] ||
            "",
        });
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Produits depuis Supabase
  useEffect(() => {
    const loadProducts = async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("products")
          .select(
            "id, name, price, storage, color, grade, battery, stock, images, created_at"
          )
          .order("created_at", { ascending: false })
          .limit(8);

        if (error) throw error;
        setProducts((data || []) as Product[]);
      } catch (err) {
        console.error("Erreur chargement produits:", err);
        setProducts([]);
      } finally {
        setLoadingProducts(false);
      }
    };

    loadProducts();
  }, []);

  // Animation carousel
  useEffect(() => {
    if (products.length === 0) return;

    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % products.length);
    }, 3500);

    return () => clearInterval(timer);
  }, [products.length]);

  const getImage = (product: Product) =>
    product.images?.[0] || "/images/products/iphone1.jpg";

  const ProductImage = ({
    src,
    alt,
    className,
  }: {
    src: string;
    alt: string;
    className?: string;
  }) => {
    if (src.startsWith("http")) {
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} className={className || "absolute inset-0 w-full h-full object-cover"} />
      );
    }
    return (
      <Image
        src={src}
        alt={alt}
        fill
        className={className || "object-cover"}
        sizes="(max-width: 640px) 50vw, 25vw"
      />
    );
  };

  return (
    <div className="overflow-x-hidden bg-white">
      {/* Bandeau connecté */}
      {user && (
        <div className="bg-primary-600 text-white">
          <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm">
              <User className="w-4 h-4" />
              <span>
                Bonjour <strong>{user.name}</strong> 👋
              </span>
            </div>
            <Link
              href="/client"
              className="text-xs font-semibold bg-white/20 hover:bg-white/30 px-3 py-1 rounded-lg transition-all"
            >
              Mon espace →
            </Link>
          </div>
        </div>
      )}

      {/* Hero */}
      <section className="relative bg-gradient-to-b from-primary-50 via-white to-white pt-6 pb-8 sm:pt-10 sm:pb-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-center mb-5">
            <div className="inline-flex items-center gap-1.5 bg-white border border-primary-100 text-primary-700 px-3 py-1 rounded-full text-xs font-medium shadow-sm">
              <Zap className="w-3.5 h-3.5 text-accent-400" />
              Crédit flexible • Livraison rapide
            </div>
          </div>

          <div className="text-center mb-6 sm:mb-8">
            <h1 className="text-[1.7rem] leading-tight sm:text-3xl md:text-4xl font-bold text-gray-900 mb-2">
              Ton iPhone maintenant,{" "}
              <span className="text-primary-600">paye plus tard</span>
            </h1>
            <p className="text-sm text-gray-600 max-w-md mx-auto">
              Paye seulement{" "}
              <span className="font-semibold text-gray-900">50% + caution</span>{" "}
              aujourd’hui. Reçois ton iPhone, et finis de payer en 2 à 3 mois.
            </p>
          </div>

          {/* Animation cartes */}
          <div className="relative h-[340px] sm:h-[380px] flex items-center justify-center mb-6">
            {loadingProducts ? (
              <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
            ) : products.length === 0 ? (
              <div className="text-center">
                <Package className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">Aucun produit pour le moment</p>
              </div>
            ) : (
              products.map((phone, index) => {
                const offset =
                  (index - current + products.length) % products.length;
                const isActive = offset === 0;
                const isNext = offset === 1;
                const isPrev = offset === products.length - 1;

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

                const img = getImage(phone);

                return (
                  <div
                    key={phone.id}
                    className="absolute transition-all duration-700 ease-in-out"
                    style={{ transform, opacity, zIndex }}
                  >
                    <Link href={`/produit/${phone.id}`}>
                      <div className="w-[200px] sm:w-[230px] bg-white rounded-2xl p-2 shadow-[0_20px_50px_rgba(0,0,0,0.12)] border border-gray-100">
                        <div className="relative aspect-[3/4] rounded-xl overflow-hidden bg-gray-50">
                          <ProductImage
                            src={img}
                            alt={phone.name}
                            className="absolute inset-0 w-full h-full object-cover"
                          />
                        </div>
                        <div className="pt-2.5 pb-1 text-center">
                          <p className="text-xs font-bold text-gray-900">
                            {phone.name}
                          </p>
                          <p className="text-[11px] text-accent-500 font-semibold">
                            {formatPrice(Number(phone.price || 0))}
                          </p>
                        </div>
                      </div>
                    </Link>
                  </div>
                );
              })
            )}
          </div>

          {products.length > 0 && (
            <div className="flex justify-center gap-1.5 mb-6">
              {products.map((_, index) => (
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
          )}

          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-5">
            <Link
              href="/catalogue"
              className="inline-flex items-center justify-center gap-2 bg-accent-400 hover:bg-accent-500 text-white font-semibold text-sm px-7 py-3 rounded-xl shadow-lg shadow-accent-400/25 transition-all active:scale-95"
            >
              Voir les iPhones
              <ArrowRight className="w-4 h-4" />
            </Link>

            {user ? (
              <Link
                href="/client"
                className="inline-flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 text-white font-medium text-sm px-7 py-3 rounded-xl transition-all"
              >
                <User className="w-4 h-4" />
                Mon espace
              </Link>
            ) : (
              <Link
                href="/comment-ca-marche"
                className="inline-flex items-center justify-center gap-2 bg-white border border-gray-200 text-gray-700 font-medium text-sm px-7 py-3 rounded-xl hover:bg-gray-50 transition-all"
              >
                Comment ça marche
              </Link>
            )}
          </div>

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

      {/* Nos iPhones */}
      <section className="py-10 sm:py-12 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-end justify-between mb-5">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-gray-900">
                Nos iPhones
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Reconditionnés • Depuis la base de données
              </p>
            </div>
            <Link
              href="/catalogue"
              className="text-xs font-semibold text-primary-600 flex items-center gap-1"
            >
              Tout voir <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {loadingProducts ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
            </div>
          ) : products.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
              <Package className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500">
                Aucun produit enregistré pour le moment.
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Ajoute des produits depuis l’admin.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {products.slice(0, 4).map((phone) => {
                const img = getImage(phone);
                const inStock = Number(phone.stock || 0) > 0;

                return (
                  <Link
                    href={`/produit/${phone.id}`}
                    key={phone.id}
                    className="group bg-white rounded-xl overflow-hidden border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.04)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.1)] transition-all active:scale-[0.98]"
                  >
                    <div className="relative aspect-[3/4] overflow-hidden bg-gray-50">
                      <ProductImage
                        src={img}
                        alt={phone.name}
                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      {!inStock && (
                        <div className="absolute top-2 right-2 bg-red-500 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">
                          Rupture
                        </div>
                      )}
                    </div>
                    <div className="p-2.5 sm:p-3">
                      <div className="flex justify-between items-start gap-1">
                        <h3 className="text-xs sm:text-sm font-bold text-gray-900 truncate">
                          {phone.name}
                        </h3>
                        <div className="flex items-center gap-0.5 text-accent-400 shrink-0">
                          <Star className="w-3 h-3 fill-current" />
                          <span className="text-[10px]">4.8</span>
                        </div>
                      </div>
                      <p className="text-[10px] text-gray-500 mt-0.5 mb-1.5 truncate">
                        {phone.storage || "—"}
                        {phone.grade ? ` • ${phone.grade}` : ""}
                      </p>
                      <p className="text-sm font-bold text-primary-600">
                        {formatPrice(Number(phone.price || 0))}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Pourquoi acheter */}
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
                <div
                  className={`w-10 h-10 ${item.color} rounded-xl flex items-center justify-center shrink-0 shadow-sm`}
                >
                  {item.icon}
                </div>
                <div className="sm:mt-3">
                  <h3 className="text-sm font-bold text-gray-900 mb-0.5">
                    {item.title}
                  </h3>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comment ça marche */}
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
                <h3 className="font-bold text-gray-900 text-xs mb-0.5">
                  {item.title}
                </h3>
                <p className="text-[10px] text-gray-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="py-11 bg-primary-600">
        <div className="max-w-lg mx-auto px-4 text-center">
          <h2 className="text-xl font-bold text-white mb-2">
            {user
              ? `Prêt, ${user.name.split(" ")[0]} ?`
              : "Prêt à avoir ton iPhone ?"}
          </h2>
          <p className="text-primary-100 text-sm mb-5">
            {user
              ? "Continue depuis ton espace client ou choisis un iPhone."
              : "Commence maintenant, paie tranquillement."}
          </p>
          <Link
            href={user ? "/client" : "/catalogue"}
            className="inline-flex items-center gap-2 bg-accent-400 hover:bg-accent-500 text-white font-semibold text-sm px-7 py-3 rounded-xl shadow-lg transition-all active:scale-95"
          >
            {user ? "Mon espace" : "Voir le catalogue"}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}