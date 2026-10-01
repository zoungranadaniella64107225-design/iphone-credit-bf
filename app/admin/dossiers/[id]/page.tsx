"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Loader2,
  User,
  Phone,
  MapPin,
  FileText,
  Image as ImageIcon,
  AlertTriangle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Dossier = {
  id: string;
  reference: string;
  user_id: string;
  product_id: number | null;
  product_name: string | null;
  product_price: number | null;
  product_storage: string | null;
  product_color: string | null;
  mode: string;
  status: string;
  full_name: string;
  phone: string;
  city: string | null;
  sector: string | null;
  address_detail: string | null;
  activity: string | null;
  income: string | null;
  contact1_name: string | null;
  contact1_phone: string | null;
  contact2_name: string | null;
  contact2_phone: string | null;
  cnib_recto_url: string | null;
  cnib_verso_url: string | null;
  contract_photo_url: string | null;
  amount_down: number | null;
  amount_deposit: number | null;
  amount_total_before: number | null;
  amount_remaining: number | null;
  admin_note: string | null;
  created_at: string;
};

function isAdminUser(user: {
  user_metadata?: Record<string, unknown>;
} | null): boolean {
  return user?.user_metadata?.role === "admin";
}

function storagePathFromUrl(url: string | null): string | null {
  if (!url) return null;
  const marker = "/storage/v1/object/public/cnib/";
  const i = url.indexOf(marker);
  if (i === -1) return null;
  return decodeURIComponent(url.slice(i + marker.length));
}

const STATUS_LABEL: Record<string, string> = {
  en_attente: "Dossier à vérifier",
  valide: "Dossier validé — en attente contrat",
  refuse: "Dossier refusé",
  contrat_en_attente: "Contrat à vérifier",
  contrat_refuse: "Contrat refusé",
  pret_paiement: "Prêt pour paiement",
  paye: "Payé",
  livre: "Livré",
  annule: "Annulé",
};

