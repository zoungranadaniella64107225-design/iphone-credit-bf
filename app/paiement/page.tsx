"use client";

import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useState, Suspense, useEffect, useRef } from "react";
import {
  ArrowLeft,
  CheckCircle,
  Loader2,
  Shield,
  Clock,
  Lock,
  Smartphone,
  AlertCircle,
  Sparkles,
  BadgeCheck,
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
};

type PayMethod = "orange" | "moov" | "wave";

const METHODS: {
  id: PayMethod;
  name: string;
  sub: string;
  color: string;
  ring: string;
  bg: string;
  logo: string;
}[] = [
  {
    id: "orange",
    name: "Orange Money",
    sub: "USSD · App Orange",
    color: "text-orange-600",
    ring: "ring-orange-400",
    bg: "from-orange-500 to-orange-600",
    logo: "OM",
  },
  {
    id: "moov",
    name: "Moov Money",
    sub: "USSD · App Moov",
    color: "text-blue-600",
    ring: "ring-blue-400",
    bg: "from-blue-500 to-blue-700",
    logo: "MM",
  },
  {
    id: "wave",
    name: "Wave",
    sub: "App Wave",
    color: "text-cyan-600",
    ring: "ring-cyan-400",
    bg: "from-cyan-400 to-teal-500",
    logo: "W",
  },
];

function PaiementContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const produitId = searchParams.get("produit") || "";
  const modeParam = searchParams.get("mode") || "credit";
  const dossierParam = searchParams.get("dossier");

  const [checking, setChecking] = useState(true);
  const [dossier, setDossier] = useState<Dossier | null>(null);
  const [loadError, setLoadError] = useState("");

  const [method, setMethod] = useState<PayMethod | null>(null);
  const [phonePay, setPhonePay] = useState("");
  const [step, setStep] = useState<"method" | "otp" | "processing" | "done">(
    "method"
  );
  const [otp, setOtp] = useState(["", "", "", ""]);
  const [demoOtp, setDemoOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  const formatPrice = (n: number) => n.toLocaleString("fr-FR") + " F";

  // ========== Session + dossier réel ==========
  useEffect(() => {
    const load = async () => {
      try {
        const supabase = createClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.user) {
          const url = `/paiement?produit=${produitId}&mode=${modeParam}&dossier=${dossierParam || ""}`;
          router.replace(`/login?redirect=${encodeURIComponent(url)}`);
          return;
        }

        let dossierId = dossierParam;
        if (!dossierId) {
          try {
            const raw = localStorage.getItem("lastDossier");
            if (raw) dossierId = JSON.parse(raw)?.id;
          } catch {
            /* ignore */
          }
        }

        let found: Dossier | null = null;

        if (dossierId) {
          const { data } = await supabase
            .from("dossiers")
            .select(
              "id, reference, product_id, product_name, product_price, product_storage, product_color, mode, status, full_name, phone, amount_down, amount_deposit, amount_total_before, amount_remaining"
            )
            .eq("id", dossierId)
            .eq("user_id", session.user.id)
            .maybeSingle();
          if (data) found = data as Dossier;
        }

        if (!found && produitId) {
          const { data } = await supabase
            .from("dossiers")
            .select(
              "id, reference, product_id, product_name, product_price, product_storage, product_color, mode, status, full_name, phone, amount_down, amount_deposit, amount_total_before, amount_remaining"
            )
            .eq("user_id", session.user.id)
            .eq("product_id", Number(produitId) || produitId)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          if (data) found = data as Dossier;
        }

        if (!found) {
          setLoadError("Aucun dossier trouvé pour ce paiement.");
          setChecking(false);
          return;
        }

        // Paiement uniquement si admin a validé le contrat
        if (found.status !== "pret_paiement" && found.status !== "paye") {
          setLoadError(
            found.status === "contrat_en_attente"
              ? "Votre contrat est encore en vérification. Revenez après validation admin."
              : "Paiement non disponible pour ce dossier. Vérifiez l’état dans votre espace."
          );
          setDossier(found);
          setChecking(false);
          return;
        }

        if (found.status === "paye") {
          setDossier(found);
          setStep("done");
          setChecking(false);
          return;
        }

        setDossier(found);
        setPhonePay(found.phone || "");
        localStorage.setItem(
          "lastDossier",
          JSON.stringify({
            id: found.id,
            reference: found.reference,
            produitId: found.product_id,
            mode: found.mode,
          })
        );
      } catch {
        router.replace("/login");
      } finally {
        setChecking(false);
      }
    };

    load();
  }, [router, produitId, modeParam, dossierParam]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-white">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
          <p className="text-sm text-slate-500">Préparation du paiement sécurisé...</p>
        </div>
      </div>
    );
  }

  if (loadError && !dossier) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center max-w-sm">
          <AlertCircle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
          <p className="text-sm text-gray-700 mb-4">{loadError}</p>
          <Link
            href="/client"
            className="inline-flex bg-primary-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl"
          >
            Mon espace
          </Link>
        </div>
      </div>
    );
  }

  if (!dossier) return null;

  if (loadError && dossier.status !== "pret_paiement" && dossier.status !== "paye") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center max-w-sm">
          <Clock className="w-10 h-10 text-amber-500 mx-auto mb-3" />
          <p className="text-sm text-gray-700 mb-2 font-semibold">
            #{dossier.reference}
          </p>
          <p className="text-sm text-gray-600 mb-4">{loadError}</p>
          <Link
            href={`/contrat?dossier=${dossier.id}&produit=${dossier.product_id || ""}&mode=${dossier.mode}`}
            className="inline-flex bg-primary-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl"
          >
            Voir mon dossier
          </Link>
        </div>
      </div>
    );
  }

  const mode = dossier.mode || modeParam;
  const price = Number(dossier.product_price || 0);
  const totalNow =
    mode === "credit"
      ? Number(dossier.amount_total_before || Math.round(price * 0.6))
      : price;
  const remaining =
    mode === "credit"
      ? Number(dossier.amount_remaining || Math.round(price * 0.5))
      : 0;
  const monthly = mode === "credit" ? Math.round(remaining / 3) : 0;
  const schedule =
    mode === "credit"
      ? [
          { mois: "Échéance 1", montant: monthly },
          { mois: "Échéance 2", montant: monthly },
          { mois: "Échéance 3", montant: remaining - monthly * 2 },
        ]
      : [];

  const methodMeta = METHODS.find((m) => m.id === method);

  // Étape 1 → envoi OTP démo
  const sendOtp = () => {
    setError("");
    if (!method) {
      setError("Choisissez un moyen de paiement");
      return;
    }
    const clean = phonePay.replace(/\D/g, "");
    if (clean.length < 8) {
      setError("Numéro invalide (min. 8 chiffres)");
      return;
    }

    // OTP démo à 4 chiffres
    const code = String(Math.floor(1000 + Math.random() * 9000));
    setDemoOtp(code);
    setOtp(["", "", "", ""]);
    setStep("otp");
    setTimeout(() => otpRefs.current[0]?.focus(), 100);
  };

  const handleOtpChange = (index: number, value: string) => {
    const v = value.replace(/\D/g, "").slice(-1);
    const next = [...otp];
    next[index] = v;
    setOtp(next);
    if (v && index < 3) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  // Confirmation OTP → paiement
  const confirmPay = async () => {
    const entered = otp.join("");
    if (entered.length < 4) {
      setError("Saisissez le code à 4 chiffres");
      return;
    }
    if (entered !== demoOtp) {
      setError("Code incorrect. Réessayez.");
      return;
    }

    setError("");
    setLoading(true);
    setStep("processing");

    try {
      // Simulation réseau opérateur
      await new Promise((r) => setTimeout(r, 2200));

      const supabase = createClient();
      const { error: updErr } = await supabase
        .from("dossiers")
        .update({
          status: "paye",
          paid_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          admin_note: `Paiement démo ${method} — ${phonePay}`,
        })
        .eq("id", dossier.id);

      if (updErr) throw updErr;

      localStorage.setItem(
        "lastPayment",
        JSON.stringify({
          dossierId: dossier.id,
          reference: dossier.reference,
          produitId: dossier.product_id,
          mode,
          totalNow,
          remaining,
          method,
          phone: phonePay,
          date: new Date().toISOString(),
        })
      );

      setStep("done");
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Échec du paiement. Réessayez."
      );
      setStep("otp");
    } finally {
      setLoading(false);
    }
  };

  // ========== SUCCÈS ==========
  if (step === "done") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-slate-50">
        <div className="max-w-md mx-auto px-4 py-12 text-center">
          <div className="relative inline-flex mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-emerald-400 to-green-600 rounded-full flex items-center justify-center shadow-xl shadow-emerald-500/30">
              <CheckCircle className="w-10 h-10 text-white" />
            </div>
            <Sparkles className="w-5 h-5 text-amber-400 absolute -top-1 -right-1" />
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Paiement confirmé
          </h1>
          <p className="text-sm text-gray-600 mb-1">
            Dossier <strong>#{dossier.reference}</strong>
          </p>
          <p className="text-sm text-gray-600 mb-6">
            <strong>{formatPrice(totalNow)}</strong>
            {methodMeta ? ` via ${methodMeta.name}` : ""}
          </p>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-lg shadow-gray-200/50 p-5 mb-6 text-left">
            <div className="flex items-center gap-2 mb-3">
              <BadgeCheck className="w-4 h-4 text-emerald-500" />
              <p className="text-sm font-bold text-gray-900">Récapitulatif</p>
            </div>
            <div className="space-y-2 text-xs text-gray-600">
              <div className="flex justify-between">
                <span>Produit</span>
                <span className="font-semibold text-gray-900">
                  {dossier.product_name}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Payé maintenant</span>
                <span className="font-semibold text-emerald-600">
                  {formatPrice(totalNow)}
                </span>
              </div>
              {mode === "credit" && (
                <div className="flex justify-between">
                  <span>Reste (crédit)</span>
                  <span className="font-semibold text-gray-900">
                    {formatPrice(remaining)}
                  </span>
                </div>
              )}
            </div>

            {mode === "credit" && schedule.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs font-bold text-gray-900 mb-2">
                  Échéances restantes
                </p>
                <div className="space-y-1.5">
                  {schedule.map((s, i) => (
                    <div
                      key={i}
                      className="flex justify-between bg-slate-50 rounded-lg px-3 py-2 text-xs"
                    >
                      <span className="text-gray-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {s.mois}
                      </span>
                      <span className="font-semibold">
                        {formatPrice(s.montant)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <Link
              href="/client"
              className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold text-sm py-3.5 rounded-xl shadow-lg shadow-primary-600/20"
            >
              Mon espace client
            </Link>
            <Link href="/" className="text-sm text-gray-500">
              Accueil
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ========== PROCESSING ==========
  if (step === "processing") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4">
        <div className="text-center text-white max-w-xs">
          <div
            className={`w-16 h-16 mx-auto mb-5 rounded-2xl bg-gradient-to-br ${methodMeta?.bg || "from-primary-500 to-primary-600"} flex items-center justify-center text-xl font-black shadow-2xl animate-pulse`}
          >
            {methodMeta?.logo}
          </div>
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-white/80" />
          <p className="font-semibold mb-1">Traitement du paiement</p>
          <p className="text-sm text-white/60">
            Communication sécurisée avec {methodMeta?.name}...
          </p>
        </div>
      </div>
    );
  }

  // ========== FORMULAIRE ==========
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-primary-50/30">
      <div className="bg-white/80 backdrop-blur border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-4">
          <Link
            href={`/contrat?dossier=${dossier.id}&produit=${dossier.product_id || ""}&mode=${mode}`}
            className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-primary-600 mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Retour
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Paiement sécurisé</h1>
              <p className="text-xs text-gray-500 mt-0.5">
                #{dossier.reference} · {dossier.full_name}
              </p>
            </div>
            <div className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
              <Lock className="w-3 h-3" />
              SSL
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6">
        {/* Montant hero */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary-600 via-primary-600 to-indigo-700 p-6 text-white mb-6 shadow-xl shadow-primary-600/25">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <p className="text-xs text-primary-100 mb-1 relative">
            {mode === "credit"
              ? "À régler maintenant (50% + caution)"
              : "Paiement total"}
          </p>
          <p className="text-4xl font-black tracking-tight relative">
            {formatPrice(totalNow)}
          </p>
          <p className="text-sm text-primary-100 mt-3 relative">
            {dossier.product_name}
            {dossier.product_storage ? ` · ${dossier.product_storage}` : ""}
          </p>
          {mode === "credit" && (
            <p className="text-xs text-primary-200 mt-2 relative">
              Puis reste {formatPrice(remaining)} sur 2–3 mois
            </p>
          )}
        </div>

        {step === "method" && (
          <>
            <p className="text-sm font-bold text-gray-900 mb-3">
              Moyen de paiement
            </p>
            <div className="space-y-2.5 mb-6">
              {METHODS.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    setMethod(m.id);
                    setError("");
                  }}
                  className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all ${
                    method === m.id
                      ? `border-transparent ring-2 ${m.ring} bg-white shadow-md`
                      : "border-gray-100 bg-white hover:border-gray-200"
                  }`}
                >
                  <div
                    className={`w-12 h-12 rounded-xl bg-gradient-to-br ${m.bg} flex items-center justify-center text-white font-black text-sm shadow-lg`}
                  >
                    {m.logo}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-bold ${m.color}`}>{m.name}</p>
                    <p className="text-[11px] text-gray-400">{m.sub}</p>
                  </div>
                  {method === m.id && (
                    <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
                  )}
                </button>
              ))}
            </div>

            {method && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-5">
                <label className="text-xs font-semibold text-gray-700 mb-1.5 block">
                  Numéro {methodMeta?.name}
                </label>
                <div className="relative mb-4">
                  <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="tel"
                    value={phonePay}
                    onChange={(e) => setPhonePay(e.target.value)}
                    placeholder="70 12 34 56"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 text-[11px] text-amber-900 leading-relaxed">
                  <strong>Mode démo :</strong> aucun débit réel. Un code OTP à 4
                  chiffres s’affichera pour valider le paiement test.
                </div>

                {error && (
                  <p className="text-xs text-red-600 mb-3 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {error}
                  </p>
                )}

                <button
                  type="button"
                  onClick={sendOtp}
                  className={`w-full flex items-center justify-center gap-2 font-semibold text-sm py-3.5 rounded-xl text-white shadow-lg transition active:scale-[0.98] bg-gradient-to-r ${methodMeta?.bg}`}
                >
                  Continuer · {formatPrice(totalNow)}
                </button>
              </div>
            )}
          </>
        )}

        {step === "otp" && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-lg p-6 mb-5">
            <div
              className={`w-12 h-12 rounded-xl bg-gradient-to-br ${methodMeta?.bg} flex items-center justify-center text-white font-black text-sm mb-4 mx-auto`}
            >
              {methodMeta?.logo}
            </div>
            <h2 className="text-center text-sm font-bold text-gray-900 mb-1">
              Confirmation OTP
            </h2>
            <p className="text-center text-xs text-gray-500 mb-4">
              Code envoyé au {phonePay} (simulation)
            </p>

            {/* Affichage code démo */}
            <div className="bg-slate-900 text-center rounded-xl py-3 mb-5">
              <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">
                Code démo
              </p>
              <p className="text-2xl font-mono font-bold text-white tracking-[0.3em]">
                {demoOtp}
              </p>
            </div>

            <div className="flex justify-center gap-3 mb-5">
              {otp.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => {
                    otpRefs.current[i] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(i, e)}
                  className="w-12 h-14 text-center text-xl font-bold rounded-xl border-2 border-gray-200 focus:border-primary-500 focus:outline-none bg-slate-50"
                />
              ))}
            </div>

            {error && (
              <p className="text-xs text-red-600 text-center mb-3">{error}</p>
            )}

            <button
              type="button"
              onClick={confirmPay}
              disabled={loading}
              className={`w-full flex items-center justify-center gap-2 font-semibold text-sm py-3.5 rounded-xl text-white shadow-lg disabled:opacity-60 bg-gradient-to-r ${methodMeta?.bg}`}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Confirmer le paiement"
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setStep("method");
                setError("");
              }}
              className="w-full text-center text-xs text-gray-500 mt-3"
            >
              Changer de moyen
            </button>
          </div>
        )}

        <div className="flex gap-2 text-[11px] text-gray-500 px-1">
          <Shield className="w-4 h-4 shrink-0 text-primary-500" />
          <p>
            En production, ce flux appellera l’API {methodMeta?.name || "Mobile Money"}{" "}
            (OTP opérateur réel). Ici tout est simulé pour tester le parcours
            complet.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function PaiementPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          Chargement...
        </div>
      }
    >
      <PaiementContent />
    </Suspense>
  );
}