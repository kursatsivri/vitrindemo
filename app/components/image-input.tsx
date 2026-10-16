"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { storageUrl } from "@/lib/tracks";

const TYPES = ["image/jpeg", "image/png", "image/webp"];

// Görseli tarayıcıdan doğrudan Storage'a yükler (server action 1 MB sınırına takılmasın diye);
// forma sadece dosya yolunu koyar. Kaydedilmeyen yüklemeler depoda kalır.
// Profil fotoğrafı (avatars, yuvarlak) ve parça kapağı (covers, kare) için ortak.
export function ImageInput({
  bucket,
  userId,
  initialPath,
  fieldName,
  maxMb,
  round = false,
  placeholder,
  alt,
}: {
  bucket: "avatars" | "covers";
  userId: string;
  initialPath: string | null;
  fieldName: string;
  maxMb: number;
  round?: boolean;
  placeholder: string;
  alt: string;
}) {
  const [path, setPath] = useState(initialPath);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!TYPES.includes(file.type)) return setError("Sadece JPG, PNG veya WebP.");
    if (file.size > maxMb * 1024 * 1024) return setError(`Görsel en fazla ${maxMb} MB olabilir.`);

    setBusy(true);
    setError("");
    const ext = file.type === "image/jpeg" ? "jpg" : file.type.split("/")[1];
    const newPath = `${userId}/${crypto.randomUUID()}.${ext}`;
    const { error } = await createClient().storage.from(bucket).upload(newPath, file, { contentType: file.type });
    setBusy(false);

    if (error) return setError("Görsel yüklenemedi, tekrar dene.");
    setPath(newPath);
  }

  const shape = round ? "rounded-full" : "rounded-xl";
  return (
    <div className="flex items-center gap-4">
      {path ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={storageUrl(bucket, path)} alt={alt} className={`size-20 shrink-0 object-cover ${shape}`} />
      ) : (
        <div className={`flex size-20 shrink-0 items-center justify-center bg-surface-2 font-display text-3xl font-semibold uppercase text-muted ${shape}`}>
          {placeholder}
        </div>
      )}
      <div className="flex flex-col gap-1 text-sm">
        <label className="btn-secondary cursor-pointer has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent">
          {busy ? "Yükleniyor…" : path ? "Değiştir" : "Görsel seç"}
          <input type="file" accept={TYPES.join(",")} onChange={onChange} disabled={busy} className="sr-only" />
        </label>
        <span className="text-xs text-subtle">JPG, PNG, WebP · en fazla {maxMb} MB</span>
        {error && <span role="alert" className="text-xs text-red-300">{error}</span>}
      </div>
      <input type="hidden" name={fieldName} value={path ?? ""} readOnly />
    </div>
  );
}
