"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  FolderOpen,
  Loader2,
  RefreshCw,
  AlertCircle,
  LogOut,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type DossierRow = {
  id: string;
  reference: string;
  full_name: string;
  phone: string;
  product_name: string | null;
  mode: string;
  status: string;
  created_at: string;
};

const STATUS_LABEL: Record<string, string> = {
  en_attente: "Dossier à vérifier",
  valide: "Dossier OK — contrat",
  refuse: "Dossier refusé",
  contrat_en_attente: "Contrat à vérifier",
  contrat_refuse: "Contrat refusé",
  pret_paiement: "Prêt paiement",
  paye: "Payé",
  livre: "Livré",
  annule: "Annulé",
};

function badge(status: string) {
  if (status === "en_attente" || status === "contrat_en_attente")
    return "bg-amber-500/20 text-amber-300 border border-amber-500/30";
  if (status === "valide" || status === "pret_paiement" || status === "paye")
    return "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30";
  if (status === "refuse" || status === "contrat_refuse")
    return "bg-red-500/20 text-red-300 border border-red-500/30";
  return "bg-slate-500/20 text-slate-300 border border-slate-500/30";
}

function isAdminUser(user: {
  user_metadata?: Record<string, unknown>;
} | null): boolean {
  return user?.user_metadata?.role === "admin";
}

export default function AdminDossiersPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dossiers, setDossiers] = useState<DossierRow[]>([]);
  const [filter, setFilter] = useState<string>("a_traiter");
  const [error, setError] = useState("");
  const [adminEmail, setAdminEmail] = useState("");

  // Auth admin (session Supabase + role)
  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const supabase = createClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.user || !isAdminUser(session.user)) {
          localStorage.removeItem("admin");
          localStorage.removeItem("adminUser");
          await supabase.auth.signOut().catch(() => {});
          router.replace("/admin/login");
          return;
        }

        setAdminEmail(session.user.email || "Admin");
        localStorage.setItem("admin", "true");
        setReady(true);
      } catch {
        router.replace("/admin/login");
      }
    };

    checkAdmin();
  }, [router]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const supabase = createClient();

      // Vérifier que la session est toujours là
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user || !isAdminUser(session.user)) {
        router.replace("/admin/login");
        return;
      }

      let q = supabase
        .from("dossiers")
        .select(
          "id, reference, full_name, phone, product_name, mode, status, created_at"
        )
        .order("created_at", { ascending: false });

      if (filter === "a_traiter") {
        q = q.in("status", ["en_attente", "contrat_en_attente"]);
      } else if (filter !== "tous") {
        q = q.eq("status", filter);
      }

      const { data, error: fetchError } = await q;

      if (fetchError) {
        console.error(fetchError);
        setError(fetchError.message);
        setDossiers([]);
        return;
      }

      setDossiers((data as DossierRow[]) || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur de chargement");
      setDossiers([]);
    } finally {
      setLoading(false);
    }
  }, [filter, router]);

  useEffect(() => {
    if (ready) load();
  }, [ready, load]);

  const logout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    localStorage.removeItem("admin");
    localStorage.removeItem("adminUser");
    router.push("/admin/login");
  };

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-400">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-7 h-7 animate-spin text-primary-400" />
          <p className="text-sm">Vérification admin...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-slate-800 bg-slate-900/80 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="text-slate-400 hover:text-white">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-lg font-bold flex items-center gap-2">
                <FolderOpen className="w-5 h-5 text-primary-400" />
                Dossiers
              </h1>
              <p className="text-xs text-slate-400">
                {adminEmail} — CNIB & contrats
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={load}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700"
              title="Actualiser"
            >
              <RefreshCw
                className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
              />
            </button>
            <button
              onClick={logout}
              className="p-2 rounded-lg bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400"
              title="Déconnexion"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex gap-2 overflow-x-auto pb-3 mb-4">
          {[
            { id: "a_traiter", label: "À traiter" },
            { id: "en_attente", label: "Dossiers" },
            { id: "contrat_en_attente", label: "Contrats" },
            { id: "valide", label: "Validés" },
            { id: "pret_paiement", label: "Prêt paiement" },
            { id: "tous", label: "Tous" },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-full whitespace-nowrap transition ${
                filter === f.id
                  ? "bg-primary-500 text-white"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {error && (
          <div className="mb-4 flex items-start gap-2 bg-red-500/10 border border-red-500/30 text-red-300 text-xs rounded-xl px-4 py-3">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Impossible de charger les dossiers</p>
              <p className="mt-1 opacity-80">{error}</p>
              <p className="mt-2 text-slate-400">
                Vérifie : connexion admin + RLS (policies authenticated) ou
                metadata role = admin.
              </p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary-400" />
          </div>
        ) : dossiers.length === 0 ? (
          <div className="text-center py-16 text-slate-400 text-sm">
            <FolderOpen className="w-10 h-10 mx-auto mb-3 text-slate-600" />
            <p>Aucun dossier dans ce filtre.</p>
            <button
              onClick={() => setFilter("tous")}
              className="mt-3 text-primary-400 text-xs font-semibold"
            >
              Voir tous les dossiers
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-slate-500 mb-2">
              {dossiers.length} dossier(s)
            </p>
            {dossiers.map((d) => (
              <Link
                key={d.id}
                href={`/admin/dossiers/${d.id}`}
                className="block bg-slate-900 border border-slate-800 rounded-2xl p-4 hover:border-primary-500/40 transition"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">
                      {d.full_name}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {d.reference} • {d.product_name || "Produit"} •{" "}
                      {d.mode === "credit" ? "Crédit" : "Total"}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      {d.phone} •{" "}
                      {new Date(d.created_at).toLocaleString("fr-FR")}
                    </p>
                  </div>
                  <span
                    className={`text-[10px] font-semibold px-2.5 py-1 rounded-full shrink-0 ${badge(
                      d.status
                    )}`}
                  >
                    {STATUS_LABEL[d.status] || d.status}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}