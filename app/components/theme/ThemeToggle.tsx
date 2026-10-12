"use client";

import type { Theme } from "@/app/lib/palettes";

type ThemeToggleProps = Readonly<{
  theme: Theme;
  onToggle: () => void;
}>;

export function ThemeToggle({ theme, onToggle }: ThemeToggleProps) {
  const label = theme === "light" ? "Switch to dark theme" : "Switch to light theme";

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={label}
      title={label}
      className="theme-toggle"
    >
      {theme === "light" ? (
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <g stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M12 2v2.2" />
            <path d="M12 19.8V22" />
            <path d="M2 12h2.2" />
            <path d="M19.8 12H22" />
            <path d="m4.9 4.9 1.6 1.6" />
            <path d="m17.5 17.5 1.6 1.6" />
            <path d="m4.9 19.1 1.6-1.6" />
            <path d="m17.5 6.5 1.6-1.6" />
          </g>
        </svg>
      )}
    </button>
  );
}