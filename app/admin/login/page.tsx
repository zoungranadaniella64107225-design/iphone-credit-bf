"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Shield, ArrowRight, Mail, Eye, EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

function isAdminUser(user: {
  email?: string | null;
  user_metadata?: Record<string, unknown>;
}): boolean {
  const role = user.user_metadata?.role;
  return role === "admin";
}

export default function AdminLoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("Email et mot de passe obligatoires");
      return;
    }

    setLoading(true);
    const supabase = createClient();

    try {
      const { data, error: signError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (signError) {
        setError(
          signError.message === "Invalid login credentials"
            ? "Email ou mot de passe incorrect"
            : signError.message
        );
        setLoading(false);
        return;
      }

      const user = data.user;

      // Seul un compte avec role = admin passe
      if (!user || !isAdminUser(user)) {
        await supabase.auth.signOut();
        localStorage.removeItem("admin");
        localStorage.removeItem("adminUser");
        setError("Accès refusé. Ce compte n’est pas administrateur.");
        setLoading(false);
        return;
      }

      localStorage.setItem("admin", "true");
      localStorage.setItem(
        "adminUser",
        JSON.stringify({
          id: user.id,
          email: user.email,
        })
      );

      router.replace("/admin");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur de connexion");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-primary-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Shield className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-xl font-bold text-white">Admin</h1>
          <p className="text-sm text-gray-400 mt-1">Accès réservé</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-gray-800 rounded-2xl p-6 space-y-4"
        >
          {error && (
            <div className="bg-red-500/20 border border-red-500/40 text-red-300 text-xs rounded-xl px-3 py-2">
              {error}
            </div>
          )}

          <div>
            <label className="text-xs text-gray-400 mb-1.5 block">
              Email admin
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError("");
                }}
                placeholder="admin@..."
                className="w-full pl-10 pr-4 py-2.5 bg-gray-700 border border-gray-600 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-400 mb-1.5 block">
              Mot de passe
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError("");
                }}
                placeholder="••••••••"
                className="w-full pl-10 pr-10 py-2.5 bg-gray-700 border border-gray-600 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-primary-500 hover:bg-primary-600 text-white font-semibold text-sm py-3 rounded-xl disabled:opacity-60"
          >
            {loading ? (
              "Vérification..."
            ) : (
              <>
                Accéder au panel
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}