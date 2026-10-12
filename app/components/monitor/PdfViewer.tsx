"use client";

import type { DesktopCopy } from "@/app/lib/desktop";
import type { CvDocument } from "@/app/lib/documents";
import { cn } from "@/app/lib/utils";

import { WindowControls } from "./WindowControls";

import "./pdf.css";

interface PdfViewerProps {
  /** The document being shown. Its filename is the window's title. */
  doc: CvDocument;
  /** Read aloud as the window's name — the title bar shows the filename. */
  label: string;
  /** The shared title-bar controls' labels, kept separate from the folder copy because
   *  the terminal uses the same words. */
  controls: DesktopCopy["window"];
  closeLabel: string;
  maximized: boolean;
  minimized: boolean;
  onMinimize: () => void;
  onMaximize: () => void;
  onClose: () => void;
}

export const PdfViewer = ({
  doc,
  label,
  controls,
  closeLabel,
  maximized,
  minimized,
  onMinimize,
  onMaximize,
  onClose,
}: PdfViewerProps) => (
  <div
    aria-label={label}
    className={cn(
      "term-window",
      "pdf-viewer",
      maximized && "term-window--maximized",
      minimized && "term-window--minimized",
    )}
    role="dialog"
  >
    <header className="term-window__bar">
      <span className="term-window__title">{doc.fileName}</span>

      <WindowControls
        closeLabel={closeLabel}
        copy={controls}
        maximized={maximized}
        onClose={onClose}
        onMaximize={onMaximize}
        onMinimize={onMinimize}
      />
    </header>

    <div className="term-window__body pdf-viewer__body">
      {/* `title` is the accessible name of the frame and, since the window already names
          the file, it deliberately repeats it rather than inventing a second label. */}
      <iframe className="pdf-viewer__frame" src={doc.src} title={doc.fileName} />
    </div>
  </div>
);

export default PdfViewer;

