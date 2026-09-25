"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { 
  Star, ArrowRight, Filter, Smartphone, 
  ChevronDown, Search
} from "lucide-react";

const allPhones = [
  {
    id: 1,
    name: "iPhone 13",
    price: 180000,
    storage: "128 Go",
    color: "Minuit",
    image: "/images/products/iphone1.jpg",
    grade: "Grade A",
    battery: "86%",
  },
  {
    id: 2,
    name: "iPhone 12",
    price: 150000,
    storage: "64 Go",
    color: "Noir",
    image: "/images/products/iphone2.jpg",
    grade: "Grade A",
    battery: "88%",
  },
  {
    id: 3,
    name: "iPhone 11",
    price: 120000,
    storage: "64 Go",
    color: "Blanc",
    image: "/images/products/iphone3.jpg",
    grade: "Grade A",
    battery: "90%",
  },
  {
    id: 4,
    name: "iPhone 13 Pro",
    price: 220000,
    storage: "128 Go",
    color: "Graphite",
    image: "/images/products/iphone4.jpg",
    grade: "Grade A",
    battery: "87%",
  },
];

export default function CataloguePage() {
  const [search, setSearch] = useState("");
  const [selectedStorage, setSelectedStorage] = useState("Tous");
  const [sortBy, setSortBy] = useState("popular");
  const [showFilters, setShowFilters] = useState(false);

  const storages = ["Tous", "64 Go", "128 Go", "256 Go"];

  let filtered = allPhones.filter((phone) => {
    const matchSearch = phone.name.toLowerCase().includes(search.toLowerCase());
    const matchStorage = selectedStorage === "Tous" || phone.storage === selectedStorage;
    return matchSearch && matchStorage;
  });

  if (sortBy === "price-asc") {
    filtered = [...filtered].sort((a, b) => a.price - b.price);
  } else if (sortBy === "price-desc") {
    filtered = [...filtered].sort((a, b) => b.price - a.price);
  }

  const formatPrice = (price: number) => {
    return price.toLocaleString("fr-FR") + " F";
  };

  return (
    <div className="min-h-screen bg-gray-50">
      
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:py-8">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">
            Catalogue iPhone
          </h1>
          <p className="text-sm text-gray-500">
            {filtered.length} modèle{filtered.length > 1 ? "s" : ""} disponible{filtered.length > 1 ? "s" : ""}
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher un iPhone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className="sm:hidden flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium"
          >
            <Filter className="w-4 h-4" />
            Filtres
          </button>

          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="appearance-none w-full sm:w-auto pl-4 pr-10 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="popular">Plus populaires</option>
              <option value="price-asc">Prix croissant</option>
              <option value="price-desc">Prix décroissant</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </div>

        <div className={`${showFilters ? "block" : "hidden"} sm:block mb-6`}>
          <div className="flex flex-wrap gap-2">
            {storages.map((storage) => (
              <button
                key={storage}
                onClick={() => setSelectedStorage(storage)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                  selectedStorage === storage
                    ? "bg-primary-500 text-white shadow-sm"
                    : "bg-white text-gray-600 border border-gray-200 hover:border-primary-300"
                }`}
              >
                {storage}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <Smartphone className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">Aucun iPhone trouvé</p>
            <button
              onClick={() => {
                setSearch("");
                setSelectedStorage("Tous");
              }}
              className="mt-3 text-primary-600 text-sm font-medium"
            >
              Réinitialiser les filtres
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
            {filtered.map((phone) => (
              <Link
                href={`/produit/${phone.id}`}
                key={phone.id}
                className="group bg-white rounded-xl overflow-hidden border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.04)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.1)] transition-all active:scale-[0.98]"
              >
                <div className="relative aspect-[3/4] overflow-hidden bg-gray-50">
                  <Image
                    src={phone.image}
                    alt={phone.name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  />
                  <div className="absolute top-2 left-2 bg-white/95 backdrop-blur-sm px-2 py-0.5 rounded-md text-[10px] font-semibold text-primary-700 shadow-sm">
                    {phone.grade}
                  </div>
                </div>

                <div className="p-2.5 sm:p-3.5">
                  <div className="flex justify-between items-start gap-1 mb-0.5">
                    <h3 className="text-xs sm:text-sm font-bold text-gray-900 truncate">
                      {phone.name}
                    </h3>
                    <div className="flex items-center gap-0.5 text-accent-400 shrink-0">
                      <Star className="w-3 h-3 fill-current" />
                      <span className="text-[10px]">4.8</span>
                    </div>
                  </div>

                  <p className="text-[10px] sm:text-xs text-gray-500 mb-1">
                    {phone.storage} • {phone.color}
                  </p>

                  <p className="text-[10px] text-gray-400 mb-2">
                    Batterie {phone.battery}
                  </p>

                  <div className="flex items-center justify-between">
                    <p className="text-sm sm:text-base font-bold text-primary-600">
                      {formatPrice(phone.price)}
                    </p>
                    <span className="text-[10px] font-medium text-accent-500 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      Voir <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        <div className="mt-8 bg-primary-50 border border-primary-100 rounded-2xl p-4 sm:p-5 text-center">
          <p className="text-sm text-primary-800 font-medium mb-1">
            Paiement en plusieurs fois disponible
          </p>
          <p className="text-xs text-primary-600">
            Payez 50% + caution maintenant, le reste en 2 à 3 mois
          </p>
        </div>
      </div>
    </div>
  );
}