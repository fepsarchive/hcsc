export default function AdminLoading() {
  return (
    <div className="flex min-h-[320px] items-center justify-center">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-5 py-4 text-sm text-[var(--text-secondary)]">
        Admin verileri yükleniyor...
      </div>
    </div>
  );
}
