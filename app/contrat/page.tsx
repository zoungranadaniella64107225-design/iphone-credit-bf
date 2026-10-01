"use client";

import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useState, Suspense, useRef, useEffect } from "react";
import {
  ArrowLeft,
  Upload,
  Camera,
  CheckCircle,
  AlertCircle,
  X,
  Shield,
  Clock,
  Loader2,
  Printer,
  CreditCard,
  RefreshCw,
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
  product_grade: string | null;
  mode: string;
  status: string;
  full_name: string;
  phone: string;
  amount_down: number | null;
  amount_deposit: number | null;
  amount_total_before: number | null;
  amount_remaining: number | null;
  contract_photo_url: string | null;
  admin_note: string | null;
};

function ContratContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const produitId = searchParams.get("produit") || "";
  const modeParam = searchParams.get("mode") || "credit";
  const dossierParam = searchParams.get("dossier");

  const [checking, setChecking] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [dossier, setDossier] = useState<Dossier | null>(null);
  const [loadError, setLoadError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const [signedPhoto, setSignedPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatPrice = (n: number) => n.toLocaleString("fr-FR") + " F CFA";

  const loadDossier = async () => {
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      const url = `/contrat?produit=${produitId}&mode=${modeParam}&dossier=${dossierParam || ""}`;
      router.replace(`/login?redirect=${encodeURIComponent(url)}`);
      return null;
    }

    setUserId(session.user.id);

    let dossierId = dossierParam;
    if (!dossierId) {
      try {
        const raw = localStorage.getItem("lastDossier");
        if (raw) dossierId = JSON.parse(raw)?.id || null;
      } catch {
        /* ignore */
      }
    }

    let found: Dossier | null = null;

    if (dossierId) {
      const { data } = await supabase
        .from("dossiers")
        .select("*")
        .eq("id", dossierId)
        .eq("user_id", session.user.id)
        .maybeSingle();
      if (data) found = data as Dossier;
    }

    if (!found && produitId) {
      const { data } = await supabase
        .from("dossiers")
        .select("*")
        .eq("user_id", session.user.id)
        .eq("product_id", Number(produitId) || produitId)
        .not("status", "in", '("annule","paye","livre")')
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) found = data as Dossier;
    }

    if (!found) {
      const { data } = await supabase
        .from("dossiers")
        .select("*")
        .eq("user_id", session.user.id)
        .not("status", "in", '("annule","paye","livre")')
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) found = data as Dossier;
    }

    return found;
  };

  useEffect(() => {
    (async () => {
      try {
        const found = await loadDossier();
        if (!found) {
          setLoadError(
            "Aucun dossier en cours. Reprenez depuis le catalogue ou votre espace."
          );
        } else {
          setDossier(found);
          localStorage.setItem(
            "lastDossier",
            JSON.stringify({
              id: found.id,
              reference: found.reference,
              produitId: found.product_id,
              mode: found.mode,
            })
          );
        }
      } catch (e) {
        console.error(e);
        setLoadError("Erreur de chargement du dossier.");
      } finally {
        setChecking(false);
      }
    })();
  }, [router, produitId, modeParam, dossierParam]);

  // Rafraîchir le statut (après action admin)
  const refreshStatus = async () => {
    setRefreshing(true);
    try {
      const found = await loadDossier();
      if (found) setDossier(found);
    } finally {
      setRefreshing(false);
    }
  };

  // ---- Impression contrat (même HTML qu’avant, raccourci ici) ----
  const openContractPrint = () => {
    if (!dossier) return;
    // ... réutilise ton générateur HTML / print (identique à avant)
    // Pour gagner de la place : garde ta fonction openContractPrint existante
    const buyerName = dossier.full_name;
    const productName = dossier.product_name || "iPhone";
    const price = Number(dossier.product_price || 0);
    const ref = dossier.reference;
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Contrat ${ref}</title>
<style>body{font-family:Arial;padding:24px}h1{color:#1d4ed8}</style></head>
<body><h1>iPhone Credit BF — Contrat</h1>
<p>Dossier ${ref}</p>
<p>Acheteur : ${buyerName}</p>
<p>Produit : ${productName} — ${formatPrice(price)}</p>
<p>Signature acheteur : ________________</p>
<script>window.onload=function(){window.print()}</script>
</body></html>`;
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const w = window.open(url, "_blank");
    if (!w) setError("Autorisez les popups pour ouvrir le contrat.");
    setTimeout(() => URL.revokeObjectURL(url), 15000);
  };

  const handlePhoto = (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Seules les images sont acceptées");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("Image trop lourde (max 10 Mo)");
      return;
    }
    if (preview) URL.revokeObjectURL(preview);
    setSignedPhoto(file);
    setPreview(URL.createObjectURL(file));
    setError("");
  };

  /** Envoi photo → statut contrat_en_attente (PAS paiement) */
  const handleUpload = async () => {
    if (!signedPhoto || !dossier || !userId) {
      setError("Photo du contrat signé + CNIB obligatoire");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const supabase = createClient();
      const ext = signedPhoto.name.split(".").pop() || "jpg";
      const path = `${userId}/${dossier.id}_contrat_${Date.now()}.${ext}`;

      let photoUrl: string | null = null;
      const { error: upErr } = await supabase.storage
        .from("cnib")
        .upload(path, signedPhoto, { upsert: true });

      if (!upErr) {
        const { data } = supabase.storage.from("cnib").getPublicUrl(path);
        photoUrl = data.publicUrl;
      }

      const { error: updErr } = await supabase
        .from("dossiers")
        .update({
          contract_photo_url: photoUrl,
          status: "contrat_en_attente",
          admin_note: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", dossier.id)
        .eq("user_id", userId);

      if (updErr) throw updErr;

      setDossier((d) =>
        d
          ? {
              ...d,
              status: "contrat_en_attente",
              contract_photo_url: photoUrl,
              admin_note: null,
            }
          : d
      );
      setSignedPhoto(null);
      if (preview) URL.revokeObjectURL(preview);
      setPreview(null);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Impossible d'envoyer le contrat"
      );
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-7 h-7 text-primary-500 animate-spin" />
      </div>
    );
  }

  if (loadError || !dossier) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 text-center">
        <div>
          <AlertCircle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
          <p className="text-sm mb-4">{loadError || "Dossier introuvable"}</p>
          <Link href="/client" className="text-primary-600 font-semibold text-sm">
            Mon espace
          </Link>
        </div>
      </div>
    );
  }

  const price = Number(dossier.product_price || 0);
  const totalBefore = Number(dossier.amount_total_before || 0);
  const remaining = Number(dossier.amount_remaining || 0);

  // ========== ÉCRANS SELON STATUT ==========

  // 1) Attente validation dossier (admin)
  if (dossier.status === "en_attente") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Clock className="w-8 h-8 text-amber-500" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">
            Dossier en cours de vérification
          </h1>
          <p className="text-sm text-gray-600 mb-1">
            Réf. <strong>#{dossier.reference}</strong>
          </p>
          <p className="text-sm text-gray-600 mb-4">
            Notre équipe vérifie vos informations et votre CNIB.  
            Le contrat sera accessible **après validation admin**.
          </p>
          <button
            onClick={refreshStatus}
            disabled={refreshing}
            className="inline-flex items-center gap-2 text-sm font-semibold text-primary-600"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            Actualiser le statut
          </button>
          <p className="text-xs text-gray-400 mt-4">
            Vous pouvez fermer cette page et revenir plus tard.
          </p>
        </div>
      </div>
    );
  }

  // 2) Dossier refusé
  if (dossier.status === "refuse") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Dossier refusé</h1>
          <p className="text-sm text-gray-600 mb-2">
            {dossier.admin_note ||
              "Vos informations ou votre CNIB n’ont pas été validées."}
          </p>
          <Link
            href="/client"
            className="inline-flex mt-4 bg-primary-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl"
          >
            Mon espace
          </Link>
        </div>
      </div>
    );
  }

  // 3) Contrat envoyé — attente admin
  if (dossier.status === "contrat_en_attente") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Clock className="w-8 h-8 text-blue-500" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">
            Contrat en vérification
          </h1>
          <p className="text-sm text-gray-600 mb-4">
            Votre photo a bien été reçue. L’administrateur doit valider le
            contrat signé avant le paiement.
          </p>
          {dossier.contract_photo_url && (
            <img
              src={dossier.contract_photo_url}
              alt="Contrat envoyé"
              className="w-full max-h-40 object-contain rounded-xl border mb-4 bg-white"
            />
          )}
          <button
            onClick={refreshStatus}
            disabled={refreshing}
            className="inline-flex items-center gap-2 text-sm font-semibold text-primary-600"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            Actualiser
          </button>
        </div>
      </div>
    );
  }

  // 4) Contrat refusé → re-upload
  // 5) valide → upload possible
  // 6) pret_paiement → bouton payer

  const canUpload =
    dossier.status === "valide" || dossier.status === "contrat_refuse";
  const canPay = dossier.status === "pret_paiement";

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-4 py-5">
          <Link
            href="/client"
            className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-primary-600 mb-3"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Mon espace
          </Link>
          <h1 className="text-xl font-bold text-gray-900">Contrat de vente</h1>
          <p className="text-sm text-gray-500">
            Dossier <strong>#{dossier.reference}</strong>
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6">
        {dossier.status === "contrat_refuse" && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-5 text-sm text-red-800">
            <p className="font-bold">Contrat refusé</p>
            <p className="text-xs mt-1">
              {dossier.admin_note ||
                "La photo n’est pas conforme. Reprenez une photo claire du contrat signé + CNIB."}
            </p>
          </div>
        )}

        {canPay && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4 mb-5 text-sm text-green-800">
            <p className="font-bold">Contrat validé par l’administration</p>
            <p className="text-xs mt-1">Vous pouvez procéder au paiement.</p>
          </div>
        )}

        {dossier.status === "valide" && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4 mb-5 text-sm text-green-800">
            <p className="font-bold">Dossier validé</p>
            <p className="text-xs mt-1">
              Téléchargez le contrat, signez-le, puis envoyez la photo. Le
              paiement s’ouvrira **après validation admin du contrat**.
            </p>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-4 text-xs space-y-1">
          <p>
            <strong>Acheteur :</strong> {dossier.full_name}
          </p>
          <p>
            <strong>Produit :</strong> {dossier.product_name}
          </p>
          <p>
            <strong>Prix :</strong> {formatPrice(price)}
          </p>
          {dossier.mode === "credit" && (
            <>
              <p>
                <strong>À payer maintenant :</strong> {formatPrice(totalBefore)}
              </p>
              <p>
                <strong>Reste :</strong> {formatPrice(remaining)}
              </p>
            </>
          )}
        </div>

        {(canUpload || canPay) && (
          <>
            <button
              onClick={openContractPrint}
              className="w-full flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 text-white font-semibold text-sm py-3.5 rounded-xl mb-6"
            >
              <Printer className="w-4 h-4" />
              Ouvrir / Imprimer le contrat (PDF)
            </button>
          </>
        )}

        {canUpload && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <Camera className="w-4 h-4 text-primary-600" />
              <h2 className="text-sm font-bold text-gray-900">
                Photo contrat signé + CNIB
              </h2>
            </div>

            {preview ? (
              <div className="relative mb-4">
                <img
                  src={preview}
                  alt="Contrat"
                  className="w-full max-h-64 object-contain rounded-xl border bg-gray-50"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (preview) URL.revokeObjectURL(preview);
                    setSignedPhoto(null);
                    setPreview(null);
                  }}
                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer mb-4">
                <Camera className="w-8 h-8 text-gray-400 mb-2" />
                <span className="text-xs text-gray-500">Prendre ou choisir une photo</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => handlePhoto(e.target.files?.[0] || null)}
                />
              </label>
            )}

            {error && (
              <p className="text-xs text-red-600 mb-3 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                {error}
              </p>
            )}

            <button
              onClick={handleUpload}
              disabled={loading || !signedPhoto}
              className={`w-full flex items-center justify-center gap-2 font-semibold text-sm py-3.5 rounded-xl ${
                signedPhoto
                  ? "bg-accent-400 hover:bg-accent-500 text-white"
                  : "bg-gray-200 text-gray-500 cursor-not-allowed"
              }`}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Envoi...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Envoyer le contrat (attente validation)
                </>
              )}
            </button>
          </div>
        )}

        {canPay && (
          <Link
            href={`/paiement?produit=${dossier.product_id || produitId}&mode=${dossier.mode}&dossier=${dossier.id}`}
            className="w-full flex items-center justify-center gap-2 bg-accent-400 hover:bg-accent-500 text-white font-semibold text-sm py-3.5 rounded-xl shadow-lg"
          >
            <CreditCard className="w-4 h-4" />
            Payer maintenant
          </Link>
        )}

        <div className="mt-5 flex gap-2 text-xs text-gray-500">
          <Shield className="w-4 h-4 shrink-0" />
          <p>
            Paiement bloqué tant que l’admin n’a pas validé le contrat signé.
          </p>
        </div>

        <button
          onClick={refreshStatus}
          className="mt-4 w-full text-center text-xs text-primary-600 font-medium"
        >
          Actualiser le statut
        </button>
      </div>
    </div>
  );
}

export default function ContratPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          Chargement...
        </div>
      }
    >
      <ContratContent />
    </Suspense>
  );
}