export default function AdminDossierDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = String(params.id || "");

  const [ready, setReady] = useState(false);
  const [dossier, setDossier] = useState<Dossier | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Auth admin
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

        localStorage.setItem("admin", "true");
        setReady(true);
      } catch {
        router.replace("/admin/login");
      }
    };

    checkAdmin();
  }, [router]);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError("");

    try {
      const supabase = createClient();

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user || !isAdminUser(session.user)) {
        router.replace("/admin/login");
        return;
      }

      const { data, error: err } = await supabase
        .from("dossiers")
        .select("*")
        .eq("id", id)
        .single();

      if (err || !data) {
        setError(err?.message || "Dossier introuvable");
        setDossier(null);
      } else {
        setDossier(data as Dossier);
        setNote(data.admin_note || "");
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur de chargement");
      setDossier(null);
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    if (ready && id) load();
  }, [ready, id, load]);

  const deleteStorageFile = async (url: string | null) => {
    const path = storagePathFromUrl(url);
    if (!path) return;
    const supabase = createClient();
    await supabase.storage.from("cnib").remove([path]);
  };

  const applyAction = async (
    action:
      | "valider_dossier"
      | "refuser_dossier"
      | "valider_contrat"
      | "refuser_contrat"
  ) => {
    if (!dossier) return;
    setActionLoading(true);
    setMessage("");
    setError("");

    try {
      const supabase = createClient();

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user || !isAdminUser(session.user)) {
        router.replace("/admin/login");
        return;
      }

      let payload: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
        admin_note: note.trim() || null,
      };

      if (action === "valider_dossier") {
        payload.status = "valide";
        payload.admin_note = note.trim() || null;
      }

      if (action === "refuser_dossier") {
        await deleteStorageFile(dossier.cnib_recto_url);
        await deleteStorageFile(dossier.cnib_verso_url);
        payload = {
          ...payload,
          status: "refuse",
          cnib_recto_url: null,
          cnib_verso_url: null,
          admin_note:
            note.trim() || "Dossier refusé — documents non conformes",
        };
      }

      if (action === "valider_contrat") {
        payload.status = "pret_paiement";
        payload.admin_note = note.trim() || null;
      }

      if (action === "refuser_contrat") {
        await deleteStorageFile(dossier.contract_photo_url);
        payload = {
          ...payload,
          status: "contrat_refuse",
          contract_photo_url: null,
          admin_note:
            note.trim() ||
            "Photo du contrat refusée — renvoyez une photo claire",
        };
      }

      const { error: updErr } = await supabase
        .from("dossiers")
        .update(payload)
        .eq("id", dossier.id);

      if (updErr) throw updErr;

      setMessage("Action enregistrée avec succès.");
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur lors de l’action");
    } finally {
      setActionLoading(false);
    }
  };

  if (!ready || loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary-400" />
          <p className="text-xs text-slate-500">Chargement du dossier...</p>
        </div>
      </div>
    );
  }

  if (error && !dossier) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto mb-3" />
          <p className="mb-4 text-sm">{error}</p>
          <Link
            href="/admin/dossiers"
            className="text-primary-400 text-sm font-semibold"
          >
            ← Retour aux dossiers
          </Link>
        </div>
      </div>
    );
  }

  if (!dossier) return null;

  const formatPrice = (n: number) => n.toLocaleString("fr-FR") + " F";

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-24">
      <header className="border-b border-slate-800 bg-slate-900/80 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link
            href="/admin/dossiers"
            className="text-slate-400 hover:text-white"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-lg font-bold">{dossier.reference}</h1>
            <p className="text-xs text-slate-400">{dossier.full_name}</p>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
        {message && (
          <div className="bg-green-500/10 border border-green-500/30 text-green-300 text-sm rounded-xl p-3">
            {message}
          </div>
        )}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-300 text-sm rounded-xl p-3">
            {error}
          </div>
        )}

        {/* Statut */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <p className="text-xs text-slate-400 mb-1">Statut actuel</p>
          <p className="text-sm font-bold">
            {STATUS_LABEL[dossier.status] || dossier.status}
          </p>
          <p className="text-[10px] text-slate-500 mt-1 font-mono">
            {dossier.status}
          </p>
          {dossier.admin_note && (
            <p className="text-xs text-amber-300 mt-2">{dossier.admin_note}</p>
          )}
        </div>

        {/* Client */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2 text-sm">
          <p className="font-bold flex items-center gap-2 text-primary-300">
            <User className="w-4 h-4" /> Client
          </p>
          <p>
            <span className="text-slate-400">Nom :</span> {dossier.full_name}
          </p>
          <p className="flex items-center gap-2">
            <Phone className="w-3.5 h-3.5 text-slate-500" />
            {dossier.phone}
          </p>
          <p className="flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5 text-slate-500" />
            {dossier.city} — {dossier.sector}
            {dossier.address_detail ? ` (${dossier.address_detail})` : ""}
          </p>
          <p>
            <span className="text-slate-400">Activité :</span>{" "}
            {dossier.activity || "—"}
          </p>
          <p>
            <span className="text-slate-400">Revenu :</span>{" "}
            {dossier.income || "—"}
          </p>
          <p>
            <span className="text-slate-400">Contact 1 :</span>{" "}
            {dossier.contact1_name} — {dossier.contact1_phone}
          </p>
          {(dossier.contact2_name || dossier.contact2_phone) && (
            <p>
              <span className="text-slate-400">Contact 2 :</span>{" "}
              {dossier.contact2_name} — {dossier.contact2_phone}
            </p>
          )}
        </div>

        {/* Produit */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-sm">
          <p className="font-bold text-primary-300 mb-2">Produit</p>
          <p>{dossier.product_name}</p>
          <p className="text-slate-400 text-xs mt-1">
            {dossier.product_storage} • {dossier.product_color} •{" "}
            {dossier.mode === "credit" ? "Crédit" : "Total"}
          </p>
          <p className="mt-2 font-semibold">
            {formatPrice(Number(dossier.product_price || 0))}
          </p>
          {dossier.mode === "credit" && (
            <p className="text-xs text-slate-400 mt-1">
              Avant livraison :{" "}
              {formatPrice(Number(dossier.amount_total_before || 0))} — Reste :{" "}
              {formatPrice(Number(dossier.amount_remaining || 0))}
            </p>
          )}
        </div>

        {/* CNIB */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <p className="font-bold text-sm flex items-center gap-2 mb-3">
            <FileText className="w-4 h-4 text-primary-300" />
            CNIB
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] text-slate-400 mb-1">Recto</p>
              {dossier.cnib_recto_url ? (
                <a
                  href={dossier.cnib_recto_url}
                  target="_blank"
                  rel="noreferrer"
                >
                  <img
                    src={dossier.cnib_recto_url}
                    alt="CNIB recto"
                    className="w-full h-40 object-cover rounded-xl border border-slate-700"
                  />
                </a>
              ) : (
                <div className="h-40 rounded-xl bg-slate-800 flex items-center justify-center text-xs text-slate-500">
                  Aucune image
                </div>
              )}
            </div>
            <div>
              <p className="text-[10px] text-slate-400 mb-1">Verso</p>
              {dossier.cnib_verso_url ? (
                <a
                  href={dossier.cnib_verso_url}
                  target="_blank"
                  rel="noreferrer"
                >
                  <img
                    src={dossier.cnib_verso_url}
                    alt="CNIB verso"
                    className="w-full h-40 object-cover rounded-xl border border-slate-700"
                  />
                </a>
              ) : (
                <div className="h-40 rounded-xl bg-slate-800 flex items-center justify-center text-xs text-slate-500">
                  Aucune image
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Contrat */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <p className="font-bold text-sm flex items-center gap-2 mb-3">
            <ImageIcon className="w-4 h-4 text-primary-300" />
            Photo contrat signé
          </p>
          {dossier.contract_photo_url ? (
            <a
              href={dossier.contract_photo_url}
              target="_blank"
              rel="noreferrer"
            >
              <img
                src={dossier.contract_photo_url}
                alt="Contrat"
                className="w-full max-h-64 object-contain rounded-xl border border-slate-700 bg-slate-800"
              />
            </a>
          ) : (
            <p className="text-xs text-slate-500">Pas encore envoyé</p>
          )}
        </div>

        {/* Note */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <label className="text-xs text-slate-400 block mb-2">
            Note (visible côté client en cas de refus)
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="Ex: Photo CNIB floue, reprenez une photo nette..."
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        {/* Actions dossier */}
        {dossier.status === "en_attente" && (
          <div className="space-y-2">
            <p className="text-xs text-slate-400 font-semibold">
              Validation du dossier (CNIB)
            </p>
            <button
              disabled={actionLoading}
              onClick={() => applyAction("valider_dossier")}
              className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 text-white font-semibold text-sm py-3 rounded-xl disabled:opacity-60"
            >
              {actionLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4" />
              )}
              Valider le dossier
            </button>
            <button
              disabled={actionLoading}
              onClick={() => {
                if (
                  confirm(
                    "Refuser ce dossier ? Les photos CNIB seront supprimées."
                  )
                ) {
                  applyAction("refuser_dossier");
                }
              }}
              className="w-full flex items-center justify-center gap-2 bg-red-600/90 hover:bg-red-500 text-white font-semibold text-sm py-3 rounded-xl disabled:opacity-60"
            >
              <XCircle className="w-4 h-4" />
              Refuser (supprimer CNIB)
            </button>
          </div>
        )}

        {/* Actions contrat */}
        {dossier.status === "contrat_en_attente" && (
          <div className="space-y-2">
            <p className="text-xs text-slate-400 font-semibold">
              Validation du contrat signé
            </p>
            <button
              disabled={actionLoading}
              onClick={() => applyAction("valider_contrat")}
              className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 text-white font-semibold text-sm py-3 rounded-xl disabled:opacity-60"
            >
              {actionLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4" />
              )}
              Valider le contrat → paiement
            </button>
            <button
              disabled={actionLoading}
              onClick={() => {
                if (
                  confirm(
                    "Refuser le contrat ? La photo sera supprimée pour que le client renvoie."
                  )
                ) {
                  applyAction("refuser_contrat");
                }
              }}
              className="w-full flex items-center justify-center gap-2 bg-red-600/90 hover:bg-red-500 text-white font-semibold text-sm py-3 rounded-xl disabled:opacity-60"
            >
              <XCircle className="w-4 h-4" />
              Refuser (supprimer photo contrat)
            </button>
          </div>
        )}

        {!["en_attente", "contrat_en_attente"].includes(dossier.status) && (
          <div className="flex gap-2 text-xs text-slate-400 bg-slate-900 border border-slate-800 rounded-xl p-3">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
            Aucune action critique pour ce statut. Le client suit l’étape
            correspondante.
          </div>
        )}
      </div>
    </div>
  );
}