import clsx from "clsx";

const TikTokConnectButton = ({ compact }: { compact?: boolean }) => {
  return (
    <a
      href="/api/tiktok/auth"
      className={clsx(
        "inline-flex items-center justify-center gap-2 rounded-full bg-black text-white transition hover:bg-neutral-800",
        compact ? "px-5 py-2.5 text-sm font-semibold" : "px-7 py-3.5 text-base font-semibold"
      )}
    >
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="currentColor">
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.75h-3.28v13.45a2.9 2.9 0 1 1-2.9-2.9c.24 0 .47.03.69.08V9.24a6.18 6.18 0 0 0-.69-.04A6.19 6.19 0 1 0 15.82 15V8.16a8.13 8.13 0 0 0 4.77 1.53V6.69z" />
      </svg>
      <span>Conectar con TikTok</span>
    </a>
  );
};

export default TikTokConnectButton;
