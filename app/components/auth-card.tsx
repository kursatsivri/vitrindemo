export function AuthCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col gap-6 px-4 py-10">
      <h1 className="text-2xl font-semibold">{title}</h1>
      {children}
    </main>
  );
}
