"use client";

import { useEffect, useRef } from "react";

type Turnstile = { render: (el: HTMLElement, opts: object) => string; reset: (id: string) => void; remove: (id: string) => void };
declare global {
  interface Window {
    turnstile?: Turnstile;
  }
}

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
const SCRIPT = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
let loading: Promise<void> | null = null;

function loadScript() {
  loading ??= new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = SCRIPT;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => {
      loading = null;
      reject(new Error("Turnstile yüklenemedi"));
    };
    document.head.appendChild(s);
  });
  return loading;
}

// Cloudflare Turnstile: formun içine `cf-turnstile-response` gizli alanını ekler; doğrulamayı Supabase yapar.
// Site anahtarı yoksa (yerel / henüz kurulmadı) hiçbir şey göstermez.
// Token tek kullanımlık: form her gönderildiğinde yenilenir (hata alıp tekrar denemek için).
export function Captcha() {
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!SITE_KEY || !box.current) return;
    const el = box.current;
    let id: string | undefined;
    let cancelled = false;
    loadScript().then(() => {
      if (!cancelled && window.turnstile) id = window.turnstile.render(el, { sitekey: SITE_KEY, language: "tr", theme: "dark" });
    }, () => {});
    const form = el.closest("form");
    const onSubmit = () => setTimeout(() => id && window.turnstile?.reset(id), 0);
    form?.addEventListener("submit", onSubmit);
    return () => {
      cancelled = true;
      form?.removeEventListener("submit", onSubmit);
      if (id) window.turnstile?.remove(id);
    };
  }, []);

  return SITE_KEY ? <div ref={box} className="min-h-[65px]" /> : null;
}
