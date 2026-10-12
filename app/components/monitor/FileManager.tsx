"use client";

import { useEffect, useRef, useState } from "react";

import type { DesktopCopy } from "@/app/lib/desktop";
import { cvDocuments, type CvDocumentId } from "@/app/lib/documents";
import type { Language } from "@/app/lib/i18n";
import { projects, type Project } from "@/app/lib/projects";
import { cn } from "@/app/lib/utils";

import { PdfIcon } from "./PdfIcon";
import { WindowControls } from "./WindowControls";

import "./files.css";

/* Where the file manager is showing. `null` is the home listing; the two folders and the
 * bin are the three places it goes. Exported because the station holds it: the desktop's
 * bin opens this same window at `"Trash"`, and the window's own navigation writes back. */
export type FilesPath = "CV" | "Project" | "Trash" | null;

interface FileManagerProps {
  copy: DesktopCopy["files"];
  /** The shared title-bar controls' labels, kept separate from the folder copy because
   *  the terminal uses the same words. */
  controls: DesktopCopy["window"];
  path: FilesPath;
  maximized: boolean;
  minimized: boolean;
  onPathChange: (path: FilesPath) => void;
  /** Opens a PDF from the CV folder in the document viewer. The id is what the viewer
   *  is opened with; where the file actually lives is `lib/documents`' business. */
  onOpenDocument: (id: CvDocumentId) => void;
  /** Opens a project's website (or repository) in the site viewer, from its detail
   *  panel. The project is what the viewer is opened with. */
  onViewProject: (project: Project) => void;
  language: Language;
  onMinimize: () => void;
  onMaximize: () => void;
  onClose: () => void;
}

const FolderIcon = () => (
  <svg aria-hidden="true" className="files__icon" fill="none" focusable="false" viewBox="0 0 24 18">
    <path
      d="M1.8 3.2A1.8 1.8 0 0 1 3.6 1.4h4.2l2 2.2h10.6a1.8 1.8 0 0 1 1.8 1.8v8.4a1.8 1.8 0 0 1-1.8 1.8H3.6a1.8 1.8 0 0 1-1.8-1.8z"
      stroke="currentColor"
      strokeLinejoin="round"
      strokeWidth="1.6"
    />
  </svg>
);

/* The bin, for the empty state. Drawn at the window's scale rather than the panel's, so
 *  it is the same weight as the folder and document glyphs above it. */
const TrashIcon = () => (
  <svg aria-hidden="true" className="files__empty-icon" fill="none" focusable="false" viewBox="0 0 24 24">
    <path d="M4 6.4h16" stroke="currentColor" strokeLinecap="round" strokeWidth="1.7" />
    <path d="M9.2 6.4V4.5A1.5 1.5 0 0 1 10.7 3h2.6a1.5 1.5 0 0 1 1.5 1.5v1.9" stroke="currentColor" strokeWidth="1.7" />
    <path
      d="M6.3 6.4l0.8 12.4A1.7 1.7 0 0 0 8.8 20.5h6.4a1.7 1.7 0 0 0 1.7-1.7l0.8-12.4"
      stroke="currentColor"
      strokeLinejoin="round"
      strokeWidth="1.7"
    />
    <path d="M10.1 10.1v6.6M13.9 10.1v6.6" stroke="currentColor" strokeLinecap="round" strokeWidth="1.7" />
  </svg>
);

