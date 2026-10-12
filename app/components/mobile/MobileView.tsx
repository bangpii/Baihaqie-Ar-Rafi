import { SocialIcon } from "@/app/components/icons/SocialIcon";
import { LanguageToggle } from "@/app/components/i18n/LanguageToggle";
import { ThemeToggle } from "@/app/components/theme/ThemeToggle";
import { messages, type Language } from "@/app/lib/i18n";
import type { Theme } from "@/app/lib/palettes";
import { projects } from "@/app/lib/projects";

import "./mobile.css";

type MobileViewProps = Readonly<{
  language: Language;
  onLanguage: (language: Language) => void;
  theme: Theme;
  onToggleTheme: () => void;
}>;

export function MobileView({
  language,
  onLanguage,
  theme,
  onToggleTheme,
}: MobileViewProps) {
  const t = messages[language];
  const mobile = t.mobile;

  return (
    <div className="mobile">
      <header className="mobile-nav">
        <span className="mobile-nav__brand">{mobile.name}</span>

        <div className="mobile-nav__actions">
          <LanguageToggle language={language} onSelect={onLanguage} />
          <ThemeToggle theme={theme} onToggle={onToggleTheme} />
        </div>
      </header>

      <section className="mobile-hero">
        <h1 className="mobile-hero__name">{mobile.name}</h1>

        <ul className="mobile-hero__roles">
          {t.roles.map((role) => (
            <li key={role}>{role}</li>
          ))}
        </ul>

        <p className="mobile-hero__bio">{mobile.bio}</p>
      </section>

      <section className="mobile-projects" aria-labelledby="mobile-projects-title">
        <div className="mobile-section-head">
          <h2 className="mobile-section-head__title" id="mobile-projects-title">
            {mobile.projectsTitle}
          </h2>
          <span className="mobile-section-head__count">{projects.length}</span>
        </div>

        <ul className="mobile-projects__list">
          {projects.map((project) => (
            <li className="mobile-card" key={project.id}>
              <div className="mobile-card__media">
                <img
                  alt={project.name}
                  decoding="async"
                  loading="lazy"
                  src={project.imageSrc}
                />
              </div>

              <div className="mobile-card__body">
                <h3 className="mobile-card__name">{project.name}</h3>

                {project.role !== undefined && (
                  <p className="mobile-card__role">{project.role[language]}</p>
                )}

                <p className="mobile-card__desc">{project.description[language]}</p>

                <ul className="mobile-card__tech" aria-label={mobile.stackLabel}>
                  {project.languages.map((technology) => (
                    <li key={technology}>{technology}</li>
                  ))}
                </ul>

                <div className="mobile-card__links">
                  {project.url !== null && (
                    <a
                      className="mobile-card__link"
                      href={project.url}
                      rel="noreferrer"
                      target="_blank"
                    >
                      {mobile.visit}
                    </a>
                  )}

                  <a
                    className="mobile-card__link"
                    href={project.github}
                    rel="noreferrer"
                    target="_blank"
                  >
                    {mobile.source}
                  </a>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <footer className="mobile-footer">
        <h2 className="mobile-section-head__title">{t.connectTitle}</h2>

        <nav className="mobile-footer__socials" aria-label={t.connectTitle}>
          {t.socials.map((social) => (
            <a
              key={social.label}
              href={social.href}
              rel="noopener noreferrer"
              target="_blank"
            >
              <SocialIcon name={social.icon} />
              {social.label}
            </a>
          ))}
        </nav>

        <p className="mobile-footer__note">{mobile.footerNote}</p>
      </footer>
    </div>
  );
}

export default MobileView;

