"use client";

import { useState } from "react";

// Telefonda sistem paylaşım menüsü, masaüstünde linki kopyalar.
export function ShareButton({ title }: { title: string }) {
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

  return (
    <button type="button" onClick={share} className="btn-secondary">
      {copied ? "Link kopyalandı" : "Paylaş"}
    </button>
  );
}
