import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";

async function requireAdmin(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { error: NextResponse.json({ error: "Non autorisé" }, { status: 401 }) };
  }

  const token = authHeader.replace("Bearer ", "");
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const {
    data: { user },
  } = await supabase.auth.getUser(token);

  if (!user) {
    return { error: NextResponse.json({ error: "Session invalide" }, { status: 401 }) };
  }

  const admin = createAdminClient();
  const { data: roleRow } = await admin
    .from("user_roles")
    .select("role, active")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!roleRow || roleRow.role !== "admin" || !roleRow.active) {
    return { error: NextResponse.json({ error: "Accès admin requis" }, { status: 403 }) };
  }

  return { user, admin };
}

/** PATCH — changer rôle / active */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireAdmin(req);
  if ("error" in result && result.error instanceof NextResponse) return result.error;
  const { user, admin } = result as {
    user: { id: string };
    admin: ReturnType<typeof createAdminClient>;
  };

  const { id } = await params;
  if (id === user.id) {
    return NextResponse.json(
      { error: "Vous ne pouvez pas modifier votre propre compte ainsi" },
      { status: 400 }
    );
  }

  const body = await req.json();
  const updates: { role?: string; active?: boolean } = {};

  if (body.role && ["client", "agent", "admin"].includes(body.role)) {
    updates.role = body.role;
  }
  if (typeof body.active === "boolean") {
    updates.active = body.active;
  }

  const { error } = await admin
    .from("user_roles")
    .update(updates)
    .eq("user_id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

/** DELETE — supprimer définitivement */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireAdmin(req);
  if ("error" in result && result.error instanceof NextResponse) return result.error;
  const { user, admin } = result as {
    user: { id: string };
    admin: ReturnType<typeof createAdminClient>;
  };

  const { id } = await params;

  if (id === user.id) {
    return NextResponse.json(
      { error: "Impossible de supprimer votre propre compte" },
      { status: 400 }
    );
  }

  // CASCADE sur profiles + user_roles si FK bien configurées
  const { error } = await admin.auth.admin.deleteUser(id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}