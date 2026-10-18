"use client";

import { useState } from "react";
import { Field } from "@/app/components/field";
import { TrackMetaFields } from "@/app/components/track-meta-fields";
import { Notice } from "@/app/components/notice";
import { createClient } from "@/lib/supabase/client";
import { AUDIO_MAX_BYTES, AUDIO_TYPES, COVER_MAX_BYTES, COVER_TYPES } from "@/lib/tracks";
import { fileWaveform } from "@/lib/waveform";
import { createTrack } from "./actions";

function audioDuration(file: File) {
  return new Promise<number | null>((resolve) => {
    const audio = new Audio();
    audio.preload = "metadata";
    audio.onloadedmetadata = () => {
      URL.revokeObjectURL(audio.src);
      resolve(Number.isFinite(audio.duration) ? audio.duration : null);
    };
    audio.onerror = () => resolve(null);
    audio.src = URL.createObjectURL(file);
  });
}

// Dosyalar tarayıcıdan doğrudan Storage'a gider (server action 1 MB sınırına takılmasın diye),
// ardından createTrack kaydı açar. Kayıt başarısız olursa yüklenen dosyalar geri silinir.
export function UploadForm({ userId }: { userId: string }) {
  const [audio, setAudio] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [cover, setCover] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  function pickAudio(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setError("");
    if (file && !AUDIO_TYPES.includes(file.type) && !file.name.toLowerCase().endsWith(".mp3")) {
      e.target.value = "";
      return setError("Ses dosyası MP3 olmalı.");
    }
    if (file && file.size > AUDIO_MAX_BYTES) {
      e.target.value = "";
      return setError("Ses dosyası en fazla 15 MB olabilir.");
    }
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudio(file);
    setAudioUrl(file ? URL.createObjectURL(file) : null);
  }

  function pickCover(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setError("");
    if (file && !COVER_TYPES.includes(file.type)) {
      e.target.value = "";
      return setError("Kapak JPG, PNG veya WebP olmalı.");
    }
    if (file && file.size > COVER_MAX_BYTES) {
      e.target.value = "";
      return setError("Kapak en fazla 3 MB olabilir.");
    }
    if (coverPreview) URL.revokeObjectURL(coverPreview);
    setCover(file);
    setCoverPreview(file ? URL.createObjectURL(file) : null);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!audio) return setError("Ses dosyası seç.");
    const form = new FormData(e.currentTarget);
    const storage = createClient().storage;
    setError("");

    setStatus("Ses analiz ediliyor…");
    const [duration, waveform] = await Promise.all([audioDuration(audio), fileWaveform(audio)]);

    setStatus("Ses dosyası yükleniyor…");
    const audioPath = `${userId}/${crypto.randomUUID()}.mp3`;
    const up = await storage.from("tracks").upload(audioPath, audio, { contentType: "audio/mpeg" });
    if (up.error) {
      setStatus("");
      return setError("Ses dosyası yüklenemedi. Bağlantını kontrol edip tekrar dene.");
    }

    let coverPath: string | null = null;
    if (cover) {
      setStatus("Kapak yükleniyor…");
      const ext = cover.type === "image/jpeg" ? "jpg" : cover.type.split("/")[1];
      coverPath = `${userId}/${crypto.randomUUID()}.${ext}`;
      const upCover = await storage.from("covers").upload(coverPath, cover, { contentType: cover.type });
      if (upCover.error) {
        await storage.from("tracks").remove([audioPath]);
        setStatus("");
        return setError("Kapak yüklenemedi. Tekrar dene.");
      }
    }

    setStatus("Kaydediliyor…");
    form.set("audio_path", audioPath);
    if (coverPath) form.set("cover_path", coverPath);
    form.set("duration_sec", String(duration ?? ""));
    if (waveform) form.set("waveform", JSON.stringify(waveform));

    // Başarılıysa createTrack profile yönlendirir; buraya sadece hata döner.
    const result = await createTrack(form);
    if (result?.error) {
      await storage.from("tracks").remove([audioPath]);
      if (coverPath) await storage.from("covers").remove([coverPath]);
      setStatus("");
      setError(result.error);
    }
  }

  const busy = status !== "";

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <label className="card flex cursor-pointer flex-col items-center gap-1 border-dashed p-6 text-center transition-colors hover:border-subtle has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent">
        <span className="text-3xl" aria-hidden>♪</span>
        <span className="font-semibold">{audio ? audio.name : "Ses dosyası seç"}</span>
        <span className="text-xs text-subtle">
          {audio ? `${(audio.size / 1024 / 1024).toFixed(1)} MB` : "MP3 · en fazla 15 MB"}
        </span>
        <input type="file" accept=".mp3,audio/mpeg" onChange={pickAudio} disabled={busy} className="sr-only" />
      </label>

      <div className="flex items-center gap-4">
        <div className="size-24 shrink-0 overflow-hidden rounded-xl bg-surface-2">
          {coverPreview && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={coverPreview} alt="Kapak önizleme" className="size-full object-cover" />
          )}
        </div>
        <div className="flex flex-col gap-1 text-sm">
          <label className="btn-secondary cursor-pointer has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent">
            {cover ? "Kapağı değiştir" : "Kapak seç (opsiyonel)"}
            <input type="file" accept={COVER_TYPES.join(",")} onChange={pickCover} disabled={busy} className="sr-only" />
          </label>
          <span className="text-xs text-subtle">JPG, PNG, WebP · en fazla 3 MB · kare gösterilir</span>
        </div>
      </div>

      <Field label="Başlık" name="title" required maxLength={80} disabled={busy} />

      <fieldset disabled={busy} className="flex flex-col gap-5">
        <TrackMetaFields previewSrc={audioUrl} />
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-muted">Açıklama (opsiyonel)</span>
          <textarea name="description" maxLength={500} rows={3} className="input" />
        </label>
      </fieldset>

      <label className="flex items-start gap-3 rounded-xl bg-surface-2 p-3.5 text-sm">
        <input type="checkbox" name="rights" required disabled={busy} className="mt-0.5 size-4 accent-accent" />
        <span>
          Bu parçanın tüm haklarına sahibim. İzinsiz sample veya başkasının beat&apos;ini içermiyor.
        </span>
      </label>

      {error && <Notice tone="error">{error}</Notice>}

      <button type="submit" disabled={busy} className="btn-primary">
        {status || "Yükle"}
      </button>
    </form>
  );
}
