import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DRAFT_NOTE, LEGAL } from "@/lib/legal";

export function generateStaticParams() {
  return Object.keys(LEGAL).map((sayfa) => ({ sayfa }));
}

// Dört sayfa build'de hazır; bilinmeyen slug Suspense'siz beklenir ki gerçek 404 dönsün.
export const instant = false;

// hasOwn: "constructor" gibi slug'lar prototipten gelmesin
const legalDoc = (slug: string) => (Object.hasOwn(LEGAL, slug) ? LEGAL[slug] : null);

export async function generateMetadata({ params }: PageProps<"/yasal/[sayfa]">): Promise<Metadata> {
  const doc = legalDoc((await params).sayfa);
  return { title: doc ? `${doc.title} | Vitrin` : "Sayfa bulunamadı | Vitrin" };
}

export default async function Page({ params }: PageProps<"/yasal/[sayfa]">) {
  const doc = legalDoc((await params).sayfa);
  if (!doc) notFound();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-7 md:py-14">
      <div className="flex flex-col gap-3">
        <h1 className="font-display text-4xl leading-none font-extrabold tracking-[-0.04em] md:text-5xl">{doc.title}</h1>
        <p className="w-fit rounded-full bg-accent-soft px-3 py-1 text-xs font-medium text-accent">{DRAFT_NOTE}</p>
      </div>
      {doc.sections.map((s) => (
        <section key={s.heading} className="flex flex-col gap-3">
          <h2 className="font-display text-2xl font-bold tracking-[-0.03em]">{s.heading}</h2>
          {s.paragraphs.map((p) => (
            <p key={p} className="text-[15px] leading-relaxed text-text-muted">
              {p}
            </p>
          ))}
        </section>
      ))}
    </main>
  );
}
