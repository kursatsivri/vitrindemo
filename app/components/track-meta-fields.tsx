"use client";

import { useRef, useState } from "react";
import { ChevronDown, Play } from "lucide-react";
import { CheckCard, Field } from "@/app/components/field";
import { GenrePills } from "@/app/components/genre-pills";
import { MAX_FEATURES, MAX_MOODS, MAX_TAGS, MOODS, parseTime, TAGS, TRACK_LINKS } from "@/lib/music";
import { formatDuration } from "@/lib/tracks";

const pill = "chip h-[30px] px-3 text-[13px]";

// En fazla `max` seçilebilen etiket grubu; sınır dolunca seçilmeyenler kilitlenir.
function LimitedPills({
  name,
  legend,
  options,
  max,
  defaults,
}: {
  name: string;
  legend: string;
  options: readonly { value: string; label: string }[];
  max: number;
  defaults: string[];
}) {
  const [chosen, setChosen] = useState(defaults);
  return (
    <fieldset className="flex flex-col">
      <legend className="label mb-2.5">
        {legend} <span className="text-text-muted/60">(en fazla {max})</span>
      </legend>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => {
          const on = chosen.includes(o.value);
          return (
            <label key={o.value} className={pill}>
              <input
                type="checkbox"
                name={name}
                value={o.value}
                checked={on}
                disabled={!on && chosen.length >= max}
                onChange={() => setChosen(on ? chosen.filter((v) => v !== o.value) : [...chosen, o.value])}
                className="sr-only"
              />
              {o.label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

export type TrackMetaDefaults = {
  genre?: string;
  tags?: string[];
  moods?: string[];
  hookSec?: number;
  seekingVocal?: boolean;
  challengeCandidate?: boolean;
  feats?: string[];
  links?: Record<string, string>;
};

// Yükleme ve düzenleme formlarında ortak parça bilgileri (tür, etiketler, en iyi an, feat, linkler).
// `previewSrc` verilirse "en iyi an" o kaynaktan 10 sn dinlenerek denenebilir.
export function TrackMetaFields({ defaults = {}, previewSrc }: { defaults?: TrackMetaDefaults; previewSrc?: string | null }) {
  const [genre, setGenre] = useState(defaults.genre ?? "");
  const [hook, setHook] = useState(defaults.hookSec ? formatDuration(defaults.hookSec) : "");
  const preview = useRef<HTMLAudioElement | null>(null);

  function tryHook() {
    if (!previewSrc) return;
    const at = parseTime(hook) ?? 0;
    preview.current?.pause();
    const a = new Audio(previewSrc);
    preview.current = a;
    a.currentTime = at;
    a.play();
    setTimeout(() => a.pause(), 10_000);
  }

  return (
    <>
      <div onChange={(e) => (e.target as HTMLInputElement).name === "genre" && setGenre((e.target as HTMLInputElement).value)}>
        <GenrePills type="radio" defaultValues={defaults.genre ? [defaults.genre] : []} />
      </div>

      {genre === "beat" && (
        <CheckCard
          name="seeking_vocal"
          defaultChecked={defaults.seekingVocal}
          title="Rapçi / vokal arıyorum"
          hint="Bu beat üzerine yazacak birini arıyorsan işaretle."
        />
      )}
      {genre === "beat" && (
        <CheckCard
          name="challenge_candidate"
          defaultChecked={defaults.challengeCandidate}
          title="Haftalık challenge'a aday"
          hint="Seçilirse rapçiler bu beat'i indirip üzerine yazar; sen otomatik prodüksiyon olarak etiketlenirsin."
        />
      )}

      <LimitedPills name="tags" legend="Alt tür" options={TAGS} max={MAX_TAGS} defaults={defaults.tags ?? []} />
      <LimitedPills name="moods" legend="Ruh hali" options={MOODS} max={MAX_MOODS} defaults={defaults.moods ?? []} />

      <div className="flex flex-col gap-2">
        <label htmlFor="hook" className="label">En iyi an (dk:sn)</label>
        <div className="flex gap-2">
          <input
            id="hook"
            name="hook"
            value={hook}
            onChange={(e) => setHook(e.target.value)}
            placeholder="1:05"
            inputMode="numeric"
            className="input w-28 shrink-0"
          />
          {previewSrc && (
            <button type="button" onClick={tryHook} className="btn-secondary h-12">
              <Play aria-hidden className="size-3.5" fill="currentColor" />
              10 sn dinle
            </button>
          )}
        </div>
        <span className="text-xs text-text-muted">Keşfet modunda parça buradan çalmaya başlar. Boş bırakırsan baştan.</span>
      </div>

      <Field
        label="Feat (opsiyonel)"
        name="feats"
        defaultValue={(defaults.feats ?? []).map((u) => `@${u}`).join(", ")}
        placeholder="@kullaniciadi, @digeri"
        autoCapitalize="none"
        hint={`Parçada yer alan sitedeki sanatçılar, en fazla ${MAX_FEATURES}. Etiketlenen kişi kendini çıkarabilir.`}
      />

      <details className="group rounded-xl border border-border" open={Object.keys(defaults.links ?? {}).length > 0}>
        <summary className="flex h-[52px] cursor-pointer list-none items-center justify-between px-4 text-sm font-medium text-text-muted [&::-webkit-details-marker]:hidden">
          Dış linkler (opsiyonel)
          <ChevronDown aria-hidden className="size-[18px] transition duration-150 group-open:rotate-180" strokeWidth={1.75} />
        </summary>
        <div className="flex flex-col gap-4 px-4 pb-4">
          {TRACK_LINKS.map((l) => (
            <Field
              key={l.key}
              label={l.label}
              name={l.key}
              type="url"
              defaultValue={defaults.links?.[l.key] ?? ""}
              placeholder={`https://${l.hosts[0]}/…`}
            />
          ))}
        </div>
      </details>
    </>
  );
}
