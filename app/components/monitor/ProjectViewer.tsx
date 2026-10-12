"use client";

import type { DesktopCopy } from "@/app/lib/desktop";
import type { Language } from "@/app/lib/i18n";
import type { Project } from "@/app/lib/projects";
import { cn } from "@/app/lib/utils";

import { WindowControls } from "./WindowControls";

import "./project.css";

interface ProjectViewerProps {
  project: Project;
  language: Language;
  copy: DesktopCopy["files"];
  controls: DesktopCopy["window"];
  maximized: boolean;
  minimized: boolean;
  onMinimize: () => void;
  onMaximize: () => void;
  onClose: () => void;
}

export const ProjectViewer = ({
  project,
  language,
  copy,
  controls,
  maximized,
  minimized,
  onMinimize,
  onMaximize,
  onClose,
}: ProjectViewerProps) => {
  const description = project.description[language];
  const repository = project.github.replace("https://github.com/", "");
  const live = project.url !== null;

  return (
    <div
      aria-label={copy.siteViewerLabel}
      className={cn(
        "term-window",
        "project-viewer",
        maximized && "term-window--maximized",
        minimized && "term-window--minimized",
      )}
      role="dialog"
    >
      <header className="term-window__bar">
        <span className="term-window__title">{project.name}</span>

        <WindowControls
          closeLabel={copy.close}
          copy={controls}
          maximized={maximized}
          onClose={onClose}
          onMaximize={onMaximize}
          onMinimize={onMinimize}
        />
      </header>

      <div className="term-window__body">
        {live ? (
          <iframe
            className="project-viewer__frame"
            src={project.url ?? undefined}
            title={project.name}
          />
        ) : (
          <div className="project-repo">
            {/* GitHub's frame-ancestors policy keeps the site out of here, so this view
                is the repository in words. The path is the heading because it is the one
                thing that is identically the repo's own. */}
            <p className="project-repo__path">{repository}</p>

            <p className="project-repo__note">{copy.repoNotice}</p>

            <p className="project-repo__description">{description}</p>

            {project.role !== undefined && (
              <p className="project-repo__role">
                {project.role[language]}
              </p>
            )}

            <ul className="project-repo__tech" aria-label={copy.languages}>
              {project.languages.map((technology) => (
                <li className="project-repo__tech-item" key={technology}>
                  {technology}
                </li>
              ))}
            </ul>

            {/* `target="_blank"` is deliberate: it is the only control on this desktop
                that leaves the monitor, and it is the one that should — the visitor asked
                for the repository, and the repository is a place a tab is for. */}
            <a
              className="project-repo__link"
              href={project.github}
              rel="noreferrer"
              target="_blank"
            >
              {copy.openOnGithub}
            </a>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectViewer;
