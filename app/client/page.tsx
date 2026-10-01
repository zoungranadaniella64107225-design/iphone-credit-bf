"use client";

import Link from "next/link";
import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Smartphone,
  Package,
  CreditCard,
  LogOut,
  Clock,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  FileText,
  Loader2,
  RefreshCw,
  Wallet,
  Shield,
  Zap,
  XCircle,
  TrendingUp,
  History,
  Sparkles,
  ArrowUpRight,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Dossier = {
  id: string;
  reference: string;
  product_id: number | null;
  product_name: string | null;
  product_price: number | null;
  product_storage: string | null;
  product_color: string | null;
  mode: string;
  status: string;
  full_name: string;
  phone: string;
  amount_down: number | null;
  amount_deposit: number | null;
  amount_total_before: number | null;
  amount_remaining: number | null;
  paid_at: string | null;
  created_at: string;
  updated_at?: string | null;
  admin_note: string | null;
};

type TabFilter = "tous" | "en_cours" | "acceptes" | "refuses" | "soldes";

type TimelineEvent = {
  id: string;
  dossierId: string;
  reference: string;
  product: string;
  title: string;
  detail: string;
  amount?: number;
  type: "info" | "success" | "warning" | "danger" | "payment";
  date: string;
};

function statusLabel(s: string) {
  const map: Record<string, string> = {
    en_attente: "En attente",
    valide: "Accepté",
    refuse: "Refusé",
    contrat_en_attente: "Contrat en cours",
    contrat_refuse: "Contrat refusé",
    pret_paiement: "À payer",
    paye: "Acompte payé",
    livre: "Livré",
    annule: "Annulé",
  };
  return map[s] || s;
}

function statusClass(s: string) {
  if (["refuse", "contrat_refuse", "annule"].includes(s))
    return "bg-red-500/15 text-red-300 border border-red-500/30";
  if (["valide", "paye", "livre"].includes(s))
    return "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30";
  if (s === "pret_paiement")
    return "bg-cyan-500/15 text-cyan-300 border border-cyan-500/30";
  return "bg-amber-500/15 text-amber-300 border border-amber-500/30";
}

function resumeHref(d: Dossier) {
  const q = `produit=${d.product_id || ""}&mode=${d.mode}&dossier=${d.id}`;
  switch (d.status) {
    case "en_attente":
    case "valide":
    case "contrat_en_attente":
    case "contrat_refuse":
      return `/contrat?${q}`;
    case "pret_paiement":
      return `/paiement?${q}`;
    default:
      return null;
  }
}

