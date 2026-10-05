"use client";

import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useState, Suspense, useRef, useEffect, useCallback } from "react";
import {
  ArrowLeft,
  Upload,
  Camera,
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
  product_id: number | string | null;
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

  const loadDossier = useCallback(async () => {
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
  }, [router, produitId, modeParam, dossierParam]);

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
  }, [loadDossier]);

  const refreshStatus = async () => {
    setRefreshing(true);
    try {
      const found = await loadDossier();
      if (found) setDossier(found);
    } finally {
      setRefreshing(false);
    }
  };

  /** Contrat complet — ouverture + impression / PDF */
  const openContractPrint = () => {
    if (!dossier) return;

    const buyerName = dossier.full_name || "________________";
    const buyerPhone = dossier.phone || "________________";
    const productName = dossier.product_name || "iPhone reconditionné";
    const storage = dossier.product_storage || "—";
    const color = dossier.product_color || "—";
    const grade = dossier.product_grade || "—";
    const price = Number(dossier.product_price || 0);
    const down = Number(dossier.amount_down || 0);
    const deposit = Number(dossier.amount_deposit || 0);
    const totalBefore = Number(dossier.amount_total_before || 0);
    const remaining = Number(dossier.amount_remaining || 0);
    const ref = dossier.reference;
    const modeLabel =
      dossier.mode === "credit"
        ? "Paiement à crédit (échelonnement)"
        : "Paiement comptant (total)";
    const today = new Date().toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
    const money = (n: number) => n.toLocaleString("fr-FR") + " F CFA";

    const creditBlock =
      dossier.mode === "credit"
        ? `
  <h2>Article 3 — Modalités de crédit</h2>
  <table>
    <tr><th>Acompte (environ 50 %)</th><td>${money(down)}</td></tr>
    <tr><th>Caution / dépôt (environ 10 %)</th><td>${money(deposit)}</td></tr>
    <tr><th><strong>Total avant livraison</strong></th><td><strong>${money(totalBefore)}</strong></td></tr>
    <tr><th>Reste à payer après livraison</th><td><strong>${money(remaining)}</strong></td></tr>
  </table>
  <p class="clause"><strong>3.1.</strong> L’Acheteur s’engage à régler le solde restant selon le calendrier d’échéances communiqué dans son espace client, sans retard injustifié.</p>
  <p class="clause"><strong>3.2.</strong> En cas de défaut de paiement, le Vendeur se réserve le droit de suspendre le service, de réclamer le solde, et d’appliquer les mesures prévues par la loi et le présent contrat (y compris, le cas échéant, le blocage ou la récupération de l’appareil selon les conditions expressément acceptées lors de la commande).</p>
  <p class="clause"><strong>3.3.</strong> La caution peut être utilisée pour compenser tout impayé ou dégradation non couverte, dans les limites légales.</p>
  `
        : `
  <h2>Article 3 — Paiement comptant</h2>
  <p>L’Acheteur règle la totalité du prix, soit <strong>${money(price)}</strong>, avant ou lors de la remise de l’appareil, selon les modalités indiquées sur la plateforme.</p>
  `;

    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Contrat de vente — ${ref}</title>
  <style>
    @page { size: A4; margin: 14mm; }
    * { box-sizing: border-box; }
    body {
      font-family: "Times New Roman", Times, serif;
      font-size: 11pt;
      line-height: 1.45;
      color: #111;
      max-width: 210mm;
      margin: 0 auto;
      padding: 12mm 14mm;
      background: #fff;
    }
    .no-print {
      position: sticky; top: 0; z-index: 10;
      background: #0f172a; color: #fff;
      padding: 12px 16px; margin: -12mm -14mm 16px -14mm;
      display: flex; flex-wrap: wrap; gap: 10px; align-items: center; justify-content: space-between;
      font-family: system-ui, sans-serif; font-size: 13px;
    }
    .no-print button {
      background: #2563eb; color: #fff; border: 0; border-radius: 8px;
      padding: 10px 16px; font-weight: 600; cursor: pointer;
    }
    .no-print button.secondary { background: #334155; }
    .header {
      text-align: center; border-bottom: 2px solid #1e3a8a; padding-bottom: 12px; margin-bottom: 16px;
    }
    .header h1 {
      margin: 0; font-size: 16pt; color: #1e3a8a; letter-spacing: 0.02em;
      text-transform: uppercase;
    }
    .header .sub { font-size: 10pt; color: #334155; margin-top: 4px; }
    .badge {
      display: inline-block; margin-top: 8px; padding: 4px 10px;
      border: 1px solid #1e3a8a; border-radius: 4px; font-size: 9pt; font-weight: bold;
    }
    h2 {
      font-size: 11pt; color: #1e3a8a; margin: 18px 0 8px;
      border-bottom: 1px solid #cbd5e1; padding-bottom: 4px;
      text-transform: uppercase; letter-spacing: 0.03em;
    }
    p { margin: 6px 0; text-align: justify; }
    table { width: 100%; border-collapse: collapse; margin: 8px 0 12px; font-size: 10.5pt; }
    th, td { border: 1px solid #94a3b8; padding: 6px 8px; text-align: left; vertical-align: top; }
    th { background: #f1f5f9; width: 38%; font-weight: 600; }
    .clause { margin-bottom: 8px; }
    .sign-grid {
      display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 28px;
    }
    .sign-box {
      border: 1px solid #64748b; min-height: 120px; padding: 10px; border-radius: 2px;
    }
    .sign-box .label { font-size: 9pt; font-weight: bold; margin-bottom: 6px; }
    .sign-box .line { margin-top: 48px; border-top: 1px solid #333; padding-top: 4px; font-size: 9pt; }
    .footer {
      margin-top: 24px; padding-top: 10px; border-top: 1px solid #cbd5e1;
      font-size: 8.5pt; color: #475569; text-align: center;
    }
    .warn {
      background: #fff7ed; border: 1px solid #fdba74; padding: 10px 12px;
      margin: 12px 0; font-size: 10pt;
    }
    @media print {
      .no-print { display: none !important; }
      body { padding: 0; }
    }
  </style>
</head>
<body>
  <div class="no-print">
    <span><strong>Contrat ${ref}</strong> — imprimez ou « Enregistrer au format PDF »</span>
    <div style="display:flex;gap:8px;">
      <button type="button" onclick="window.print()">Imprimer / PDF</button>
      <button type="button" class="secondary" onclick="window.close()">Fermer</button>
    </div>
  </div>

  <div class="header">
    <h1>Contrat de vente à crédit / comptant</h1>
    <div class="sub">iPhone Credit BF — Vente de téléphones reconditionnés</div>
    <div class="sub">Burkina Faso</div>
    <div class="badge">Référence dossier : ${ref}</div>
  </div>

  <p>Le présent contrat est conclu le <strong>${today}</strong> entre :</p>

  <h2>Article 1 — Les parties</h2>
  <table>
    <tr>
      <th>Le Vendeur</th>
      <td>
        <strong>iPhone Credit BF</strong><br/>
        Activité : vente de smartphones reconditionnés (avec option de crédit)<br/>
        Contact : +226 XX XX XX XX
      </td>
    </tr>
    <tr>
      <th>L’Acheteur</th>
      <td>
        Nom et prénom(s) : <strong>${buyerName}</strong><br/>
        Téléphone : <strong>${buyerPhone}</strong><br/>
        (Identité vérifiée par pièce CNIB fournie lors de la commande)
      </td>
    </tr>
  </table>

  <h2>Article 2 — Objet du contrat</h2>
  <p>
    Le Vendeur cède à l’Acheteur, qui accepte, le bien suivant, en l’état reconditionné décrit ci-dessous,
    selon le mode de paiement choisi.
  </p>
  <table>
    <tr><th>Désignation</th><td><strong>${productName}</strong></td></tr>
    <tr><th>Stockage</th><td>${storage}</td></tr>
    <tr><th>Couleur</th><td>${color}</td></tr>
    <tr><th>Grade / état</th><td>${grade}</td></tr>
    <tr><th>Prix de vente TTC</th><td><strong>${money(price)}</strong></td></tr>
    <tr><th>Mode de paiement</th><td><strong>${modeLabel}</strong></td></tr>
  </table>

  ${creditBlock}

  <h2>Article 4 — Livraison</h2>
  <p class="clause"><strong>4.1.</strong> La livraison ou la remise de l’appareil intervient après validation du dossier, du contrat signé, et du paiement exigé avant livraison.</p>
  <p class="clause"><strong>4.2.</strong> L’Acheteur s’engage à fournir une adresse exacte et un contact joignable.</p>

  <h2>Article 5 — Garantie et état du bien</h2>
  <p class="clause"><strong>5.1.</strong> L’appareil est <strong>reconditionné</strong>. L’Acheteur reconnaît avoir pris connaissance de l’état (grade, batterie, description) affiché sur la fiche produit.</p>
  <p class="clause"><strong>5.2.</strong> Toute garantie commerciale éventuelle est celle indiquée sur le site au moment de la commande ; hors de ce cadre, les droits légaux de l’acheteur s’appliquent.</p>

  <h2>Article 6 — Obligations de l’Acheteur</h2>
  <p class="clause"><strong>6.1.</strong> Fournir des informations exactes et une pièce d’identité valide.</p>
  <p class="clause"><strong>6.2.</strong> Respecter les échéances de paiement en cas de crédit.</p>
  <p class="clause"><strong>6.3.</strong> Ne pas céder l’appareil à un tiers tant que le crédit n’est pas soldé, sauf accord écrit du Vendeur.</p>

  <h2>Article 7 — Données personnelles</h2>
  <p>
    Les données (identité, CNIB, coordonnées, photos de contrat) sont utilisées uniquement pour
    la commande, la vérification, le recouvrement et le suivi client, conformément à la politique du Vendeur.
  </p>

  <h2>Article 8 — Acceptation</h2>
  <p>
    En signant le présent document (ou en apposant sa signature manuscrite sur l’exemplaire imprimé
    puis photographié), l’Acheteur déclare avoir <strong>lu, compris et accepté</strong> l’ensemble
    des clauses, ainsi que les conditions affichées sur la plateforme lors de la commande.
  </p>

  <div class="warn">
    <strong>Instruction pour l’Acheteur :</strong> Imprimez ce contrat, signez à la main dans la zone
    « Signature de l’Acheteur », placez votre CNIB à côté du contrat, prenez une photo nette et
    renvoyez-la depuis l’application. Conservez une copie pour vos archives.
  </div>

  <p>Fait le <strong>${today}</strong>.</p>

  <div class="sign-grid">
    <div class="sign-box">
      <div class="label">Le Vendeur — iPhone Credit BF</div>
      <p style="font-size:9pt;color:#64748b;">Cachet / signature</p>
      <div class="line">Nom, date et signature</div>
    </div>
    <div class="sign-box">
      <div class="label">L’Acheteur — ${buyerName}</div>
      <p style="font-size:9pt;color:#64748b;">Signature manuscrite obligatoire</p>
      <div class="line">Lu et approuvé — Signature + date</div>
    </div>
  </div>

  <div class="footer">
    Document généré électroniquement — Dossier ${ref} — iPhone Credit BF<br/>
    Ce document a valeur d’accord sous réserve de validation administrative et de paiement.
  </div>
</body>
</html>`;

    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const w = window.open(url, "_blank");
    if (!w) {
      setError(
        "Autorisez les fenêtres pop-up pour ouvrir et télécharger le contrat."
      );
      return;
    }
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
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
      } else {
        throw new Error(upErr.message || "Échec upload photo");
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
            Notre équipe vérifie vos informations et votre CNIB. Le contrat sera
            accessible après validation admin.
          </p>
          <button
            type="button"
            onClick={refreshStatus}
            disabled={refreshing}
            className="inline-flex items-center gap-2 text-sm font-semibold text-primary-600"
          >
            <RefreshCw
              className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
            />
            Actualiser le statut
          </button>
          <p className="text-xs text-gray-400 mt-4">
            Vous pouvez fermer cette page et revenir plus tard.
          </p>
        </div>
      </div>
    );
  }

  if (dossier.status === "refuse") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">
            Dossier refusé
          </h1>
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
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={dossier.contract_photo_url}
              alt="Contrat envoyé"
              className="w-full max-h-40 object-contain rounded-xl border mb-4 bg-white"
            />
          )}
          <button
            type="button"
            onClick={refreshStatus}
            disabled={refreshing}
            className="inline-flex items-center gap-2 text-sm font-semibold text-primary-600"
          >
            <RefreshCw
              className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
            />
            Actualiser
          </button>
        </div>
      </div>
    );
  }

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
              Téléchargez le contrat, imprimez-le, signez-le, puis envoyez la
              photo avec votre CNIB. Le paiement s’ouvrira après validation
              admin du contrat.
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
                <strong>À payer maintenant :</strong>{" "}
                {formatPrice(totalBefore)}
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
              type="button"
              onClick={openContractPrint}
              className="w-full flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 text-white font-semibold text-sm py-3.5 rounded-xl mb-2"
            >
              <Printer className="w-4 h-4" />
              Télécharger / Imprimer le contrat (PDF)
            </button>
            <p className="text-[11px] text-gray-500 text-center mb-6">
              Nouvel onglet → bouton <strong>Imprimer / PDF</strong> →
              Enregistrer en PDF ou imprimer, signer, photo + CNIB.
            </p>
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
                {/* eslint-disable-next-line @next/next/no-img-element */}
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
                <span className="text-xs text-gray-500">
                  Prendre ou choisir une photo
                </span>
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
              type="button"
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
          type="button"
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