"use client";

import { useState } from "react";
import { Avatar } from "@/app/components/avatar";
import { createClient } from "@/lib/supabase/client";

const TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 2 * 1024 * 1024;

// Dosyayı tarayıcıdan doğrudan Storage'a yükler (server action 1 MB sınırına takılmasın diye);
// forma sadece dosya yolunu koyar. Kaydedilmeyen yüklemeler depoda kalır.
export function AvatarInput({
  userId,
  initialPath,
  name,
}: {
  userId: string;
  initialPath: string | null;
  name: string;
}) {
  const [path, setPath] = useState(initialPath);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!TYPES.includes(file.type)) return setError("Sadece JPG, PNG veya WebP.");
    if (file.size > MAX_BYTES) return setError("Fotoğraf en fazla 2 MB olabilir.");

    setBusy(true);
    setError("");
    const ext = file.type === "image/jpeg" ? "jpg" : file.type.split("/")[1];
    const newPath = `${userId}/${crypto.randomUUID()}.${ext}`;
    const { error } = await createClient()
      .storage.from("avatars")
      .upload(newPath, file, { contentType: file.type });
    setBusy(false);

    if (error) return setError("Fotoğraf yüklenemedi, tekrar dene.");
    setPath(newPath);
  }

  return (
    <div className="flex items-center gap-4">
      <Avatar path={path} name={name} size={80} />
      <div className="flex flex-col gap-1 text-sm">
        <label className="cursor-pointer rounded-md border border-neutral-700 px-3 py-2">
          {busy ? "Yükleniyor…" : "Fotoğraf seç"}
          <input type="file" accept={TYPES.join(",")} onChange={onChange} disabled={busy} className="sr-only" />
        </label>
        <span className="text-xs text-neutral-500">JPG, PNG, WebP · en fazla 2 MB</span>
        {error && <span role="alert" className="text-xs text-red-300">{error}</span>}
      </div>
      <input type="hidden" name="avatar_path" value={path ?? ""} readOnly />
    </div>
  );
}
