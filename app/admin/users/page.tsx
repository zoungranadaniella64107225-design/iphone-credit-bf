"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  Plus,
  Trash2,
  UserPlus,
  RefreshCw,
  Shield,
  Users,
  AlertCircle,
  Search,
  Eye,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type AdminUser = {
  id: string;
  full_name: string;
  phone: string | null;
  role: string;
  active: boolean;
  created_at: string;
};

export default function AdminUsersPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [myId, setMyId] = useState<string | null>(null);

  const [visits, setVisits] = useState({ total: 0, unique: 0 });

  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    role: "client",
  });

  const getToken = async () => {
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.access_token || null;
  };

  const loadVisits = async () => {
    try {
      const res = await fetch("/api/visit");
      const data = await res.json();
      setVisits({
        total: Number(data.total || 0),
        unique: Number(data.unique || 0),
      });
    } catch {
      /* ignore */
    }
  };

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const token = await getToken();
      if (!token) {
        router.replace("/admin/login");
        return;
      }

      const res = await fetch("/api/admin/users", {
        headers: { Authorization: `Bearer ${token}` },
      });

      let data: { error?: string; users?: AdminUser[] } = {};
      try {
        data = await res.json();
      } catch {
        setError(
          "Réponse serveur invalide (vérifie SUPABASE_SERVICE_ROLE_KEY)"
        );
        return;
      }

      if (!res.ok) {
        setError(data.error || `Erreur ${res.status}`);
        if (res.status === 401) router.replace("/admin/login");
        setUsers([]);
        return;
      }

      setUsers(data.users || []);
    } catch (e) {
      console.error(e);
      setError("Impossible de joindre l’API.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const init = async () => {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        router.replace("/admin/login");
        return;
      }

      setMyId(session.user.id);
      setReady(true);
      await Promise.all([loadUsers(), loadVisits()]);
    };
    init();
  }, [router, loadUsers]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const token = await getToken();
      if (!token) {
        setError("Session expirée — reconnecte-toi");
        return;
      }

      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Création échouée");
        return;
      }

      setMessage(
        `Compte créé : ${data.user.full_name} — ${data.user.email}`
      );
      setForm({
        fullName: "",
        email: "",
        phone: "",
        password: "",
        role: "client",
      });
      setShowForm(false);
      await loadUsers();
    } catch {
      setError("Erreur réseau à la création");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (id === myId) {
      setError("Tu ne peux pas supprimer ton propre compte");
      return;
    }
    if (!confirm(`Supprimer définitivement « ${name} » ?`)) return;

    const token = await getToken();
    if (!token) return;

    const res = await fetch(`/api/admin/users/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Suppression échouée");
      return;
    }
    setMessage("Utilisateur supprimé");
    await loadUsers();
  };

  const toggleActive = async (id: string, active: boolean) => {
    if (id === myId) {
      setError("Tu ne peux pas désactiver ton propre compte");
      return;
    }
    const token = await getToken();
    if (!token) return;

    const res = await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ active: !active }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Mise à jour échouée");
      return;
    }
    await loadUsers();
  };

  const changeRole = async (id: string, role: string) => {
    if (id === myId) {
      setError("Tu ne peux pas changer ton propre rôle ici");
      return;
    }
    const token = await getToken();
    if (!token) return;

    const res = await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ role }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Changement de rôle échoué");
      return;
    }
    setMessage("Rôle mis à jour");
    await loadUsers();
  };

  const filtered = users.filter((u) => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return (
      u.full_name?.toLowerCase().includes(q) ||
      (u.phone || "").includes(q) ||
      u.role.toLowerCase().includes(q)
    );
  });

  if (!ready) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-7 h-7 animate-spin text-primary-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-10">
      <div className="border-b border-white/10 bg-slate-900/80 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/admin"
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="min-w-0">
              <h1 className="text-lg font-bold flex items-center gap-2">
                <Users className="w-5 h-5 text-primary-400" />
                Utilisateurs
              </h1>
              <p className="text-xs text-slate-400">
                {users.length} compte(s)
              </p>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                loadUsers();
                loadVisits();
              }}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-1.5 bg-primary-500 hover:bg-primary-400 text-white text-sm font-semibold px-3 py-2 rounded-xl"
            >
              <Plus className="w-4 h-4" />
              Créer
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Stats visiteurs (même non inscrits) */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="rounded-2xl bg-cyan-500/10 border border-cyan-500/20 p-4">
            <div className="flex items-center gap-2 text-cyan-300 mb-1">
              <Eye className="w-4 h-4" />
              <span className="text-[10px] font-semibold uppercase">
                Visites
              </span>
            </div>
            <p className="text-2xl font-bold">{visits.total}</p>
            <p className="text-[10px] text-slate-500">pages vues (approx.)</p>
          </div>
          <div className="rounded-2xl bg-violet-500/10 border border-violet-500/20 p-4">
            <div className="flex items-center gap-2 text-violet-300 mb-1">
              <Users className="w-4 h-4" />
              <span className="text-[10px] font-semibold uppercase">
                Visiteurs uniques
              </span>
            </div>
            <p className="text-2xl font-bold">{visits.unique}</p>
            <p className="text-[10px] text-slate-500">
              navigateurs distincts (localStorage)
            </p>
          </div>
        </div>

        {message && (
          <div className="mb-4 text-xs text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3">
            {message}
          </div>
        )}
        {error && (
          <div className="mb-4 text-xs text-red-200 bg-red-500/10 border border-red-500/25 rounded-xl px-4 py-3 flex gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        <div className="relative mb-4">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher nom, téléphone, rôle..."
            className="w-full pl-10 pr-3 py-2.5 bg-slate-900 border border-white/10 rounded-xl text-sm"
          />
        </div>

        {showForm && (
          <form
            onSubmit={handleCreate}
            className="mb-6 bg-slate-900 border border-white/10 rounded-2xl p-5 space-y-3"
          >
            <div className="flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-primary-400" />
              <h2 className="text-sm font-bold">Nouvel utilisateur</h2>
            </div>
            <p className="text-[11px] text-slate-500">
              Connexion client = <strong>e-mail + mot de passe</strong> (page
              /login).
            </p>
            <input
              required
              placeholder="Nom complet *"
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              className="w-full px-3 py-2.5 bg-slate-800 border border-white/10 rounded-xl text-sm"
            />
            <input
              required
              type="email"
              placeholder="E-mail * (identifiant de connexion)"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full px-3 py-2.5 bg-slate-800 border border-white/10 rounded-xl text-sm"
            />
            <input
              type="tel"
              placeholder="Téléphone (optionnel)"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full px-3 py-2.5 bg-slate-800 border border-white/10 rounded-xl text-sm"
            />
            <input
              required
              type="password"
              placeholder="Mot de passe * (min. 6)"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full px-3 py-2.5 bg-slate-800 border border-white/10 rounded-xl text-sm"
            />
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className="w-full px-3 py-2.5 bg-slate-800 border border-white/10 rounded-xl text-sm"
            >
              <option value="client">Client</option>
              <option value="agent">Agent</option>
              <option value="admin">Admin</option>
            </select>
            <button
              type="submit"
              disabled={saving}
              className="w-full bg-primary-500 hover:bg-primary-400 font-semibold text-sm py-2.5 rounded-xl disabled:opacity-50"
            >
              {saving ? "Création..." : "Créer le compte"}
            </button>
          </form>
        )}

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-7 h-7 animate-spin text-primary-400" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-slate-500 text-sm py-12">
            {error ? "Liste indisponible" : "Aucun utilisateur"}
          </p>
        ) : (
          <div className="space-y-2">
            {filtered.map((u) => (
              <div
                key={u.id}
                className="bg-slate-900 border border-white/10 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-sm truncate">
                    {u.full_name}
                    {u.id === myId && (
                      <span className="ml-2 text-[10px] text-cyan-400">
                        (toi)
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-slate-400">{u.phone || "—"}</p>
                  <div className="flex flex-wrap gap-2 mt-1.5">
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary-500/20 text-primary-300 inline-flex items-center gap-1">
                      <Shield className="w-3 h-3" />
                      {u.role}
                    </span>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        u.active
                          ? "bg-emerald-500/15 text-emerald-300"
                          : "bg-red-500/15 text-red-300"
                      }`}
                    >
                      {u.active ? "Actif" : "Désactivé"}
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <select
                    value={u.role}
                    disabled={u.id === myId}
                    onChange={(e) => changeRole(u.id, e.target.value)}
                    className="text-[10px] bg-slate-800 border border-white/10 rounded-lg px-2 py-1.5"
                  >
                    <option value="client">client</option>
                    <option value="agent">agent</option>
                    <option value="admin">admin</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => toggleActive(u.id, u.active)}
                    disabled={u.id === myId}
                    className="text-[10px] font-semibold px-2.5 py-1.5 rounded-lg bg-white/5 disabled:opacity-40"
                  >
                    {u.active ? "Désactiver" : "Activer"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(u.id, u.full_name)}
                    disabled={u.id === myId}
                    className="text-[10px] font-semibold px-2.5 py-1.5 rounded-lg bg-red-500/15 text-red-300 flex items-center gap-1 disabled:opacity-40"
                  >
                    <Trash2 className="w-3 h-3" />
                    Supprimer
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}