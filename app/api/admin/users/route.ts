import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";

type AdminOk = {
  user: { id: string; user_metadata?: Record<string, unknown> };
  admin: ReturnType<typeof createAdminClient>;
};

type AdminFail = { error: NextResponse };

async function requireAdmin(req: NextRequest): Promise<AdminOk | AdminFail> {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return {
        error: NextResponse.json(
          { error: "Non autorisé — token manquant" },
          { status: 401 }
        ),
      };
    }

    const token = authHeader.replace("Bearer ", "").trim();
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !anon) {
      return {
        error: NextResponse.json(
          {
            error:
              "Config serveur : NEXT_PUBLIC_SUPABASE_URL / ANON_KEY manquants",
          },
          { status: 500 }
        ),
      };
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return {
        error: NextResponse.json(
          {
            error:
              "SUPABASE_SERVICE_ROLE_KEY manquante dans .env.local — redémarre npm run dev après l’ajout",
          },
          { status: 500 }
        ),
      };
    }

    const supabase = createClient(url, anon, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return {
        error: NextResponse.json(
          { error: "Session invalide — reconnecte-toi" },
          { status: 401 }
        ),
      };
    }

    let admin: ReturnType<typeof createAdminClient>;
    try {
      admin = createAdminClient();
    } catch (e) {
      return {
        error: NextResponse.json(
          {
            error:
              e instanceof Error
                ? e.message
                : "Impossible d’initialiser le client admin (service role)",
          },
          { status: 500 }
        ),
      };
    }

    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role, active")
      .eq("user_id", user.id)
      .maybeSingle();

    const isAdminTable =
      !!roleRow && roleRow.role === "admin" && roleRow.active === true;

    const metaRole = String(
      (user.user_metadata as { role?: string } | null)?.role || ""
    ).toLowerCase();
    const isAdminMeta = metaRole === "admin";

    if (!isAdminTable && !isAdminMeta) {
      return {
        error: NextResponse.json(
          {
            error:
              "Accès admin requis. Ajoute une ligne dans user_roles (role=admin, active=true) pour ton user_id, ou user_metadata.role = admin.",
          },
          { status: 403 }
        ),
      };
    }

    if (isAdminMeta && !isAdminTable) {
      await admin.from("user_roles").upsert({
        user_id: user.id,
        role: "admin",
        active: true,
      });
    }

    await admin.from("profiles").upsert({
      id: user.id,
      full_name:
        String(
          (user.user_metadata as { full_name?: string } | null)?.full_name ||
            "Admin"
        ) || "Admin",
      phone:
        String(
          (user.user_metadata as { phone?: string } | null)?.phone || ""
        ) || null,
    });

    return { user, admin };
  } catch (e) {
    console.error("requireAdmin:", e);
    return {
      error: NextResponse.json(
        {
          error:
            e instanceof Error ? e.message : "Erreur serveur requireAdmin",
        },
        { status: 500 }
      ),
    };
  }
}

/** GET — liste */
export async function GET(req: NextRequest) {
  const result = await requireAdmin(req);
  if ("error" in result) return result.error;

  const { admin } = result;

  const { data: profiles, error } = await admin
    .from("profiles")
    .select("id, full_name, phone, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: roles } = await admin
    .from("user_roles")
    .select("user_id, role, active");

  const roleMap = new Map(
    (roles || []).map((r) => [r.user_id, { role: r.role, active: r.active }])
  );

  const users = (profiles || []).map((p) => ({
    ...p,
    role: roleMap.get(p.id)?.role || "client",
    active: roleMap.get(p.id)?.active ?? true,
  }));

  return NextResponse.json({ users });
}

/** POST — créer (email réel + mot de passe = login client) */
export async function POST(req: NextRequest) {
  const result = await requireAdmin(req);
  if ("error" in result) return result.error;

  const { admin } = result;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const fullName = String(body.fullName || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  const phoneRaw = String(body.phone || "").trim();
  const phone = phoneRaw.replace(/\D/g, "");
  const password = String(body.password || "");
  const role = ["client", "agent", "admin"].includes(String(body.role))
    ? String(body.role)
    : "client";

  if (!fullName) {
    return NextResponse.json({ error: "Nom obligatoire" }, { status: 400 });
  }

  if (!email || !email.includes("@") || email.length < 5) {
    return NextResponse.json(
      { error: "Adresse e-mail invalide (obligatoire pour la connexion)" },
      { status: 400 }
    );
  }

  // Téléphone optionnel ; s’il est fourni, min. 8 chiffres
  if (phoneRaw && phone.length < 8) {
    return NextResponse.json(
      { error: "Téléphone invalide (min. 8 chiffres) ou laisse vide" },
      { status: 400 }
    );
  }

  if (password.length < 6) {
    return NextResponse.json(
      { error: "Mot de passe min. 6 caractères" },
      { status: 400 }
    );
  }

  // Auth = vrai email (page /login)
  const { data: created, error: createErr } =
    await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        phone: phone || null,
        role: role === "admin" ? "admin" : role,
      },
    });

  if (createErr || !created.user) {
    return NextResponse.json(
      { error: createErr?.message || "Création Auth échouée" },
      { status: 400 }
    );
  }

  const userId = created.user.id;

  const { error: profileErr } = await admin.from("profiles").upsert({
    id: userId,
    full_name: fullName,
    phone: phone || null,
  });

  if (profileErr) {
    console.error("profiles upsert:", profileErr);
  }

  const { error: roleErr } = await admin.from("user_roles").upsert({
    user_id: userId,
    role,
    active: true,
  });

  if (roleErr) {
    console.error("user_roles upsert:", roleErr);
  }

  return NextResponse.json({
    ok: true,
    user: {
      id: userId,
      full_name: fullName,
      phone: phone || null,
      email,
      role,
    },
  });
}