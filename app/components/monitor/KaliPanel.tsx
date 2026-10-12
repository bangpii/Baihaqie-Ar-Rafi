"use client";

import { useEffect, useRef, useState } from "react";

import { KaliMark } from "@/app/components/monitor/KaliMark";
import type { DesktopCopy } from "@/app/lib/desktop";

import "./panel.css";

interface KaliPanelProps {
  copy: DesktopCopy;
  /** Whether the file manager is already open. The folder control is a toggle, so it
   *  has to know which state it is in — otherwise closing the window leaves a control
   *  on the bar that still says "open". */
  filesOpen: boolean;
  onToggleFiles: () => void;
  /** The terminal window's twin of `filesOpen`: the launcher is a toggle too, so it
   *  reports whether the terminal is up rather than only asking for it. */
  terminalOpen: boolean;
  onToggleTerminal: () => void;
  /** The three actions behind the mark. XFCE's logout dialog is exactly these, so the
   *  mark opens a menu rather than doing one of them directly — a logo that silently
   *  shut the machine down would be a button disguised as a badge. */
  onLogOut: () => void;
  onRestart: () => void;
  onShutdown: () => void;
}

/** Battery, read from the browser and honest about not being readable.
 *
 *  `navigator.getBattery` is Chromium-only and absent on some embedded webviews, so
 *  there is a defined "unknown" state rather than a battery icon showing a made-up
 *  number. A status bar that lies about the hardware is a strange thing to put on a
 *  page whose subject is a person's actual machine. */
type Battery = { level: number; charging: boolean } | null;

