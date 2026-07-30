// Ícone de marca do SISA: um arco/porta com um ponto de presença ao lado,
// dentro de um selo de cantos arredondados. Cores fixas da marca (não
// personalizável por className de cor) para manter consistência visual.
export function Logo({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 512 512" className={className} role="img" aria-label="SISA">
      <rect x="32" y="32" width="448" height="448" rx="104" ry="104" fill="#7C5C4A" />
      <path d="M 176 380 L 176 256 A 80 80 0 0 1 336 256 L 336 380 Z" fill="#F5F3EF" />
      <circle cx="344" cy="172" r="22" fill="#F5F3EF" />
    </svg>
  );
}