function buildTimeline(dossiers: Dossier[]): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  for (const d of dossiers) {
    events.push({
      id: `${d.id}-create`,
      dossierId: d.id,
      reference: d.reference,
      product: d.product_name || "Produit",
      title: "Dossier créé",
      detail: `Demande ${d.mode === "credit" ? "crédit" : "comptant"} enregistrée`,
      type: "info",
      date: d.created_at,
    });

    if (d.status === "valide" || ["contrat_en_attente", "contrat_refuse", "pret_paiement", "paye", "livre"].includes(d.status)) {
      events.push({
        id: `${d.id}-valide`,
        dossierId: d.id,
        reference: d.reference,
        product: d.product_name || "Produit",
        title: "Dossier accepté",
        detail: "Identité / CNIB validés par l’équipe",
        type: "success",
        date: d.updated_at || d.created_at,
      });
    }

    if (d.status === "refuse") {
      events.push({
        id: `${d.id}-refuse`,
        dossierId: d.id,
        reference: d.reference,
        product: d.product_name || "Produit",
        title: "Dossier refusé",
        detail: d.admin_note || "Documents non conformes",
        type: "danger",
        date: d.updated_at || d.created_at,
      });
    }

    if (["contrat_en_attente", "pret_paiement", "paye", "livre"].includes(d.status)) {
      events.push({
        id: `${d.id}-contrat`,
        dossierId: d.id,
        reference: d.reference,
        product: d.product_name || "Produit",
        title: "Contrat envoyé",
        detail: "Photo du contrat signé reçue",
        type: "info",
        date: d.updated_at || d.created_at,
      });
    }

    if (d.status === "contrat_refuse") {
      events.push({
        id: `${d.id}-contrat-ref`,
        dossierId: d.id,
        reference: d.reference,
        product: d.product_name || "Produit",
        title: "Contrat refusé",
        detail: d.admin_note || "Photo illisible — à renvoyer",
        type: "warning",
        date: d.updated_at || d.created_at,
      });
    }

    if (d.paid_at || ["paye", "livre"].includes(d.status)) {
      const paid = Number(d.amount_total_before || 0);
      events.push({
        id: `${d.id}-pay`,
        dossierId: d.id,
        reference: d.reference,
        product: d.product_name || "Produit",
        title: "Paiement initial",
        detail: "Acompte / total enregistré",
        amount: paid || Number(d.product_price || 0) - Number(d.amount_remaining || 0),
        type: "payment",
        date: d.paid_at || d.updated_at || d.created_at,
      });
    }

    // Notes d’échéances dans admin_note
    if (d.admin_note && d.admin_note.toLowerCase().includes("échéance")) {
      events.push({
        id: `${d.id}-ech-${d.updated_at}`,
        dossierId: d.id,
        reference: d.reference,
        product: d.product_name || "Produit",
        title: "Échéance crédit",
        detail: d.admin_note,
        type: "payment",
        date: d.updated_at || d.created_at,
      });
    }
  }

  return events.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}

