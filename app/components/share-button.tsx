"use client";

import { Check, Share2 } from "lucide-react";
import { useState } from "react";

// Telefonda sistem paylaşım menüsü, masaüstünde linki kopyalar.
export function ShareButton({ title, iconOnly = false }: { title: string; iconOnly?: boolean }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch {
        // Kullanıcı vazgeçti
      }
      return;
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const Icon = copied ? Check : Share2;
  if (iconOnly) {
    return (
      <button type="button" onClick={share} aria-label={copied ? "Link kopyalandı" : "Paylaş"} className="icon-btn size-12">
        <Icon aria-hidden className="size-5" strokeWidth={1.75} />
      </button>
    );
  }
  return (
    <button type="button" onClick={share} className="btn-secondary">
      <Icon aria-hidden className="size-[18px]" strokeWidth={1.75} />
      {copied ? "Link kopyalandı" : "Paylaş"}
    </button>
  );
}
