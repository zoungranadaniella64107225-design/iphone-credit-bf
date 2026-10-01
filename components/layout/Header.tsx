"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Menu, X, Smartphone, User, LogOut, ChevronDown } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState<{ name: string; phone: string } | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const loadSession = async () => {
      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();

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

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch {
      // ignore
    }
    setUser(null);
    setIsOpen(false);
    setMenuOpen(false);
    router.push("/");
  };

  // Initiale pour l'avatar
  const initial = user?.name?.charAt(0)?.toUpperCase() || "C";

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
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full border border-gray-200 hover:border-primary-300 hover:bg-primary-50 transition-all"
                >
                  <div className="w-8 h-8 rounded-full bg-primary-500 text-white flex items-center justify-center text-sm font-bold">
                    {initial}
                  </div>
                  <div className="text-left hidden lg:block">
                    <p className="text-xs font-semibold text-gray-900 leading-tight max-w-[100px] truncate">
                      {user.name}
                    </p>
                    <p className="text-[10px] text-gray-500 leading-tight">
                      {user.phone}
                    </p>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                </button>

                {menuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setMenuOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl border border-gray-100 shadow-lg z-50 overflow-hidden">
                      <div className="px-4 py-3 border-b border-gray-50 bg-gray-50">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {user.name}
                        </p>
                        <p className="text-xs text-gray-500">{user.phone}</p>
                      </div>
                      <Link
                        href="/client"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-primary-50 hover:text-primary-700"
                      >
                        <User className="w-4 h-4" />
                        Mon espace
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50"
                      >
                        <LogOut className="w-4 h-4" />
                        Déconnexion
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <>
                <Link
                  href="/login"
                  className="px-4 py-2 text-primary-600 font-medium hover:text-primary-700 transition"
                >
                  Connexion
                </Link>
                <Link
                  href="/register"
                  className="px-4 py-2 text-gray-600 font-medium hover:text-primary-600 transition"
                >
                  S’inscrire
                </Link>
              </>
            )}
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
            {/* Profil mobile si connecté */}
            {user && (
              <div className="flex items-center gap-3 p-3 bg-primary-50 rounded-xl border border-primary-100 mb-2">
                <div className="w-10 h-10 rounded-full bg-primary-500 text-white flex items-center justify-center text-sm font-bold shrink-0">
                  {initial}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {user.name}
                  </p>
                  <p className="text-xs text-gray-500">{user.phone}</p>
                </div>
              </div>
            )}

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
              {user ? (
                <>
                  <Link
                    href="/client"
                    className="py-2.5 text-center text-primary-600 font-medium flex items-center justify-center gap-1.5 bg-primary-50 rounded-xl"
                    onClick={() => setIsOpen(false)}
                  >
                    <User className="w-4 h-4" />
                    Mon espace
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="py-2 text-center text-red-600 font-medium flex items-center justify-center gap-1.5"
                  >
                    <LogOut className="w-4 h-4" />
                    Déconnexion
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="py-2 text-center text-primary-600 font-medium"
                    onClick={() => setIsOpen(false)}
                  >
                    Connexion
                  </Link>
                  <Link
                    href="/register"
                    className="py-2 text-center text-gray-600 font-medium"
                    onClick={() => setIsOpen(false)}
                  >
                    S’inscrire
                  </Link>
                </>
              )}
              <Link
                href="/catalogue"
                className="py-2.5 text-center bg-accent-400 text-white font-semibold rounded-xl"
                onClick={() => setIsOpen(false)}
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