export default function ClientDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<{
    id: string;
    name: string;
    phone: string;
  } | null>(null);
  const [dossiers, setDossiers] = useState<Dossier[]>([]);
  const [loading, setLoading] = useState(true);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [tab, setTab] = useState<TabFilter>("tous");
  const [view, setView] = useState<"dossiers" | "historique">("dossiers");

  const formatPrice = (n: number) => n.toLocaleString("fr-FR") + " F";
  const formatDate = (d: string) =>
    new Date(d).toLocaleString("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const loadDossiers = useCallback(async (userId: string) => {
    const supabase = createClient();
    const { data, error: err } = await supabase
      .from("dossiers")
      .select(
        "id, reference, product_id, product_name, product_price, product_storage, product_color, mode, status, full_name, phone, amount_down, amount_deposit, amount_total_before, amount_remaining, paid_at, created_at, updated_at, admin_note"
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (err) {
      setError(err.message);
      setDossiers([]);
      return;
    }
    setDossiers((data as Dossier[]) || []);
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        const supabase = createClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session?.user) {
          router.replace("/login");
          return;
        }
        const authUser = session.user;
        setUser({
          id: authUser.id,
          name: authUser.user_metadata?.full_name || "Client",
          phone:
            authUser.user_metadata?.phone ||
            authUser.email?.split("@")[0] ||
            "",
        });
        await loadDossiers(authUser.id);
      } catch {
        router.replace("/login");
      } finally {
        setLoading(false);
      }
    };
    init();

    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session?.user) {
        setUser(null);
        router.replace("/login");
      }
    });
    return () => subscription.unsubscribe();
  }, [router, loadDossiers]);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    localStorage.removeItem("user");
    localStorage.removeItem("lastPayment");
    localStorage.removeItem("lastDossier");
    router.push("/login");
  };

  const payerEcheance = async (d: Dossier, montant: number, label: string) => {
    if (!user || montant <= 0) return;
    if (d.status !== "paye" && d.status !== "livre") {
      setError("Le premier paiement doit être validé avant les échéances.");
      return;
    }
    const remaining = Number(d.amount_remaining || 0);
    if (remaining <= 0) return;
    const toPay = Math.min(montant, remaining);
    if (
      !confirm(
        `Confirmer ${formatPrice(toPay)} (${label}) ?\nMise à jour en base (démo).`
      )
    )
      return;

    setPayingId(d.id);
    setError("");
    setMessage("");
    try {
      const supabase = createClient();
      const newRemaining = Math.max(0, remaining - toPay);
      const { error: updErr } = await supabase
        .from("dossiers")
        .update({
          amount_remaining: newRemaining,
          updated_at: new Date().toISOString(),
          admin_note: `Échéance ${label} payée (démo) : ${toPay} F. Reste : ${newRemaining} F`,
        })
        .eq("id", d.id)
        .eq("user_id", user.id);
      if (updErr) throw updErr;
      setMessage(`${label} : ${formatPrice(toPay)} enregistré`);
      await loadDossiers(user.id);
      setView("historique");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Échec");
    } finally {
      setPayingId(null);
    }
  };

  const buildEcheances = (d: Dossier) => {
    const remaining = Number(d.amount_remaining || 0);
    if (d.mode !== "credit" || remaining <= 0) return [];
    const m1 = Math.round(remaining / 3);
    const m2 = Math.round(remaining / 3);
    const m3 = remaining - m1 - m2;
    const base = d.paid_at ? new Date(d.paid_at) : new Date(d.created_at);
    const dates = [1, 2, 3].map((i) => {
      const x = new Date(base);
      x.setMonth(x.getMonth() + i);
      return x.toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    });
    return [
      { id: 1, label: "Échéance 1", montant: m1, dateLimite: dates[0] },
      { id: 2, label: "Échéance 2", montant: m2, dateLimite: dates[1] },
      { id: 3, label: "Échéance 3", montant: m3, dateLimite: dates[2] },
    ].filter((e) => e.montant > 0);
  };

  const stats = useMemo(() => {
    const enCours = dossiers.filter((d) =>
      ["en_attente", "valide", "contrat_en_attente", "contrat_refuse", "pret_paiement"].includes(
        d.status
      )
    ).length;
    const acceptes = dossiers.filter((d) =>
      ["valide", "contrat_en_attente", "pret_paiement", "paye", "livre"].includes(d.status)
    ).length;
    const refuses = dossiers.filter((d) =>
      ["refuse", "contrat_refuse", "annule"].includes(d.status)
    ).length;
    const totalReste = dossiers.reduce(
      (s, d) => s + Number(d.amount_remaining || 0),
      0
    );
    const totalPaye = dossiers.reduce((s, d) => {
      const price = Number(d.product_price || 0);
      const rem = Number(d.amount_remaining || 0);
      if (["paye", "livre"].includes(d.status)) {
        return s + Math.max(0, price - rem);
      }
      if (d.status === "pret_paiement") return s;
      return s;
    }, 0);
    return { enCours, acceptes, refuses, totalReste, totalPaye, total: dossiers.length };
  }, [dossiers]);

  const filtered = useMemo(() => {
    return dossiers.filter((d) => {
      if (tab === "tous") return true;
      if (tab === "en_cours")
        return [
          "en_attente",
          "valide",
          "contrat_en_attente",
          "contrat_refuse",
          "pret_paiement",
        ].includes(d.status);
      if (tab === "acceptes")
        return ["valide", "contrat_en_attente", "pret_paiement", "paye", "livre"].includes(
          d.status
        );
      if (tab === "refuses")
        return ["refuse", "contrat_refuse", "annule"].includes(d.status);
      if (tab === "soldes")
        return (
          (d.status === "paye" || d.status === "livre") &&
          Number(d.amount_remaining || 0) === 0
        );
      return true;
    });
  }, [dossiers, tab]);

  const timeline = useMemo(() => buildTimeline(dossiers), [dossiers]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070b14] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#070b14] flex items-center justify-center text-slate-400 text-sm">
        Redirection...
      </div>
    );
  }

  const firstName = user.name.split(" ")[0];

  return (
    <div className="min-h-screen bg-[#070b14] text-white pb-10">
      {/* Hero */}
      <div className="relative overflow-hidden border-b border-white/5">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-600/30 via-transparent to-cyan-500/10" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl" />
        <div className="relative max-w-3xl mx-auto px-4 pt-6 pb-8">
          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <span className="text-[11px] font-semibold text-cyan-300/80 uppercase tracking-wider">
                  Espace client
                </span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight">
                Bonjour, {firstName}
              </h1>
              <p className="text-sm text-slate-400 mt-0.5">{user.phone}</p>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => user && loadDossiers(user.id)}
                className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button
                onClick={handleLogout}
                className="p-2.5 rounded-xl bg-white/5 hover:bg-red-500/20 text-slate-300 hover:text-red-300"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {[
              {
                label: "En cours",
                value: stats.enCours,
                icon: <Clock className="w-4 h-4" />,
                color: "text-amber-300",
                bg: "from-amber-500/20 to-transparent",
              },
              {
                label: "Acceptés",
                value: stats.acceptes,
                icon: <CheckCircle className="w-4 h-4" />,
                color: "text-emerald-300",
                bg: "from-emerald-500/20 to-transparent",
              },
              {
                label: "Refusés",
                value: stats.refuses,
                icon: <XCircle className="w-4 h-4" />,
                color: "text-red-300",
                bg: "from-red-500/20 to-transparent",
              },
              {
                label: "Reste dû",
                value: formatPrice(stats.totalReste).replace(" F", ""),
                sub: "F",
                icon: <Wallet className="w-4 h-4" />,
                color: "text-cyan-300",
                bg: "from-cyan-500/20 to-transparent",
              },
            ].map((s) => (
              <div
                key={s.label}
                className={`rounded-2xl bg-gradient-to-b ${s.bg} border border-white/10 p-3 backdrop-blur`}
              >
                <div className={`${s.color} mb-2`}>{s.icon}</div>
                <p className="text-lg font-bold tracking-tight">
                  {s.value}
                  {s.sub && (
                    <span className="text-xs font-medium text-slate-400 ml-0.5">
                      {s.sub}
                    </span>
                  )}
                </p>
                <p className="text-[10px] text-slate-400">{s.label}</p>
              </div>
            ))}
          </div>

          {stats.totalPaye > 0 && (
            <div className="mt-3 flex items-center gap-2 text-xs text-emerald-300/90 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3 py-2">
              <TrendingUp className="w-3.5 h-3.5" />
              Total déjà réglé :{" "}
              <strong>{formatPrice(stats.totalPaye)}</strong>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6">
        {message && (
          <div className="mb-4 text-xs text-emerald-300 bg-emerald-500/10 border border-emerald-500/25 rounded-xl px-4 py-3">
            {message}
          </div>
        )}
        {error && (
          <div className="mb-4 text-xs text-red-300 bg-red-500/10 border border-red-500/25 rounded-xl px-4 py-3">
            {error}
          </div>
        )}

        {/* Navigation vues */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setView("dossiers")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold transition ${
              view === "dossiers"
                ? "bg-primary-500 text-white shadow-lg shadow-primary-500/25"
                : "bg-white/5 text-slate-400 border border-white/5"
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            Dossiers
          </button>
          <button
            onClick={() => setView("historique")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold transition ${
              view === "historique"
                ? "bg-primary-500 text-white shadow-lg shadow-primary-500/25"
                : "bg-white/5 text-slate-400 border border-white/5"
            }`}
          >
            <History className="w-3.5 h-3.5" />
            Historique
          </button>
        </div>

        {/* Raccourcis */}
        <div className="grid grid-cols-3 gap-2 mb-6">
          <Link
            href="/catalogue"
            className="rounded-2xl bg-white/5 border border-white/10 p-3 text-center hover:bg-white/10 transition"
          >
            <Smartphone className="w-5 h-5 text-cyan-400 mx-auto mb-1" />
            <p className="text-[10px] font-semibold text-slate-300">Catalogue</p>
          </Link>
          <Link
            href="/comment-ca-marche"
            className="rounded-2xl bg-white/5 border border-white/10 p-3 text-center hover:bg-white/10 transition"
          >
            <Zap className="w-5 h-5 text-amber-400 mx-auto mb-1" />
            <p className="text-[10px] font-semibold text-slate-300">Process</p>
          </Link>
          <div className="rounded-2xl bg-white/5 border border-white/10 p-3 text-center">
            <Shield className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
            <p className="text-[10px] font-semibold text-slate-300">Sécurisé</p>
          </div>
        </div>

        {view === "dossiers" && (
          <>
            {/* Filtres */}
            <div className="flex gap-2 overflow-x-auto pb-3 mb-4 scrollbar-none">
              {(
                [
                  ["tous", "Tous"],
                  ["en_cours", "En cours"],
                  ["acceptes", "Acceptés"],
                  ["refuses", "Refusés"],
                  ["soldes", "Soldés"],
                ] as [TabFilter, string][]
              ).map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  className={`text-[11px] font-semibold px-3 py-1.5 rounded-full whitespace-nowrap transition ${
                    tab === id
                      ? "bg-cyan-500 text-slate-900"
                      : "bg-white/5 text-slate-400 border border-white/10"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {filtered.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center">
                <Package className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                <p className="text-sm text-slate-400">Aucun dossier ici</p>
                <Link
                  href="/catalogue"
                  className="inline-flex items-center gap-1 text-xs text-cyan-400 mt-3 font-semibold"
                >
                  Explorer le catalogue
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {filtered.map((d) => {
                  const remaining = Number(d.amount_remaining || 0);
                  const price = Number(d.product_price || 0);
                  const payeCalcule =
                    d.mode === "credit"
                      ? Math.max(0, price - remaining)
                      : ["paye", "livre"].includes(d.status)
                      ? price
                      : 0;
                  const progress =
                    price > 0 ? Math.min(100, Math.round((payeCalcule / price) * 100)) : 0;
                  const href = resumeHref(d);
                  const echeances = buildEcheances(d);
                  const canPay =
                    ["paye", "livre"].includes(d.status) &&
                    d.mode === "credit" &&
                    remaining > 0;

                  return (
                    <div
                      key={d.id}
                      className="rounded-2xl bg-[#0d1424] border border-white/10 overflow-hidden shadow-xl shadow-black/20"
                    >
                      <div className="p-4 sm:p-5">
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="min-w-0">
                            <p className="text-sm font-bold truncate">
                              {d.product_name || "Produit"}
                            </p>
                            <p className="text-[11px] text-slate-400">
                              {d.product_storage || "—"}
                              {d.product_color ? ` · ${d.product_color}` : ""} ·{" "}
                              {d.mode === "credit" ? "Crédit" : "Total"}
                            </p>
                            <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                              #{d.reference}
                            </p>
                          </div>
                          <span
                            className={`text-[10px] font-semibold px-2.5 py-1 rounded-full shrink-0 ${statusClass(
                              d.status
                            )}`}
                          >
                            {statusLabel(d.status)}
                          </span>
                        </div>

                        {/* Barre progression */}
                        <div className="mb-3">
                          <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                            <span>Progression paiement</span>
                            <span>{progress}%</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-primary-500 transition-all"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 mb-3">
                          <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 text-center">
                            <p className="text-[10px] text-emerald-400/80">Payé</p>
                            <p className="text-sm font-bold text-emerald-300">
                              {formatPrice(payeCalcule)}
                            </p>
                          </div>
                          <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-3 text-center">
                            <p className="text-[10px] text-amber-400/80">Reste</p>
                            <p className="text-sm font-bold text-amber-300">
                              {formatPrice(remaining)}
                            </p>
                          </div>
                        </div>

                        {href && (
                          <Link
                            href={href}
                            className="flex items-center justify-center gap-2 w-full bg-primary-500 hover:bg-primary-400 text-white text-sm font-semibold py-2.5 rounded-xl mb-2"
                          >
                            Continuer le parcours
                            <ChevronRight className="w-4 h-4" />
                          </Link>
                        )}
                        {d.status === "pret_paiement" && (
                          <Link
                            href={`/paiement?dossier=${d.id}&produit=${d.product_id || ""}&mode=${d.mode}`}
                            className="flex items-center justify-center gap-2 w-full bg-gradient-to-r from-cyan-500 to-teal-500 text-slate-900 text-sm font-bold py-2.5 rounded-xl"
                          >
                            <CreditCard className="w-4 h-4" />
                            Payer maintenant
                          </Link>
                        )}
                      </div>

                      {canPay && (
                        <div className="border-t border-white/5 bg-black/20">
                          <p className="px-4 pt-3 text-[11px] font-bold text-slate-300">
                            Échéances restantes
                          </p>
                          {echeances.map((ech) => (
                            <div
                              key={ech.id}
                              className="px-4 py-3 flex items-center gap-3 border-b border-white/5 last:border-0"
                            >
                              <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-300 flex items-center justify-center">
                                <Clock className="w-4 h-4" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold">{ech.label}</p>
                                <p className="text-[10px] text-slate-500">
                                  Avant le {ech.dateLimite}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-bold">
                                  {formatPrice(ech.montant)}
                                </p>
                                <button
                                  disabled={payingId === d.id}
                                  onClick={() =>
                                    payerEcheance(d, ech.montant, ech.label)
                                  }
                                  className="text-[10px] font-semibold text-cyan-400 disabled:opacity-50"
                                >
                                  {payingId === d.id ? "..." : "Payer"}
                                </button>
                              </div>
                            </div>
                          ))}
                          <div className="p-3">
                            <button
                              disabled={payingId === d.id}
                              onClick={() =>
                                payerEcheance(d, remaining, "Solde total")
                              }
                              className="w-full text-xs font-semibold py-2.5 rounded-xl bg-white/5 border border-white/10 text-cyan-300"
                            >
                              Solde tout le reste · {formatPrice(remaining)}
                            </button>
                          </div>
                        </div>
                      )}

                      {d.mode === "credit" &&
                        remaining === 0 &&
                        ["paye", "livre"].includes(d.status) && (
                          <div className="px-4 py-3 bg-emerald-500/10 text-xs text-emerald-300 flex gap-2 items-center">
                            <CheckCircle className="w-4 h-4" />
                            Crédit soldé — {d.product_name}
                          </div>
                        )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {view === "historique" && (
          <div className="relative">
            <p className="text-xs text-slate-400 mb-4">
              Journal des événements de vos dossiers (création, validations,
              paiements).
            </p>
            {timeline.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-sm">
                Aucune transaction pour le moment
              </div>
            ) : (
              <div className="space-y-0">
                {timeline.map((ev, i) => (
                  <div key={ev.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                          ev.type === "payment"
                            ? "bg-cyan-500/20 text-cyan-300"
                            : ev.type === "success"
                            ? "bg-emerald-500/20 text-emerald-300"
                            : ev.type === "danger"
                            ? "bg-red-500/20 text-red-300"
                            : ev.type === "warning"
                            ? "bg-amber-500/20 text-amber-300"
                            : "bg-white/10 text-slate-300"
                        }`}
                      >
                        {ev.type === "payment" ? (
                          <Wallet className="w-3.5 h-3.5" />
                        ) : ev.type === "success" ? (
                          <CheckCircle className="w-3.5 h-3.5" />
                        ) : ev.type === "danger" ? (
                          <XCircle className="w-3.5 h-3.5" />
                        ) : (
                          <FileText className="w-3.5 h-3.5" />
                        )}
                      </div>
                      {i < timeline.length - 1 && (
                        <div className="w-px flex-1 bg-white/10 my-1 min-h-[24px]" />
                      )}
                    </div>
                    <div className="pb-5 flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold">{ev.title}</p>
                          <p className="text-[11px] text-slate-400">
                            {ev.product} · #{ev.reference}
                          </p>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {ev.detail}
                          </p>
                        </div>
                        {ev.amount != null && ev.amount > 0 && (
                          <span className="text-xs font-bold text-cyan-300 shrink-0">
                            {formatPrice(ev.amount)}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-600 mt-1">
                        {formatDate(ev.date)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}