import { Icon } from "./Icon";

export const REPO = "https://github.com/manicpsycho01/statement-autopsy";

export function SiteHeader({ onHome }: { onHome?: () => void }) {
  const brand = (
    <>
      <span className="display text-[1.55rem] leading-none">
        Statement <em className="text-marker">Autopsy</em>
      </span>
    </>
  );
  return (
    <header className="no-print border-b border-line">
      <div className="wrap flex min-h-16 items-center justify-between gap-4 py-2">
        {onHome ? (
          <button type="button" onClick={onHome} className="flex min-h-11 items-center" aria-label="Statement Autopsy — start over">
            {brand}
          </button>
        ) : (
          <a href="/" className="flex min-h-11 items-center" aria-label="Statement Autopsy home">
            {brand}
          </a>
        )}
        <p className="label inline-flex min-h-9 items-center gap-2 rounded-full border border-line px-3 text-muted">
          <Icon name="lock" className="size-3.5 shrink-0" />
          <span className="sm:hidden">Never uploaded</span>
          <span className="hidden sm:inline">Your file never leaves this device</span>
        </p>
      </div>
    </header>
  );
}