export const FileManager = ({
  copy,
  controls,
  path,
  maximized,
  minimized,
  onPathChange,
  onOpenDocument,
  onViewProject,
  language,
  onMinimize,
  onMaximize,
  onClose,
}: FileManagerProps) => {
  const rootRef = useRef<HTMLDivElement | null>(null);

  /* Which project's detail is on the glass, or null for the grid. This window's own
   * state rather than the station's: the station cares about the viewer that opens from
   * it, and nothing outside a project folder needs to know what is being looked at. */
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  /* Focus lands here when the window opens.
   *
   *  Without it, focus stays on the panel's folder control — which is now hidden
   *  behind the window, so the next Tab would continue from a control the visitor
   *  cannot see. Moving it into the window is what makes the keyboard follow what is
   *  on the screen. */
  useEffect(() => {
    rootRef.current?.focus();
  }, []);

  /* Every move the window makes, in one place. Clearing the detail on the way out is
   *  part of navigating rather than an effect watching `path`: a stale selection would
   *  be a lie about where the visitor is, and resetting it here keeps the reset on the
   *  click that caused it instead of a render that exists only to copy a prop. */
  const navigate = (next: FilesPath) => {
    setSelectedProject(null);
    onPathChange(next);
  };

  /* SAFETY: `copy.folders` holds exactly the two names in the `FilesPath` union —
   * "CV" and "Project", in both languages — and the only caller of `open` is the
   * render of those two entries. The assertion narrows a widened `string` back to the
   * union; it does not invent a value the copy does not already contain. */
  const open = (name: string) => navigate(name as FilesPath);

  return (
    <div
      aria-label={copy.title}
      className={cn("files", maximized && "files--maximized", minimized && "files--minimized")}
      ref={rootRef}
      role="dialog"
      tabIndex={-1}
    >
      <header className="files__bar">
        <span className="files__crumbs">
          {path === null ? (
            copy.homeLabel
          ) : (
            <>
              {/* Back rather than a full path: two levels do not need a breadcrumb
                  trail, and a link that says where you are is not a control. */}
              <button className="files__back" onClick={() => navigate(null)} type="button">
                <span aria-hidden="true">‹</span> {copy.back}
              </button>
              <span className="files__sep" aria-hidden="true">
                /
              </span>
              <span className="files__here">{path === "Trash" ? copy.trash.name : path}</span>
            </>
          )}
        </span>

        <WindowControls
          closeLabel={copy.close}
          copy={controls}
          maximized={maximized}
          onClose={onClose}
          onMaximize={onMaximize}
          onMinimize={onMinimize}
        />
      </header>

      {path === null ? (
        <ul className="files__list">
          {copy.folders.map(([name, detail]) => (
            <li className="files__item" key={name}>
              <button className="files__entry" onClick={() => open(name)} type="button">
                <FolderIcon />
                <span className="files__text">
                  <span className="files__name">{name}</span>
                  <span className="files__detail">{detail}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : path === "Trash" ? (
        /* The bin is a state, not a folder: it is where deletions go, so it explains
           itself rather than showing an empty list with no reason for being empty. */
        <div className="files__empty">
          <TrashIcon />
          <p className="files__empty-title">{copy.trash.empty}</p>
          <p className="files__empty-note">{copy.trash.detail}</p>
        </div>
      ) : path === "CV" ? (
        /* The CV is the real folder: three PDFs, each a control that opens the document
           viewer, which is the same shape every file manager already has. */
        <ul className="files__list">
          {cvDocuments.map((doc) => (
            <li className="files__item" key={doc.id}>
              <button className="files__entry" onClick={() => onOpenDocument(doc.id)} type="button">
                <PdfIcon className="files__icon" />
                <span className="files__text">
                  <span className="files__name">{doc.fileName}</span>
                  <span className="files__detail">{copy.documents[doc.id]}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : selectedProject !== null ? (
        /* The detail panel: one project, spoken in the visitor's language. The action
           is the point — it opens the website on this glass, or the repository drawn in
           its place when the hosting is gone. */
        <div className="files__detail">
          <button className="files__back" onClick={() => setSelectedProject(null)} type="button">
            <span aria-hidden="true">‹</span> {copy.back}
          </button>

          <img
            alt={selectedProject.name}
            className="files__detail-image"
            src={selectedProject.imageSrc}
          />

          <h3 className="files__detail-title">{selectedProject.name}</h3>

          {selectedProject.role !== undefined && (
            <p className="files__detail-role">{selectedProject.role[language]}</p>
          )}

          <p className="files__detail-text">{selectedProject.description[language]}</p>

          <button
            className="files__action"
            onClick={() => onViewProject(selectedProject)}
            type="button"
          >
            {selectedProject.url !== null ? copy.viewWebsite : copy.viewRepository}
          </button>
        </div>
      ) : (
        /* The Project folder: a grid of the work, one screenshot per website, the name
           under it. The images come straight off the Cloudinary CDN — lazy, because some
           of these screenshots are a few megabytes and the reader has not asked for them
           all by scrolling to the bottom. */
        <ul className="files__grid">
          {projects.map((project) => (
            <li className="files__cell" key={project.id}>
              <button
                aria-label={project.name}
                className="files__card"
                onClick={() => setSelectedProject(project)}
                type="button"
              >
                <span className="files__card-frame">
                  <img alt="" className="files__card-image" loading="lazy" src={project.imageSrc} />
                </span>
                <span className="files__card-name">{project.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default FileManager;
