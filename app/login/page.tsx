"use client";

import Link from "next/link";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Smartphone, Eye, EyeOff, ArrowRight, Phone, Lock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/client";

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    phone: "",
    password: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
  };

  const cleanPhone = (phone: string) => phone.replace(/\D/g, "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const phone = cleanPhone(form.phone);
    if (phone.length < 8) {
      setError("Numéro de téléphone invalide");
      return;
    }
    if (!form.password) {
      setError("Le mot de passe est obligatoire");
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      const email = `${phone}@mail.iphone-credit.local`;

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: form.password,
      });

      if (signInError) {
        console.error("signInError:", signInError);
        const msg = signInError.message.toLowerCase();

        if (msg.includes("invalid login") || msg.includes("invalid credentials")) {
          setError("Numéro ou mot de passe incorrect");
        } else if (msg.includes("email not confirmed")) {
          setError("Email non confirmé. Désactive « Confirm email » dans Supabase.");
        } else if (msg.includes("invalid api key") || msg.includes("jwt")) {
          setError("Clé Supabase invalide. Utilise la clé anon legacy (eyJ...).");
        } else {
          setError(signInError.message);
        }
        setLoading(false);
        return;
      }

      if (data.user) {
        router.push(redirect);
        router.refresh();
        return;
      }

      setError("Connexion impossible");
      setLoading(false);
    } catch (err: unknown) {
      console.error("Erreur connexion:", err);
      const msg = err instanceof Error ? err.message : "Erreur inconnue";
      setError(msg);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-md mx-auto px-4 py-4 flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2">
            <div className="bg-primary-500 p-1.5 rounded-lg">
              <Smartphone className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-bold text-primary-700">
              iPhone<span className="text-accent-400">Credit</span>
            </span>
          </Link>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Connexion</h1>
            <p className="text-sm text-gray-500">
              Accédez à votre espace client
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4"
          >
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl px-3 py-2.5 whitespace-pre-wrap">
                {error}
              </div>
            )}

            <div>
              <label className="text-xs font-medium text-gray-700 mb-1.5 block">
                Numéro de téléphone
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="tel"
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="Ex: 70 12 34 56"
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-700 mb-1.5 block">
                Mot de passe
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Votre mot de passe"
                  className="w-full pl-10 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 text-white font-semibold text-sm py-3 rounded-xl shadow-lg transition-all disabled:opacity-60"
            >
              {loading ? "Connexion..." : (
                <>
                  Se connecter
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Pas encore de compte ?{" "}
            <Link
              href={`/register?redirect=${encodeURIComponent(redirect)}`}
              className="text-primary-600 font-semibold hover:underline"
            >
              S’inscrire
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">Chargement...</div>
    }>
      <LoginForm />
    </Suspense>
  );
}