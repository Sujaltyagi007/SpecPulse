export function Avatar({ name, src, size = 32 }: { name: string; src: string | null; size?: number }) {
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join('') || '?';
  return (
    <span className="admin-avatar relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-admin-muted-bg text-admin-muted border border-admin-border font-semibold select-none"
      style={{ width: size, height: size, fontSize: size * 0.38 }} aria-hidden    >
      {src ? <img src={src} alt="" className="h-full w-full object-cover" /> : initials}
    </span>
  );
}
