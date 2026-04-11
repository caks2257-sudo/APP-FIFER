/**
 * Marca FIFER: «F» centrada en contenedor Deep Navy y trazo fluido (sin iconografía de edición heredada).
 */
export default function FiferIsotypeMark({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-[#1E293B] ring-1 ring-[#1E293B]">
        <span className="text-center text-sm font-semibold leading-none tracking-tight text-[#EAB308]">
          F
        </span>
      </div>
      <svg
        viewBox="0 0 48 28"
        className="h-7 w-12 flex-shrink-0 text-[#EAB308]/90"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <path
          d="M2 14 C 10 6, 16 22, 24 14 S 36 8, 46 14"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}
