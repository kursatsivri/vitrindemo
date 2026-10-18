"use client";

import { ImagePlus } from "lucide-react";
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
        <img src={storageUrl(bucket, path)} alt={alt} className={`size-24 shrink-0 object-cover ${shape}`} />
      ) : (
        <div
          className={`flex size-24 shrink-0 items-center justify-center border-[1.5px] border-dashed border-border bg-surface font-display text-3xl font-bold text-text-muted uppercase ${shape}`}
        >
          {placeholder || <ImagePlus aria-hidden className="size-6" strokeWidth={1.75} />}
        </div>
      )}
      <div className="flex flex-col items-start gap-2">
        <label className="btn-secondary h-10 cursor-pointer has-focus-visible:outline-2 has-focus-visible:outline-accent">
          {busy ? "Yükleniyor…" : path ? "Değiştir" : "Görsel seç"}
          <input type="file" accept={TYPES.join(",")} onChange={onChange} disabled={busy} className="sr-only" />
        </label>
        <span className="text-xs text-text-muted">JPG, PNG, WebP · en fazla {maxMb} MB</span>
        {error && <span role="alert" className="text-xs text-danger">{error}</span>}
      </div>
      <input type="hidden" name={fieldName} value={path ?? ""} readOnly />
    </div>
  );
}
