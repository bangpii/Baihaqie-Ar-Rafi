"use client";

import type { Language } from "@/app/lib/i18n";

type LanguageToggleProps = Readonly<{
  language: Language;
  onSelect: (language: Language) => void;
}>;

export function LanguageToggle({ language, onSelect }: LanguageToggleProps) {
  return (
    <div className="lang-toggle" role="group" aria-label="Language">
      <button
        type="button"
        className={language === "id" ? "is-active" : ""}
        onClick={() => onSelect("id")}
        aria-pressed={language === "id"}
      >
        ID
      </button>

      <button
        type="button"
        className={language === "en" ? "is-active" : ""}
        onClick={() => onSelect("en")}
        aria-pressed={language === "en"}
      >
        EN
      </button>
    </div>
  );
}