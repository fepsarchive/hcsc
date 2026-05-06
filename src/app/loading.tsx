export default function Loading() {
  return (
    <div className="grid gap-5">
      {Array.from({ length: 3 }).map((_, index) => (
        <div
          key={index}
          className="h-40 animate-pulse rounded-[28px] border border-white/10 bg-white/5"
        />
      ))}
    </div>
  );
}