const useBattery = (): Battery => {
  const [battery, setBattery] = useState<Battery>(null);

  useEffect(() => {
    /* Not a capability check on `navigator` alone: the method exists in Chromium but
     * rejects in some contexts, and an unhandled rejection here would take the whole
     * panel down with it. */
    const get = navigator.getBattery?.bind(navigator);

    if (get === undefined) return;

    let cancelled = false;

    const read = (manager: BatteryManager) =>
      setBattery({ level: manager.level, charging: manager.charging });

    get()
      .then((manager) => {
        if (cancelled) return;

        read(manager);
        manager.addEventListener("levelchange", () => read(manager));
        manager.addEventListener("chargingchange", () => read(manager));
      })
      .catch(() => {
        /* Left null on purpose. The icon then reads as "not telling you", which is
         * what is true. */
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return battery;
};

interface ClockProps {
  label: string;
}

/** The time and date, ticking.
 *
 *  A clock frozen at render time is the tell that a status bar is a picture, so this
 *  updates itself — once a second, and only while the panel is mounted. The interval
 *  is cleared on unmount because the monitor is portalled in and out of the DOM as the
 *  user dives, and a leaked interval per dive would be a leaked interval per dive. */
const Clock = ({ label }: ClockProps) => {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    /* The first tick is deferred to the interval rather than set immediately, so this
     * effect's only job is scheduling. Setting state on the way in would be a second
     * render for a value that is one tick away, and it is a render of a component
     * sitting inside a WebGL frame. */
    const id = setInterval(() => setNow(new Date()), 1000);

    return () => clearInterval(id);
  }, []);

  /* Rendered empty until the first tick. The screen is authored at a fixed size and
   * the text is right-aligned, so a placeholder of the right shape holds the layout
   * steady instead of the panel jumping when the clock appears. */
  if (now === null) return <span className="kali-panel__clock" aria-hidden="true" />;

  return (
    <span className="kali-panel__clock">
      <time dateTime={now.toISOString()}>{now.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}</time>
      <span className="kali-panel__date">{now.toLocaleDateString(undefined, { day: "2-digit", month: "short" })}</span>
      <span className="visually-hidden">{label}</span>
    </span>
  );
};

/* Indicator glyphs, inline. Three icons drawn in one place rather than pulled from a
 * library: the panel is inside a WebGL-projected element at roughly a hundredth of its
 * authored size, so these are read as silhouettes, and a general-purpose icon set is
 * sized for a UI that is not this small. */
const WifiIcon = () => (
  <svg aria-hidden="true" className="kali-panel__icon" fill="none" focusable="false" viewBox="0 0 16 12">
    <path
      d="M1 3.4A10.6 10.6 0 0 1 15 3.4M3.6 6.2a6.9 6.9 0 0 1 8.8 0M6.2 8.9a3.2 3.2 0 0 1 3.6 0"
      stroke="currentColor"
      strokeLinecap="round"
      strokeWidth="1.5"
    />
    <circle cx="8" cy="11" fill="currentColor" r="1.1" />
  </svg>
);

const VolumeIcon = () => (
  <svg aria-hidden="true" className="kali-panel__icon" fill="none" focusable="false" viewBox="0 0 16 12">
    <path d="M2 4.4h2.4L7.6 1.6v8.8L4.4 7.6H2z" fill="currentColor" />
    <path
      d="M10 4.2a3.2 3.2 0 0 1 0 3.6M12.2 2.4a6 6 0 0 1 0 7.2"
      stroke="currentColor"
      strokeLinecap="round"
      strokeWidth="1.4"
    />
  </svg>
);

const TerminalIcon = () => (
  <svg aria-hidden="true" className="kali-panel__icon" fill="none" focusable="false" viewBox="0 0 16 12">
    <path d="M1.6 2.4 5.4 6 1.6 9.6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
    <path d="M7.2 9.6h6.8" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" />
  </svg>
);

const FolderIcon = () => (
  <svg aria-hidden="true" className="kali-panel__icon" fill="none" focusable="false" viewBox="0 0 16 12">
    <path
      d="M1.2 2.6A1.4 1.4 0 0 1 2.6 1.2h3l1.4 1.6h6.4a1.4 1.4 0 0 1 1.4 1.4v5.4a1.4 1.4 0 0 1-1.4 1.4H2.6a1.4 1.4 0 0 1-1.4-1.4z"
      stroke="currentColor"
      strokeLinejoin="round"
      strokeWidth="1.4"
    />
  </svg>
);

const BatteryIcon = ({ level, charging }: { level: number; charging: boolean }) => (
  <span className="kali-panel__battery">
    <svg aria-hidden="true" className="kali-panel__icon" fill="none" focusable="false" viewBox="0 0 18 12">
      <rect height="9" rx="2" stroke="currentColor" strokeWidth="1.3" width="14" x="1" y="1.5" />
      <path d="M16.4 5v2" stroke="currentColor" strokeLinecap="round" strokeWidth="1.6" />
      {/* One fill state for "charging" so the bar is not read as a precise measurement
          that the browser has not actually made. */}
      <rect
        fill="currentColor"
        height="5.5"
        rx="1"
        width={charging ? 10 : Math.max(1.5, 10 * level)}
        x="2.8"
        y="3.2"
      />
    </svg>
    {charging && <span className="kali-panel__bolt">⚡</span>}
  </span>
);

export const KaliPanel = ({
  copy,
  filesOpen,
  onToggleFiles,
  terminalOpen,
  onToggleTerminal,
  onLogOut,
  onRestart,
  onShutdown,
}: KaliPanelProps) => {
  const battery = useBattery();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  /* The menu is a click-away, so it closes the moment the pointer goes down anywhere
     else on the glass. Bound on `pointerdown` rather than `click`, because the
     launchers beside it act on the same press and the menu should have left by the
     time their window is up. A no-op when it is closed, which is most of the time. */
  useEffect(() => {
    if (!menuOpen) return;

    const onPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && menuRef.current !== null && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener("pointerdown", onPointerDown);

    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [menuOpen]);

  /* One press, then the menu is gone before the action runs, so the click that chose
     "Shut Down" is never drawn over the shutdown it asked for. */
  const choose = (action: () => void) => () => {
    setMenuOpen(false);
    action();
  };

  return (
    <div className="kali-panel">
      <div className="kali-panel__left">
        <div className="kali-panel__menu-anchor" ref={menuRef}>
          <button
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            aria-label={copy.panel.logoLabel}
            className="kali-panel__mark-button"
            onClick={() => setMenuOpen((open) => !open)}
            type="button"
          >
            <KaliMark className="kali-panel__mark" size={1.5} />
          </button>

          {menuOpen && (
            <div className="kali-panel__menu" role="menu">
              <button className="kali-panel__menu-item" onClick={choose(onLogOut)} role="menuitem" type="button">
                {copy.panel.logOut}
              </button>

              <button className="kali-panel__menu-item" onClick={choose(onRestart)} role="menuitem" type="button">
                {copy.panel.restart}
              </button>

              <button className="kali-panel__menu-item" onClick={choose(onShutdown)} role="menuitem" type="button">
                {copy.panel.shutDown}
              </button>
            </div>
          )}
        </div>

        <span className="kali-panel__wordmark">{copy.wordmark}</span>

        {/* The launchers, not status lights: XFCE puts its applications on the left, and
            these are the two the desk exists for. Each is a toggle because the window it
            opens can be closed again from here, so the pressed state is the honest report
            of whether that window is already up. */}
        <button
          aria-label={copy.panel.terminalLabel}
          aria-pressed={terminalOpen}
          className="kali-panel__button"
          onClick={onToggleTerminal}
          type="button"
        >
          <TerminalIcon />
          <span>{copy.terminal.label}</span>
        </button>

        <button
          aria-label={copy.panel.folderLabel}
          aria-pressed={filesOpen}
          className="kali-panel__button"
          onClick={onToggleFiles}
          type="button"
        >
          <FolderIcon />
          <span>{copy.panel.folder}</span>
        </button>
      </div>

      <div className="kali-panel__right">
        <WifiIcon />
        <VolumeIcon />
        {battery !== null && (
          <BatteryIcon charging={battery.charging} level={battery.level} />
        )}

        <Clock label={copy.panel.clockLabel} />
      </div>
    </div>
  );
};

export default KaliPanel;

