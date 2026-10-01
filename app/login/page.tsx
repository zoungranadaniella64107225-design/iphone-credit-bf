"use client";

import Link from "next/link";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Smartphone,
  Eye,
  EyeOff,
  ArrowRight,
  Mail,
  Lock,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/client";

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const email = form.email.trim().toLowerCase();
    const password = form.password;

    if (!email) {
      setError("L'adresse e-mail est obligatoire.");
      return;
    }

    if (!email.includes("@")) {
      setError("Veuillez entrer une adresse e-mail valide.");
      return;
    }

    if (!password) {
      setError("Le mot de passe est obligatoire.");
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();

      const { data, error: signInError } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        });

      if (signInError) {
        console.error("Erreur Supabase:", signInError);

        const msg = signInError.message.toLowerCase();

        if (
          msg.includes("invalid login credentials") ||
          msg.includes("invalid credentials") ||
          msg.includes("invalid login")
        ) {
          setError("Adresse e-mail ou mot de passe incorrect.");
        } else if (msg.includes("email not confirmed")) {
          setError(
            "Votre adresse e-mail n'est pas encore confirmée. " +
              "Veuillez confirmer votre e-mail ou désactiver « Confirm email » dans Supabase."
          );
        } else if (msg.includes("email")) {
          setError(signInError.message);
        } else if (
          msg.includes("invalid api key") ||
          msg.includes("jwt")
        ) {
          setError(
            "La configuration Supabase semble incorrecte. Vérifiez vos variables d'environnement."
          );
        } else {
          setError(
            "Impossible de se connecter. Vérifiez vos identifiants et réessayez."
          );
        }

        setLoading(false);
        return;
      }

      if (!data.user) {
        setError("Connexion impossible. Aucun utilisateur trouvé.");
        setLoading(false);
        return;
      }

      // Connexion réussie
      router.push(redirect);
      router.refresh();
    } catch (err: unknown) {
      console.error("Erreur connexion:", err);

      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Une erreur inattendue est survenue.");
      }

      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-md mx-auto px-4 py-4 flex items-center">
          <Link href="/" className="flex items-center gap-2">
            <div className="bg-primary-500 p-1.5 rounded-lg">
              <Smartphone className="w-4 h-4 text-white" />
            </div>

            <span className="text-sm font-bold text-primary-700">
              iPhone
              <span className="text-accent-400">Credit</span>
            </span>
          </Link>
        </div>
      </div>

      {/* Contenu */}
      <div className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          {/* Titre */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-1">
              Connexion
            </h1>

            <p className="text-sm text-gray-500">
              Accédez à votre espace client
            </p>
          </div>

          {/* Formulaire */}
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5"
          >
            {/* Erreur */}
            {error && (
              <div
                role="alert"
                className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3"
              >
                {error}
              </div>
            )}

            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="text-xs font-medium text-gray-700 mb-1.5 block"
              >
                Adresse e-mail
              </label>

              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />

                <input
                  id="email"
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="exemple@email.com"
                  autoComplete="email"
                  disabled={loading}
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:opacity-60"
                />
              </div>
            </div>

            {/* Mot de passe */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="password"
                  className="text-xs font-medium text-gray-700"
                >
                  Mot de passe
                </label>
              </div>

              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />

                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Votre mot de passe"
                  autoComplete="current-password"
                  disabled={loading}
                  className="w-full pl-10 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:opacity-60"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={
                    showPassword
                      ? "Masquer le mot de passe"
                      : "Afficher le mot de passe"
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Bouton */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 text-white font-semibold text-sm py-3 rounded-xl shadow-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Connexion...
                </>
              ) : (
                <>
                  Se connecter
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Inscription */}
          <p className="text-center text-sm text-gray-500 mt-6">
            Pas encore de compte ?{" "}
            <Link
              href={`/register?redirect=${encodeURIComponent(redirect)}`}
              className="text-primary-600 font-semibold hover:underline"
            >
              Créer un compte
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span className="w-4 h-4 border-2 border-gray-300 border-t-primary-600 rounded-full animate-spin" />
            Chargement...
          </div>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}