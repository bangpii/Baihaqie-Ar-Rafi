"use client";

import type { DesktopCopy } from "@/app/lib/desktop";

import "./window.css";

interface WindowControlsProps {
  copy: DesktopCopy["window"];
  /** Read aloud as the close button's name — the glyph is decorative to a reader. */
  closeLabel: string;
  maximized: boolean;
  onMinimize: () => void;
  onMaximize: () => void;
  onClose: () => void;
}

const MinimizeIcon = () => (
  <svg aria-hidden="true" fill="none" focusable="false" viewBox="0 0 10 10">
    <path d="M1.6 5h6.8" stroke="currentColor" strokeLinecap="round" strokeWidth="1.4" />
  </svg>
);

/* A single square when the window is normal, two offset squares when it is already
 *  full: the button shows what pressing it will do, which is the one thing a toggle
 *  glyph has to get right. */
const MaximizeIcon = ({ maximized }: { maximized: boolean }) =>
  maximized ? (
    <svg aria-hidden="true" fill="none" focusable="false" viewBox="0 0 10 10">
      <rect height="5" stroke="currentColor" strokeWidth="1.2" width="5" x="1.6" y="3.4" />
      <path d="M3.6 3.4V1.6h4.8v4.8H6.6" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  ) : (
    <svg aria-hidden="true" fill="none" focusable="false" viewBox="0 0 10 10">
      <rect height="6.8" stroke="currentColor" strokeWidth="1.2" width="6.8" x="1.6" y="1.6" />
    </svg>
  );

const CloseIcon = () => (
  <svg aria-hidden="true" fill="none" focusable="false" viewBox="0 0 10 10">
    <path d="M2.2 2.2 7.8 7.8M7.8 2.2 2.2 7.8" stroke="currentColor" strokeLinecap="round" strokeWidth="1.4" />
  </svg>
);

export const WindowControls = ({ copy, closeLabel, maximized, onMinimize, onMaximize, onClose }: WindowControlsProps) => (
  <span className="window-controls">
    <button aria-label={copy.minimize} className="window-control" onClick={onMinimize} type="button">
      <MinimizeIcon />
    </button>

    <button
      aria-label={maximized ? copy.restore : copy.maximize}
      aria-pressed={maximized}
      className="window-control"
      onClick={onMaximize}
      type="button"
    >
      <MaximizeIcon maximized={maximized} />
    </button>

    <button aria-label={closeLabel} className="window-control window-control--close" onClick={onClose} type="button">
      <CloseIcon />
    </button>
  </span>
);

export default WindowControls;

