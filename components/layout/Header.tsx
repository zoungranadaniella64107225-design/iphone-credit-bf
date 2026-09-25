"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X, Smartphone } from "lucide-react";

export default function Header() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="bg-white border-b border-primary-100 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="bg-primary-500 p-2 rounded-xl group-hover:bg-primary-600 transition">
              <Smartphone className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="text-xl font-bold text-primary-700">iPhone</span>
              <span className="text-xl font-bold text-accent-400">Credit</span>
              <span className="text-xs block text-gray-500 -mt-1">Burkina Faso</span>
            </div>
          </Link>

          {/* Navigation Desktop */}
          <nav className="hidden md:flex items-center gap-8">
            <Link href="/" className="text-gray-700 hover:text-primary-600 font-medium transition">
              Accueil
            </Link>
            <Link href="/catalogue" className="text-gray-700 hover:text-primary-600 font-medium transition">
              Catalogue
            </Link>
            <Link href="/comment-ca-marche" className="text-gray-700 hover:text-primary-600 font-medium transition">
              Comment ça marche
            </Link>
            <Link href="/garanties" className="text-gray-700 hover:text-primary-600 font-medium transition">
              Garanties
            </Link>
            <Link href="/contact" className="text-gray-700 hover:text-primary-600 font-medium transition">
              Contact
            </Link>
          </nav>

          {/* Boutons Desktop */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/login"
              className="px-4 py-2 text-primary-600 font-medium hover:text-primary-700 transition"
            >
              Connexion
            </Link>
            <Link
              href="/catalogue"
              className="px-5 py-2.5 bg-accent-400 hover:bg-accent-500 text-white font-semibold rounded-xl shadow-sm hover:shadow transition"
            >
              Voir les iPhones
            </Link>
          </div>

          {/* Bouton Mobile */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-primary-50"
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Menu Mobile */}
      {isOpen && (
        <div className="md:hidden bg-white border-t border-primary-100">
          <div className="px-4 py-4 space-y-3">
            <Link href="/" className="block py-2 text-gray-700 font-medium" onClick={() => setIsOpen(false)}>
              Accueil
            </Link>
            <Link href="/catalogue" className="block py-2 text-gray-700 font-medium" onClick={() => setIsOpen(false)}>
              Catalogue
            </Link>
            <Link href="/comment-ca-marche" className="block py-2 text-gray-700 font-medium" onClick={() => setIsOpen(false)}>
              Comment ça marche
            </Link>
            <Link href="/garanties" className="block py-2 text-gray-700 font-medium" onClick={() => setIsOpen(false)}>
              Garanties
            </Link>
            <Link href="/contact" className="block py-2 text-gray-700 font-medium" onClick={() => setIsOpen(false)}>
              Contact
            </Link>
            <div className="pt-3 border-t border-gray-100 flex flex-col gap-2">
              <Link href="/login" className="py-2 text-center text-primary-600 font-medium">
                Connexion
              </Link>
              <Link
                href="/catalogue"
                className="py-2.5 text-center bg-accent-400 text-white font-semibold rounded-xl"
              >
                Voir les iPhones
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}