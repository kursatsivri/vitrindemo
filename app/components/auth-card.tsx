export function AuthCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-10">
      <div className="card flex flex-col gap-6 px-5 py-7 sm:px-8 sm:py-9 [&_.input]:bg-bg">
        <div className="flex flex-col gap-1.5">
          <h1 className="font-display text-[32px] font-extrabold leading-[1.05] tracking-[-0.035em]">{title}</h1>
          {subtitle && <p className="text-sm text-text-muted">{subtitle}</p>}
        </div>
        {children}
      </div>
    </main>
  );
}
