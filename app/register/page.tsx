"use client";

import Link from "next/link";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Smartphone,
  Eye,
  EyeOff,
  ArrowRight,
  User,
  Phone,
  Lock,
  Mail,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/client";

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError("");
    setSuccess("");
  };

  const cleanPhone = (phone: string) => phone.replace(/\D/g, "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const firstName = form.firstName.trim();
    const lastName = form.lastName.trim();
    const fullName = `${firstName} ${lastName}`.trim();
    const phone = cleanPhone(form.phone);
    const email = form.email.trim().toLowerCase();
    const password = form.password;

    if (!firstName) {
      setError("Le prénom est obligatoire.");
      return;
    }
    if (!lastName) {
      setError("Le nom est obligatoire.");
      return;
    }
    if (phone.length < 8) {
      setError("Numéro de téléphone invalide (min. 8 chiffres).");
      return;
    }
    if (!email || !email.includes("@") || email.length < 5) {
      setError("Veuillez entrer une adresse e-mail valide.");
      return;
    }
    if (password.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }
    if (password !== form.confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();

      // Téléphone déjà pris ? (si RLS bloque la lecture, on ignore et Auth/unique gérera)
      try {
        const { data: existingProfile } = await supabase
          .from("profiles")
          .select("id")
          .eq("phone", phone)
          .maybeSingle();

        if (existingProfile) {
          setError("Ce numéro de téléphone est déjà utilisé.");
          setLoading(false);
          return;
        }
      } catch {
        /* ignore */
      }

      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            phone,
            role: "client",
          },
          // URL de retour après confirmation e-mail (si activée)
          emailRedirectTo:
            typeof window !== "undefined"
              ? `${window.location.origin}/login`
              : undefined,
        },
      });

      if (signUpError) {
        console.error("signUpError:", signUpError);
        const msg = signUpError.message.toLowerCase();

        if (
          msg.includes("already") ||
          msg.includes("registered") ||
          msg.includes("exists") ||
          msg.includes("user already")
        ) {
          setError("Cette adresse e-mail est déjà utilisée. Connectez-vous.");
        } else if (msg.includes("rate limit") || msg.includes("email rate")) {
          setError(
            "Trop de tentatives. Attends quelques minutes ou désactive « Confirm email » dans Supabase (Auth → Providers → Email)."
          );
        } else if (msg.includes("password")) {
          setError("Le mot de passe ne respecte pas les règles de sécurité.");
        } else if (msg.includes("fetch") || msg.includes("network")) {
          setError("Impossible de joindre Supabase. Vérifie ta connexion.");
        } else {
          setError(signUpError.message);
        }
        setLoading(false);
        return;
      }

      if (!data.user) {
        setError("Inscription impossible. Réessaie.");
        setLoading(false);
        return;
      }

      // Profil + rôle (upsert si trigger a déjà créé une ligne)
      const { error: profileError } = await supabase.from("profiles").upsert(
        {
          id: data.user.id,
          full_name: fullName,
          phone,
        },
        { onConflict: "id" }
      );

      if (profileError) {
        console.error("profil:", profileError);
        // Ne bloque pas si le trigger a déjà créé le profil
        if (
          !profileError.message.toLowerCase().includes("duplicate") &&
          profileError.code !== "23505"
        ) {
          // RLS peut bloquer : le compte Auth existe quand même
          console.warn(
            "Profil non écrit côté client (RLS ?). Le compte Auth est créé."
          );
        }
      }

      // Rôle client (peut échouer en RLS — normal ; admin API / trigger le feront)
      await supabase.from("user_roles").upsert(
        {
          user_id: data.user.id,
          role: "client",
          active: true,
        },
        { onConflict: "user_id" }
      );

      // Cas 1 : session immédiate (Confirm email désactivé)
      if (data.session) {
        setSuccess("Compte créé ! Redirection...");
        router.push(redirect);
        router.refresh();
        return;
      }

      // Cas 2 : confirmation e-mail requise
      setSuccess(
        "Compte créé. Si la confirmation e-mail est activée, vérifie ta boîte mail. Sinon connecte-toi avec ton e-mail et ton mot de passe."
      );
      setLoading(false);

      // Proposer d’aller au login après 2 s
      setTimeout(() => {
        router.push(
          `/login?redirect=${encodeURIComponent(redirect)}`
        );
      }, 2500);
    } catch (err: unknown) {
      console.error("Erreur inscription:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Une erreur inattendue est survenue."
      );
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-primary-50 flex flex-col">
      <div className="bg-white/90 backdrop-blur border-b border-gray-100">
        <div className="max-w-md mx-auto px-5 py-4">
          <Link href="/" className="flex items-center gap-2 w-fit">
            <div className="bg-primary-600 p-2 rounded-xl">
              <Smartphone className="w-5 h-5 text-white" />
            </div>
            <span className="text-base font-bold text-primary-700">
              iPhone
              <span className="text-accent-500">Credit</span>
            </span>
          </Link>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary-100 mb-4">
              <User className="w-7 h-7 text-primary-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">
              Créer un compte
            </h1>
            <p className="text-sm text-gray-500 mt-2">
              E-mail + mot de passe pour suivre commandes et paiements.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/50 p-6 sm:p-7 space-y-5"
          >
            {error && (
              <div
                role="alert"
                className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm"
              >
                {error}
              </div>
            )}
            {success && (
              <div
                role="status"
                className="bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3 text-sm"
              >
                {success}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-2 block">
                  Prénom *
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    name="firstName"
                    value={form.firstName}
                    onChange={handleChange}
                    placeholder="Jean"
                    autoComplete="given-name"
                    disabled={loading}
                    className="w-full pl-10 pr-3 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-60"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-2 block">
                  Nom *
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    name="lastName"
                    value={form.lastName}
                    onChange={handleChange}
                    placeholder="Ouédraogo"
                    autoComplete="family-name"
                    disabled={loading}
                    className="w-full pl-10 pr-3 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-60"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700 mb-2 block">
                Téléphone *
              </label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="tel"
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="70 12 34 56"
                  autoComplete="tel"
                  inputMode="tel"
                  disabled={loading}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-60"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700 mb-2 block">
                E-mail * (connexion)
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="jean@email.com"
                  autoComplete="email"
                  disabled={loading}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-60"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700 mb-2 block">
                Mot de passe *
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Minimum 6 caractères"
                  autoComplete="new-password"
                  disabled={loading}
                  className="w-full pl-10 pr-11 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-60"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700 mb-2 block">
                Confirmer le mot de passe *
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  placeholder="Retapez le mot de passe"
                  autoComplete="new-password"
                  disabled={loading}
                  className="w-full pl-10 pr-11 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-60"
                />
                <button
                  type="button"
                  onClick={() =>
                    setShowConfirmPassword(!showConfirmPassword)
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-accent-500 hover:bg-accent-600 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-accent-500/25 transition-all disabled:opacity-60"
            >
              {loading ? (
                <>
                  <span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Création...
                </>
              ) : (
                <>
                  Créer mon compte
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-7">
            Déjà un compte ?{" "}
            <Link
              href={`/login?redirect=${encodeURIComponent(redirect)}`}
              className="text-primary-600 font-bold hover:underline"
            >
              Se connecter
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          Chargement...
        </div>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}