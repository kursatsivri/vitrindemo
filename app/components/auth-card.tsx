export function AuthCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-4 py-10">
      <div className="card flex flex-col gap-6 p-6">
        <h1 className="font-display text-3xl font-bold tracking-tight">{title}</h1>
        {children}
      </div>
    </main>
  );
}
