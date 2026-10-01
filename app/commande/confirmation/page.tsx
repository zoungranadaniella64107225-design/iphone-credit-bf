"use client";

import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import {
  CheckCircle,
  Clock,
  ArrowRight,
  MessageCircle,
  Phone,
  User,
  FileText,
  Loader2,
  Smartphone,
  CreditCard,
  AlertCircle,
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
  amount_total_before: number | null;
  amount_remaining: number | null;
  admin_note?: string | null;
};

function statusLabel(status: string) {
  const map: Record<string, string> = {
    en_attente: "En attente de validation",
    valide: "Dossier validé",
    refuse: "Dossier refusé",
    contrat_en_attente: "Contrat en vérification",
    contrat_refuse: "Contrat refusé",
    pret_paiement: "Prêt pour paiement",
    paye: "Payé",
    livre: "Livré",
    annule: "Annulé",
  };
  return map[status] || status.replace(/_/g, " ");
}

function statusBadgeClass(status: string) {
  if (status === "refuse" || status === "contrat_refuse")
    return "bg-red-100 text-red-700";
  if (status === "valide" || status === "pret_paiement" || status === "paye")
    return "bg-green-100 text-green-700";
  if (status === "contrat_en_attente") return "bg-blue-100 text-blue-700";
  return "bg-amber-100 text-amber-700";
}

function ConfirmationContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const produitId = searchParams.get("produit");
  const mode = searchParams.get("mode") || "credit";
  const dossierParam = searchParams.get("dossier");

  const [user, setUser] = useState<{ name: string; phone: string } | null>(null);
  const [dossier, setDossier] = useState<Dossier | null>(null);
  const [checking, setChecking] = useState(true);

  const formatPrice = (n: number) => n.toLocaleString("fr-FR") + " F";

  useEffect(() => {
    const load = async () => {
      try {
        const supabase = createClient();

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.user) {
          const currentUrl = `/commande/confirmation?produit=${produitId || ""}&mode=${mode}&dossier=${dossierParam || ""}`;
          router.replace(`/login?redirect=${encodeURIComponent(currentUrl)}`);
          return;
        }

        setUser({
          name: session.user.user_metadata?.full_name || "Client",
          phone:
            session.user.user_metadata?.phone ||
            session.user.email?.split("@")[0] ||
            "",
        });

        let dossierId = dossierParam;

        if (!dossierId) {
          try {
            const raw = localStorage.getItem("lastDossier");
            if (raw) {
              const parsed = JSON.parse(raw);
              dossierId = parsed.id || null;
            }
          } catch {
            // ignore
          }
        }

        if (dossierId) {
          const { data, error } = await supabase
            .from("dossiers")
            .select(
              "id, reference, product_id, product_name, product_price, product_storage, product_color, mode, status, full_name, phone, amount_total_before, amount_remaining, admin_note"
            )
            .eq("id", dossierId)
            .eq("user_id", session.user.id)
            .maybeSingle();

          if (!error && data) {
            setDossier(data as Dossier);
            localStorage.setItem(
              "lastDossier",
              JSON.stringify({
                id: data.id,
                reference: data.reference,
                produitId: data.product_id,
                mode: data.mode,
              })
            );
          }
        } else if (produitId) {
          const { data } = await supabase
            .from("dossiers")
            .select(
              "id, reference, product_id, product_name, product_price, product_storage, product_color, mode, status, full_name, phone, amount_total_before, amount_remaining, admin_note"
            )
            .eq("user_id", session.user.id)
            .eq("product_id", Number(produitId) || produitId)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (data) {
            setDossier(data as Dossier);
            localStorage.setItem(
              "lastDossier",
              JSON.stringify({
                id: data.id,
                reference: data.reference,
                produitId: data.product_id,
                mode: data.mode,
              })
            );
          }
        }
      } catch {
        router.replace("/login");
      } finally {
        setChecking(false);
      }
    };

    load();
  }, [router, produitId, mode, dossierParam]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-7 h-7 text-primary-500 animate-spin" />
          <p className="text-sm text-gray-500">Chargement du dossier...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-sm text-gray-500">Redirection...</p>
      </div>
    );
  }

  const reference = dossier?.reference
    ? `#${dossier.reference}`
    : `#ICBF-${produitId || "000"}`;

  const displayMode = dossier?.mode || mode;
  const productName = dossier?.product_name || "Votre iPhone";
  const productIdForLink = String(dossier?.product_id || produitId || "");
  const status = dossier?.status || "en_attente";

  const contratHref = `/contrat?produit=${productIdForLink}&mode=${displayMode}${
    dossier ? `&dossier=${dossier.id}` : ""
  }`;
  const paiementHref = `/paiement?produit=${productIdForLink}&mode=${displayMode}${
    dossier ? `&dossier=${dossier.id}` : ""
  }`;

  // Bouton principal selon statut
  let primaryCta: {
    href: string;
    label: string;
    icon: React.ReactNode;
  } | null = null;

  if (status === "en_attente") {
    primaryCta = {
      href: "/client",
      label: "Suivre mon dossier",
      icon: <Clock className="w-4 h-4" />,
    };
  } else if (status === "valide" || status === "contrat_refuse") {
    primaryCta = {
      href: contratHref,
      label:
        status === "contrat_refuse"
          ? "Renvoyer le contrat"
          : "Continuer vers le contrat",
      icon: <FileText className="w-4 h-4" />,
    };
  } else if (status === "contrat_en_attente") {
    primaryCta = {
      href: contratHref,
      label: "Voir l’état du contrat",
      icon: <Clock className="w-4 h-4" />,
    };
  } else if (status === "pret_paiement") {
    primaryCta = {
      href: paiementHref,
      label: "Payer maintenant",
      icon: <CreditCard className="w-4 h-4" />,
    };
  } else if (status === "refuse") {
    primaryCta = {
      href: "/client",
      label: "Mon espace",
      icon: <User className="w-4 h-4" />,
    };
  } else {
    primaryCta = {
      href: "/client",
      label: "Mon espace",
      icon: <User className="w-4 h-4" />,
    };
  }

  const step1Active = status === "en_attente";
  const step1Done = [
    "valide",
    "contrat_en_attente",
    "contrat_refuse",
    "pret_paiement",
    "paye",
    "livre",
  ].includes(status);
  const step2Active =
    status === "valide" ||
    status === "contrat_en_attente" ||
    status === "contrat_refuse";
  const step2Done = ["pret_paiement", "paye", "livre"].includes(status);
  const step3Active = status === "pret_paiement";
  const step3Done = ["paye", "livre"].includes(status);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-b from-green-50 to-white border-b border-green-100">
        <div className="max-w-2xl mx-auto px-4 py-10 text-center">
          <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-green-500/30">
            <CheckCircle className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Dossier bien reçu !
          </h1>
          <p className="text-sm text-gray-600 max-w-md mx-auto">
            Merci <strong>{dossier?.full_name || user.name}</strong>. Votre
            demande a été enregistrée.
          </p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Référence */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6 text-center">
          <p className="text-xs text-gray-500 mb-1">Numéro de dossier</p>
          <p className="text-xl font-bold text-primary-600 tracking-wider">
            {reference}
          </p>
          <p className="text-[11px] text-gray-400 mt-1">
            Conservez ce numéro pour le suivi
          </p>
          {dossier?.status && (
            <span
              className={`inline-block mt-3 text-[10px] font-semibold px-2.5 py-1 rounded-full ${statusBadgeClass(
                status
              )}`}
            >
              {statusLabel(status)}
            </span>
          )}
        </div>

        {/* Message selon statut */}
        {status === "en_attente" && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex gap-3">
            <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900">
              <p className="font-bold mb-1">En attente de validation admin</p>
              <p>
                Vos informations et votre CNIB sont en cours de vérification.
                Le contrat sera accessible uniquement après validation.
              </p>
            </div>
          </div>
        )}

        {status === "refuse" && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="text-xs text-red-900">
              <p className="font-bold mb-1">Dossier refusé</p>
              <p>
                {dossier?.admin_note ||
                  "Vos documents n’ont pas été validés. Contactez le support."}
              </p>
            </div>
          </div>
        )}

        {status === "valide" && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 text-xs text-green-900">
            <p className="font-bold">Dossier validé</p>
            <p className="mt-1">
              Vous pouvez maintenant télécharger et signer le contrat.
            </p>
          </div>
        )}

        {status === "pret_paiement" && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 text-xs text-green-900">
            <p className="font-bold">Contrat validé</p>
            <p className="mt-1">Vous pouvez procéder au paiement.</p>
          </div>
        )}

        {/* Produit */}
        {dossier && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-6 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center shrink-0">
              <Smartphone className="w-5 h-5 text-primary-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-gray-900 truncate">
                {productName}
              </p>
              <p className="text-xs text-gray-500">
                {dossier.product_storage || "—"}
                {dossier.product_color ? ` • ${dossier.product_color}` : ""}
                {dossier.product_price
                  ? ` • ${formatPrice(Number(dossier.product_price))}`
                  : ""}
              </p>
            </div>
            <span
              className={`text-[10px] font-semibold px-2.5 py-1 rounded-full shrink-0 ${
                displayMode === "credit"
                  ? "bg-accent-100 text-accent-700"
                  : "bg-primary-100 text-primary-700"
              }`}
            >
              {displayMode === "credit" ? "Crédit" : "Total"}
            </span>
          </div>
        )}

        {/* Compte */}
        <div className="bg-primary-50 border border-primary-100 rounded-xl p-3 mb-6 flex items-center gap-3">
          <User className="w-5 h-5 text-primary-600 shrink-0" />
          <div className="text-xs text-primary-800">
            <p className="font-semibold">
              Compte : {dossier?.full_name || user.name}
            </p>
            <p>
              {dossier?.phone || user.phone} — Suivi dans votre espace client
            </p>
          </div>
        </div>

        {/* CTA principal */}
        {primaryCta && (
          <Link
            href={primaryCta.href}
            className="flex items-center justify-center gap-2 w-full bg-accent-400 hover:bg-accent-500 text-white font-semibold text-sm py-3.5 rounded-xl shadow-lg shadow-accent-400/25 mb-8 transition-all"
          >
            {primaryCta.icon}
            {primaryCta.label}
            <ArrowRight className="w-4 h-4" />
          </Link>
        )}

        {/* Étapes */}
        <h2 className="text-sm font-bold text-gray-900 mb-4">
          Prochaines étapes
        </h2>

        <div className="space-y-3 mb-8">
          {/* Étape 1 */}
          <div
            className={`bg-white rounded-2xl border shadow-sm p-4 flex gap-4 ${
              step1Active
                ? "border-amber-200"
                : step1Done
                ? "border-green-100"
                : "border-gray-100 opacity-70"
            }`}
          >
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0 ${
                step1Done
                  ? "bg-green-500"
                  : step1Active
                  ? "bg-primary-500"
                  : "bg-gray-200 text-gray-500"
              }`}
            >
              {step1Done ? <CheckCircle className="w-5 h-5" /> : "1"}
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900 mb-0.5">
                Validation du dossier
              </h3>
              <p className="text-xs text-gray-600">
                Vérification de vos informations et de votre CNIB par l’admin.
              </p>
              {step1Active && (
                <div className="flex items-center gap-1.5 mt-2 text-[11px] text-amber-600">
                  <Clock className="w-3.5 h-3.5" />
                  En attente de validation
                </div>
              )}
              {step1Done && (
                <div className="flex items-center gap-1.5 mt-2 text-[11px] text-green-600">
                  <CheckCircle className="w-3.5 h-3.5" />
                  Validé
                </div>
              )}
            </div>
          </div>

          {/* Étape 2 */}
          <div
            className={`bg-white rounded-2xl border shadow-sm p-4 flex gap-4 ${
              step2Active
                ? "border-primary-200"
                : step2Done
                ? "border-green-100"
                : "border-gray-100 opacity-70"
            }`}
          >
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
                step2Done
                  ? "bg-green-500 text-white"
                  : step2Active
                  ? "bg-primary-500 text-white"
                  : "bg-gray-200 text-gray-500"
              }`}
            >
              {step2Done ? <CheckCircle className="w-5 h-5" /> : "2"}
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900 mb-0.5">
                Signature du contrat
              </h3>
              <p className="text-xs text-gray-600">
                Téléchargez, signez, envoyez la photo. L’admin valide ensuite.
              </p>
            </div>
          </div>

          {/* Étape 3 */}
          <div
            className={`bg-white rounded-2xl border shadow-sm p-4 flex gap-4 ${
              step3Active
                ? "border-accent-200"
                : step3Done
                ? "border-green-100"
                : "border-gray-100 opacity-70"
            }`}
          >
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
                step3Done
                  ? "bg-green-500 text-white"
                  : step3Active
                  ? "bg-accent-400 text-white"
                  : "bg-gray-200 text-gray-500"
              }`}
            >
              {step3Done ? <CheckCircle className="w-5 h-5" /> : "3"}
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900 mb-0.5">
                Paiement (
                {displayMode === "credit" ? "50% + caution" : "total"})
              </h3>
              <p className="text-xs text-gray-600">
                Disponible uniquement après validation admin du contrat signé.
              </p>
            </div>
          </div>

          {/* Étape 4 */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex gap-4 opacity-70">
            <div className="w-10 h-10 bg-gray-200 rounded-xl flex items-center justify-center text-gray-500 font-bold text-sm shrink-0">
              4
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900 mb-0.5">
                Réception de votre iPhone
              </h3>
              <p className="text-xs text-gray-600">
                Expédition après confirmation du paiement.
              </p>
            </div>
          </div>
        </div>

        {/* Contact */}
        <div className="bg-primary-50 border border-primary-100 rounded-2xl p-5 mb-6">
          <h3 className="text-sm font-bold text-primary-900 mb-3">
            Besoin d’aide ?
          </h3>
          <div className="space-y-2">
            <a
              href="https://wa.me/22600000000"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 bg-white rounded-xl p-3 border border-primary-100"
            >
              <div className="w-9 h-9 bg-green-500 rounded-lg flex items-center justify-center">
                <MessageCircle className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">WhatsApp</p>
                <p className="text-xs text-gray-500">Réponse rapide</p>
              </div>
            </a>
            <a
              href="tel:+22600000000"
              className="flex items-center gap-3 bg-white rounded-xl p-3 border border-primary-100"
            >
              <div className="w-9 h-9 bg-primary-500 rounded-lg flex items-center justify-center">
                <Phone className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  Appel téléphonique
                </p>
                <p className="text-xs text-gray-500">+226 XX XX XX XX</p>
              </div>
            </a>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href="/client"
            className="flex-1 inline-flex items-center justify-center gap-2 bg-white border border-gray-200 text-gray-700 font-semibold text-sm py-3 rounded-xl"
          >
            Mon espace
          </Link>
          <Link
            href="/"
            className="flex-1 inline-flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 text-white font-semibold text-sm py-3 rounded-xl"
          >
            Accueil
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function ConfirmationPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          Chargement...
        </div>
      }
    >
      <ConfirmationContent />
    </Suspense>
  );
}