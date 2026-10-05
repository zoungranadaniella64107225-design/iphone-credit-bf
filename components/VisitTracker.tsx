"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

function getVisitorKey() {
  if (typeof window === "undefined") return "";
  const k = "icbf_vid";
  let id = localStorage.getItem(k);
  if (!id) {
    id =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `v_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(k, id);
  }
  return id;
}

export default function VisitTracker() {
  const pathname = usePathname();

  useEffect(() => {
    // Ne pas compter l’admin
    if (pathname?.startsWith("/admin")) return;

    const key = getVisitorKey();
    if (!key) return;

    // 1 hit max / 30 min pour la même page (évite spam refresh)
    const stampKey = `icbf_hit_${pathname}`;
    const last = sessionStorage.getItem(stampKey);
    const now = Date.now();
    if (last && now - Number(last) < 30 * 60 * 1000) return;
    sessionStorage.setItem(stampKey, String(now));

    fetch("/api/visit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        visitorKey: key,
        path: pathname || "/",
        ua: navigator.userAgent?.slice(0, 300),
      }),
    }).catch(() => {});
  }, [pathname]);

  return null;
}