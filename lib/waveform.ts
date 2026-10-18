export const WAVEFORM_POINTS = 120;

// Ses örneklerini n parçaya böler, her parçanın ortalama gücünü (RMS) 0–100'e ölçekler (en güçlü = 100).
// Tepe değeri yerine RMS: yüksek seviyede mikslenmiş parçalarda tepe her yerde tavana vurup dalgayı düzleştirir.
export function peaks(samples: Float32Array, n = WAVEFORM_POINTS): number[] {
  const size = Math.floor(samples.length / n);
  if (size < 1) return [];
  const raw: number[] = [];
  for (let i = 0; i < n; i++) {
    let sum = 0;
    for (let j = i * size; j < (i + 1) * size; j++) sum += samples[j] * samples[j];
    raw.push(Math.sqrt(sum / size));
  }
  const top = Math.max(...raw) || 1;
  return raw.map((v) => Math.round((v / top) * 100));
}

// Tarayıcıda dosyayı çözüp ses dalgasını çıkarır; başarısızsa null (dalga zorunlu değil).
export async function fileWaveform(file: File): Promise<number[] | null> {
  try {
    const ctx = new AudioContext();
    const buffer = await ctx.decodeAudioData(await file.arrayBuffer());
    void ctx.close();
    const result = peaks(buffer.getChannelData(0));
    return result.length ? result : null;
  } catch {
    return null;
  }
}
