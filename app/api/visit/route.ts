import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const visitorKey = String(body.visitorKey || "").slice(0, 80);
    const path = String(body.path || "/").slice(0, 200);
    const ua = String(body.ua || "").slice(0, 300);

    if (!visitorKey || visitorKey.length < 8) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    const admin = createAdminClient();

    await admin.from("site_visits").insert({
      visitor_key: visitorKey,
      path,
      user_agent: ua,
    });

    // total ++
    const { data: stats } = await admin
      .from("site_stats")
      .select("total_visits, unique_visitors")
      .eq("id", 1)
      .maybeSingle();

    const total = Number(stats?.total_visits || 0) + 1;

    // unique si première fois cette clé
    const { count } = await admin
      .from("site_visits")
      .select("id", { count: "exact", head: true })
      .eq("visitor_key", visitorKey);

    const isNew = (count || 0) <= 1;
    const unique =
      Number(stats?.unique_visitors || 0) + (isNew ? 1 : 0);

    await admin
      .from("site_stats")
      .upsert({
        id: 1,
        total_visits: total,
        unique_visitors: unique,
        updated_at: new Date().toISOString(),
      });

    return NextResponse.json({ ok: true, total, unique });
  } catch (e) {
    console.error("visit:", e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

export async function GET() {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("site_stats")
      .select("total_visits, unique_visitors, updated_at")
      .eq("id", 1)
      .maybeSingle();

    return NextResponse.json({
      total: Number(data?.total_visits || 0),
      unique: Number(data?.unique_visitors || 0),
    });
  } catch {
    return NextResponse.json({ total: 0, unique: 0 });
  }
}