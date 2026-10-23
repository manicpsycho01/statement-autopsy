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
        <div className="flex items-center gap-2">
          <span className="label hidden items-center gap-2 rounded-full border border-line px-3 py-2 text-muted sm:inline-flex">
            <Icon name="lock" className="size-3.5" /> Runs on your device
          </span>
          <a
            href={REPO}
            target="_blank"
            rel="noreferrer"
            className="label inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-muted transition-colors hover:text-ink"
          >
            <Icon name="github" className="size-4" /> <span className="hidden sm:inline">Source</span>
          </a>
        </div>
      </div>
    </header>
  );
}
