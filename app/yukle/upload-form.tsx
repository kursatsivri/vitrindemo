"use client";

import { ImagePlus, Music, Upload, X } from "lucide-react";
import { useState } from "react";
import { CheckCard, Field, TextArea } from "@/app/components/field";
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
export function UploadForm({ userId, challenge }: { userId: string; challenge?: { id: string; beatTitle: string } }) {
  const [audio, setAudio] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [cover, setCover] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [dragging, setDragging] = useState(false);
  const busy = status !== "";

  // Seçilen ya da sürükle-bırakılan ses dosyası; geçersizse false döner.
  function takeAudio(file: File | null) {
    setError("");
    if (file && !AUDIO_TYPES.includes(file.type) && !file.name.toLowerCase().endsWith(".mp3")) {
      setError("Ses dosyası MP3 olmalı.");
      return false;
    }
    if (file && file.size > AUDIO_MAX_BYTES) {
      setError("Ses dosyası en fazla 15 MB olabilir.");
      return false;
    }
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudio(file);
    setAudioUrl(file ? URL.createObjectURL(file) : null);
    return true;
  }

  function pickAudio(e: React.ChangeEvent<HTMLInputElement>) {
    if (!takeAudio(e.target.files?.[0] ?? null)) e.target.value = "";
  }

  function dropAudio(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    if (!busy) takeAudio(e.dataTransfer.files[0] ?? null);
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

    // Başarılıysa createTrack parça sayfasına yönlendirir; buraya sadece hata döner.
    const result = await createTrack(form);
    if (result?.error) {
      await storage.from("tracks").remove([audioPath]);
      if (coverPath) await storage.from("covers").remove([coverPath]);
      setStatus("");
      setError(result.error);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-10 md:flex-row md:items-start">
      {challenge && <input type="hidden" name="challenge_id" value={challenge.id} />}
      <div className="flex flex-col gap-6 md:flex-1">
        {audio ? (
          <div className="flex items-center gap-3.5 rounded-2xl border-[1.5px] border-accent/45 bg-accent-soft p-5">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-accent text-bg">
              <Music aria-hidden className="size-5" strokeWidth={2} />
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="truncate text-[15px] font-medium">{audio.name}</span>
              <span className="text-[13px] text-text-muted">{(audio.size / 1024 / 1024).toFixed(1)} MB</span>
            </span>
            <button
              type="button"
              onClick={() => takeAudio(null)}
              disabled={busy}
              aria-label="Ses dosyasını kaldır"
              className="icon-btn size-9 border-transparent bg-transparent text-text-muted hover:text-text"
            >
              <X aria-hidden className="size-[18px]" strokeWidth={1.75} />
            </button>
          </div>
        ) : (
          <label
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={dropAudio}
            className={`flex h-48 cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-[1.5px] border-dashed bg-surface text-center transition duration-150 hover:border-text-muted/50 has-focus-visible:outline-2 has-focus-visible:outline-accent md:h-56 ${dragging ? "border-accent bg-accent-soft" : "border-border"}`}
          >
            <span className="flex size-13 items-center justify-center rounded-full bg-accent-soft text-accent">
              <Upload aria-hidden className="size-6" strokeWidth={1.75} />
            </span>
            <span className="flex flex-col gap-1">
              <span className="text-[15px] font-medium">MP3&apos;ünü buraya bırak</span>
              <span className="text-[13px] text-text-muted">
                ya da <span className="text-accent">dosya seç</span> · en fazla 15 MB
              </span>
            </span>
            <input type="file" accept=".mp3,audio/mpeg" onChange={pickAudio} disabled={busy} className="sr-only" />
          </label>
        )}

        <div className="flex items-center gap-4">
          <div className="flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border-[1.5px] border-dashed border-border bg-surface text-text-muted">
            {coverPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={coverPreview} alt="Kapak önizleme" className="size-full object-cover" />
            ) : (
              <ImagePlus aria-hidden className="size-6" strokeWidth={1.75} />
            )}
          </div>
          <div className="flex flex-col items-start gap-2">
            <label className="btn-secondary h-10 cursor-pointer has-focus-visible:outline-2 has-focus-visible:outline-accent">
              {cover ? "Kapağı değiştir" : "Kapak seç"}
              <input type="file" accept={COVER_TYPES.join(",")} onChange={pickCover} disabled={busy} className="sr-only" />
            </label>
            <span className="text-xs text-text-muted">Opsiyonel · JPG, PNG, WebP · 3 MB · kare</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-6 md:flex-[1.4]">
        <Field label="Başlık" name="title" required maxLength={80} disabled={busy} placeholder="Parçanın adı" />

        <fieldset disabled={busy} className="flex flex-col gap-6">
          <TrackMetaFields previewSrc={audioUrl} />
          <TextArea label="Açıklama (opsiyonel)" name="description" maxLength={500} rows={3} />
        </fieldset>

        <CheckCard
          name="rights"
          required
          disabled={busy}
          title="Bu parçanın tüm haklarına sahibim"
          hint="İzinsiz sample veya başkasının beat'ini içermiyor."
        />

        {error && <Notice tone="error">{error}</Notice>}

        <button type="submit" disabled={busy} className="btn-primary h-[52px] text-[15px] md:self-end md:px-9">
          {status || "Yükle"}
        </button>
      </div>
    </form>
  );
}
