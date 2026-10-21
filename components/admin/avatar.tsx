export function Avatar({ name, src, size = 32 }: { name: string; src: string | null; size?: number }) {
  const initials =
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]!.toUpperCase())
      .join('') || '?';
  return (
    <span className="admin-avatar" style={{ width: size, height: size, fontSize: size * 0.38 }} aria-hidden>
      {src ? <img src={src} alt="" /> : initials}
    </span>
  );
}
