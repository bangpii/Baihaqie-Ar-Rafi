"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";

import type { Language } from "@/app/lib/i18n";
import type { Theme } from "@/app/lib/palettes";
import { cvDocuments, type CvDocumentId } from "@/app/lib/documents";
import { projects, type Project } from "@/app/lib/projects";
import {
  bootLines,
  runShellCommand,
  type PowerAction,
  type ShellLine,
} from "@/app/lib/terminal";

import { Shell } from "./Shell";
import { DeskScenery, WallScenery } from "./RoomScenery";
import { CableScene } from "./CableScene";
import { DeskScene, type DeskAnchors } from "./DeskScene";
import { Keyboard } from "./Keyboard";
import { GamingMouse } from "./GamingMouse";
import { BootScreen, BOOT_DURATION_MS, BOOT_REDUCED_MS } from "./BootScreen";
import { ShutdownScreen, SHUTDOWN_DURATION_MS } from "./ShutdownScreen";
import { KaliMark } from "./KaliMark";
import { KaliPanel } from "./KaliPanel";
import { FileManager, type FilesPath } from "./FileManager";
import { KeyLegend } from "./KeyLegend";
import { MonitorScene } from "./MonitorScene";
import { ParticleWave } from "./ParticleWave";
import { PdfViewer } from "./PdfViewer";
import { ProjectViewer } from "./ProjectViewer";
import { TowerLegend } from "./TowerLegend";
import { TowerScene, type TowerAction } from "./TowerScene";
import { WindowControls } from "./WindowControls";
import { desktopCopy, type DesktopCopy } from "@/app/lib/desktop";
import { cn } from "@/app/lib/utils";

import "./tower.css";
import "./station.css";

/** How long a pressed key stays lit, in ms. Long enough to read as a keystroke,
 *  short enough that fast typing does not smear into one lit block. */
const KEY_LINGER = 130;

/** How long a control lit by the legend stays pressed. Matches `KEY_LINGER`: the
 *  legend's rows are keyboard keys too, and a cap that holds its glow three times
 *  longer than the one above it reads as a stuck key rather than a press. */
const CONTROL_LINGER = 130;

/** The keyboard's share of the station's height.
 *
 *  The keyboard has to be allowed to grow, and the only thing that can stop it is the
 *  height it competes for with the monitor: both live in the same fixed-height
 *  column, so every pixel the slab claims is a pixel the stage gives up and the
 *  monitor is refitted into what is left. A share rather than a pixel budget, because
 *  the station is `100dvh` — a fixed budget would be right on exactly one screen.
 *
 *  0.34 rather than 0.4: the slab is now fitted to the monitor's width instead of the
 *  whole desk's, which takes most of the shrink on its own, and this finishes it. The
 *  gap that opens between the monitor's base and the top edge of the keys is not slack —
 *  it is where the cable runs, and a keyboard that reaches the monitor's foot leaves the
 *  cable nowhere to be seen. */
const KEYBOARD_HEIGHT_SHARE = 0.34;

/** How much of the monitor's width the keyboard is allowed to be, as a share of the
 *  desk the monitor has left.
 *
 *  0.94, up from 0.9, and it is the number that answers "the keyboard is too small".
 *  The slab is drawn at the full width of the budget it is given and scaled down when
 *  that budget is the smaller of the two, so this share *is* the keyboard's drawn size:
 *  measured at 1440x900 it moved the slab from 396px across to 440px, against a screen
 *  panel that draws 422px — so the board now stands a little proud of the machine above
 *  it, which is what a real keyboard does on a desk this size and what 0.9 never quite
 *  managed to look like.
 *
 *  Not 1. At 1 the slab comes out as wide as the panel, and the desk reads as a stack of
 *  two equal-width slabs rather than as a machine with a board in front of it. */
const KEYBOARD_WIDTH_SHARE = 0.94;

/** The largest the slab is ever drawn, as a multiple of its authored size.
 *
 *  1.15, up from 1. It binds on wide desks rather than on short ones: at 1440x900 the
 *  width share above is the constraint and the slab draws at 1.11, while at 1920x1080
 *  the share would allow 1.29 and this stops it at 455px across against a panel drawing
 *  663px. Sixty-nine percent is where the board still reads as a keyboard rather than as
 *  a plank; the old ceiling of 1 meant a desk wider than 1440 simply stopped growing it.
 *
 *  The ceiling was 1 for a second reason, and that reason was the bug: the row used to
 *  reserve exactly the slab's *authored* height, because a CSS transform does not feed
 *  back into layout. At any ceiling above 1 the slab was therefore drawn taller than the
 *  space holding it, and since the origin was its bottom edge all of the overflow went
 *  upwards, over the monitor's base. The fit now measures the slab and hands the row the
 *  size the slab is actually drawn at (see `.station__keyboard-fit`), so growing into the
 *  height budget no longer collides with the machine above. */
const KEYBOARD_MAX_SCALE = 1.15;

/** The number of fan steps the case offers. Held here rather than in `TowerScene`
 *  because both halves of the control own one end of it: the scene spins by it and
 *  the legend counts through it, and a count declared in only one of them is a count
 *  that is right once. */
const FAN_STEPS = 3;

/** How long the shutdown sequence runs before the monitor loses power, in ms. The
 *  timeline that fills it lives in `ShutdownScreen.tsx` / `shutdown.css`, and imports
 *  `SHUTDOWN_DURATION_MS` from there; the timer here just knows when to cut power. */

/** How long the screen and the power lamp stay dead during a restart, in ms.
 *
 *  The lamp rides the same ramp the scene gives the panel, so it needs a beat to fall
 *  dark before the power-on can light it again — this is that beat, and it is the
 *  difference between "restart" and "the screen flickered". */
const RESTART_DARK_MS = 1300;

/** How long a `reboot` / `shutdown` message sits on the glass before the machine acts
 *  on it. The command has to be read before its result replaces it, or the terminal
 *  looks like it did nothing and then died for no reason. */
const COMMAND_ACTION_MS = 800;

/** Where the glass is in its power-on walk.
 *
 *  `off` is a dark screen, `booting` is the BootScreen sequence, and `ready` is the
 *  desktop. Kept beside `powered` rather than folded into a boolean because the two
 *  answer different questions: `powered` is whether the machine is on at all, and this
 *  is how far into being on it has got. A monitor switched off mid-boot simply drops
 *  back to `off`, which is why this is state and not a `powered && something`. */
type BootPhase = "off" | "booting" | "ready";

/** A window on the glass.
 *
 *  Three separate facts rather than one, because the three controls on the title bar are
 *  three different things and folding them together would make two of the buttons lie:
 *
 *    open       the window exists and keeps its state — its folder, its size.
 *    minimized  it exists but is hidden. This is what Minimize does, and it is why the
 *               panel's folder control can bring it back exactly as it was.
 *    maximized  it fills the desktop under the panel rather than sitting inset.
 *
 *  Closing from the title bar is `open: false`, which unmounts the window and is the only
 *  thing that resets it; minimizing leaves it mounted. */
interface DesktopWindow {
  open: boolean;
  minimized: boolean;
  maximized: boolean;
}

const CLOSED_WINDOW: DesktopWindow = { open: false, minimized: false, maximized: false };

export interface MonitorStationProps {
  language: Language;
  theme: Theme;
  /** Whether the station is live. Turning it off also cuts the machine's power. */
  active: boolean;
  /** The hero's current magnification, as a whole multiple of the front page, for the
   *  masthead's readout. A number rather than a string so the desk owns the `×` and
   *  the scale range it is printed against; a number rather than a per-frame float
   *  because the hero quantises it — see `depthFigureFor`. */
  depth: number;
  /** Set by the station when the current keypress is a camera dive rather than typing.
   *
   *  Two components want `w` and `s` and only one can have them. The station decides,
   *  because it is the one holding the command line, and publishes the verdict here so
   *  the hero's zoom handler reads it instead of guessing from its own state. A ref
   *  because the keydown handler closes over the mount. */
  diveWanted: RefObject<boolean>;
  /** Asks the hero to move the camera in to the screen.
   *
   *  Fired by the machine's own switches — the ring on the case and the dial on the
   *  keyboard, which are one switch with two faces — and by nothing else. Pressing a
   *  physical power button is a request to *use* the machine, so it wakes the monitor
   *  and takes the camera in to it in one gesture.
   *
   *  A callback and not a ref because this is an event, not a permission: the hero owns
   *  the camera, and the one thing the station can be certain of is that it wants the
   *  camera moved. How far, and with what easing, is the hero's answer to give. */
  onEnterTerminal: () => void;
  /** The other end of `onEnterTerminal`: the session menu's Log Out asks the camera to
   *  pull back to the front page, ending the visit to the desk the way logging out
   *  ends a session. */
  onExitTerminal: () => void;
}

export function MonitorStation({
  language,
  theme,
  active,
  depth,
  diveWanted,
  onEnterTerminal,
  onExitTerminal,
}: MonitorStationProps) {
  const [powered, setPowered] = useState(false);

  /* How far into power-on the machine is, and the two windows on the glass. Both are
   * seeded on the power edge (see `togglePower`) rather than in an effect, for the same
   * reason the shell is: an effect would be a render that exists only to copy one piece
   * of state into another. */
  const [bootPhase, setBootPhase] = useState<BootPhase>("off");
  const [terminalWindow, setTerminalWindow] = useState<DesktopWindow>(CLOSED_WINDOW);

  /* The shutdown animation, as one flag. While it is up the desktop is covered by a
   *  blinking mark and the machine has not yet lost power — the sequence ends by
   *  switching power off, which is the state that already means "dark screen with the
   *  mark on it". A phase of the glass, so it lives beside `bootPhase`. */
  const [shuttingDown, setShuttingDown] = useState(false);

  /* The file manager is a window, not a place, so it opens and closes without touching
   * the session — the shell underneath is exactly as it was. `filesPath` lives here
   * rather than inside the window because the desktop's bin opens the same window at a
   * different path, and the station is the one place that decides which. */
  const [fileWindow, setFileWindow] = useState<DesktopWindow>(CLOSED_WINDOW);
  const [filesPath, setFilesPath] = useState<FilesPath>(null);

  /* The document viewer: a third window, opened from a PDF row in the CV folder. It holds
   *  which file is on the glass and its own window facts, so it minimizes and maximizes
   *  the way the other two do — and closing it leaves the folder it was opened from
   *  exactly where it was. */
  const [viewerWindow, setViewerWindow] = useState<DesktopWindow>(CLOSED_WINDOW);
  const [viewingDocument, setViewingDocument] = useState<CvDocumentId | null>(null);

  /* The site viewer: the same shape as the document viewer, opened from a Project's
   * detail panel. It holds which project is on the glass so what the window shows "is"
   * its own state, and a project can stay open over a folder that closes. */
  const [projectWindow, setProjectWindow] = useState<DesktopWindow>(CLOSED_WINDOW);
  const [viewingProject, setViewingProject] = useState<Project["id"] | null>(null);

  /* The case's fan speed, and the two halves of the legend's intent: which control the
   * reader is pointing at or has focused, and which one they just pushed. Both go to
   * `TowerScene` rather than staying here, because the control they describe is on the
   * case and nowhere else — a hover that lit a word in the rail and nothing else
   * would be a hover on half the story. */
  const [fanStep, setFanStep] = useState(0);
  const [towerHover, setTowerHover] = useState<TowerAction | null>(null);
  const [towerPress, setTowerPress] = useState<TowerAction | null>(null);

  const [liveKey, setLiveKey] = useState<string | null>(null);
  const [screenElement, setScreenElement] = useState<HTMLElement | null>(null);
  const [sceneFailed, setSceneFailed] = useState(false);
  const [towerFailed, setTowerFailed] = useState(false);
  /* Separate from the other two even though all three mean the same thing — no WebGL —
   * because each one removes a *different* object, and a machine that lost its body and
   * a desk that lost its surface are not the same degradation. It also cannot share their
   * state: the desk is the fallback for neither, and having one flag remove all three at
   * once would take the terminal away from a browser that could have drawn the desk. */
  const [deskFailed, setDeskFailed] = useState(false);
  /* The cable is its own context as well, so it can fail on its own. Losing it is the
   * smallest degradation of the four: the desk is still a desk without the run between
   * the machines, it is only a desk with two machines on it. */
  const [cableFailed, setCableFailed] = useState(false);
  const [recenterToken, setRecenterToken] = useState(0);

  /* The shell.
   *
   *  The station owns the line being typed rather than the shell component, because
   *  the station is already listening for the keys: it has to, to light the caps and
   *  to own Escape. Two owners of one line of text is one owner too many. */
  const [lines, setLines] = useState<readonly ShellLine[]>([]);
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<readonly string[]>([]);

  /* Where the up-arrow currently is in the history, or null when the user has typed
   *  away from it. A ref rather than state because recalling a command is not a
   *  render-worthy change on its own — it exists to be read by the next keypress, and
   *  putting it in state would mean computing the recalled text inside a state
   *  updater, which is where side effects go to hide. */
  const historyIndex = useRef<number | null>(null);

  const stationRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const keyboardRowRef = useRef<HTMLDivElement | null>(null);
  const keyboardFitRef = useRef<HTMLDivElement | null>(null);
  const cableSvgRef = useRef<SVGSVGElement | null>(null);
  const cableRef = useRef<SVGPathElement | null>(null);
  /* Where the monitor's stand meets the desk, in viewport pixels, as reported by the
   * scene that draws it. A ref because it changes with the window and with nothing
   * else: no render on this desk needs to know where the cable is attached, only the
   * cable's own draw does. */
  const footPointRef = useRef<{ x: number; y: number } | null>(null);
  /* The monitor's neck, the same way — the point the display cable climbs to. */
  const neckPointRef = useRef<{ x: number; y: number } | null>(null);
  /* The same measurements, gathered for the two consumers that draw against them rather
   *  than against a fixed box: the desk surface and the cable that joins the machines.
   *
   *  Kept here rather than in each consumer because this component is the only place that
   *  has all of them open at once, and mutated in place for the same reason `footPointRef`
   *  is — these move with the window and with nothing else, and a render per resize is a
   *  render nobody asked for. */

  const deskAnchorsRef = useRef<DeskAnchors>({
    monitorFoot: null,
    monitorNeck: null,
    keyboardLeft: null,
    keyboardRight: null,
    towerLeft: null,
    towerRight: null,
  });

  const lingerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const controlTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /* One timer for the power sequences (the blink before a shutdown, the dark beat
   *  before a restart) and one for the delay between a `reboot`/`shutdown` command and
   *  the sequence it asks for. Two, not one, so a second command cannot cancel a
   *  sequence already in flight. */
  const powerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const actionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* Power is derived, not reset.
   *
   * Tempting shape: an effect that calls `setPowered(false)` when `active` goes
   * false. It cascades a render to express something already known, and it throws
   * away the user's state for no reason — diving a little way out and back in
   * should find the monitor as they left it, not reset.
   *
   * The ring only exists while `active` — `MonitorReveal` unmounts the whole
   * desk otherwise — so the toggle can never fire on a desk that is not open.
   * Deriving is therefore enough, and nothing can get stuck on. */
  const isPowered = active && powered;

  // --- Power -----------------------------------------------------------------
  // The ring on the case is the whole power control, in both directions, and the dial
  // on the keyboard is that same switch seen from the other side of the desk. Escape
  // was it as well, once. It is not any more, in either direction: a key that also
  // types should not be able to end a session in the middle of a word, and a machine
  // switched at its own buttons is a machine that reads as a machine.
  //
  // The boot is seeded here rather than in an effect on `isPowered`. An effect would
  // be a render that exists only to copy `powered` into four other pieces of state,
  // and the codebase has already been bitten by that shape once. Seeding on the
  // toggle keeps it on the edge it describes, so the shell re-boots exactly once per
  // power-on — and only on a power-on, so diving out and back in finds the machine
  // as it was left, scrollback and all.
  //
  // The two directions are named rather than one toggle, because a restart is
  // "off, then on" and has to be able to say each half on its own.
  const turnOff = useCallback(() => {
    /* Switching off closes whatever was on the glass and drops the boot back to the
       start, so the next power-on plays the sequence again. The scrollback is *not*
       cleared: diving out and back in, or a power cycle, should find the session as it
       was left — only the windows and the boot are per-power. */
    setPowered(false);
    setBootPhase("off");
    setTerminalWindow(CLOSED_WINDOW);
    setFileWindow(CLOSED_WINDOW);
    setFilesPath(null);
    setViewerWindow(CLOSED_WINDOW);
    setViewingDocument(null);
    setProjectWindow(CLOSED_WINDOW);
    setViewingProject(null);
  }, []);

  const turnOn = useCallback(() => {
    setPowered(true);
    setBootPhase("booting");
    setLines(bootLines(language));
    setInput("");
    setHistory([]);
    historyIndex.current = null;
  }, [language]);

  const togglePower = useCallback(() => {
    if (powered) {
      turnOff();
    } else {
      turnOn();
    }
  }, [powered, turnOff, turnOn]);

  /* The desktop arrives when the sequence ends, and the sequence's length is the one
   * thing JavaScript has to know about it. The timer lives here rather than in
   * `BootScreen` so the screen stays a pure drawing of a state it is handed — and so a
   * power-off mid-boot cancels the hand-over simply by moving `bootPhase` off
   * `booting`, which tears this effect down. */
  useEffect(() => {
    if (bootPhase !== "booting") return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const id = setTimeout(
      () => setBootPhase("ready"),
      reduced ? BOOT_REDUCED_MS : BOOT_DURATION_MS,
    );

    return () => clearTimeout(id);
  }, [bootPhase]);

  /* The two ways the machine goes down, as named actions rather than as power toggles.
   *
   *  Shut Down blinks the mark first — the thing a screen does while it is closing
   *  everything — and only then drops power, which is what leaves the standby mark on
   *  the dark glass. Restart is the other shape: power out (the panel and the lamp fall
   *  dark for a beat), then power straight back in, which re-seeds the boot and plays
   *  the same wipe a cold start does. Both are no-ops when the machine is already off,
   *  and both refuse to stack on a sequence still in flight. */
  const requestShutdown = useCallback(() => {
    if (!powered || shuttingDown) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      turnOff();

      return;
    }

    setShuttingDown(true);

    if (powerTimer.current !== null) clearTimeout(powerTimer.current);
    powerTimer.current = setTimeout(() => {
      setShuttingDown(false);
      turnOff();
    }, SHUTDOWN_DURATION_MS);
  }, [powered, shuttingDown, turnOff]);

  const requestRestart = useCallback(() => {
    if (!powered || shuttingDown) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    turnOff();

    if (powerTimer.current !== null) clearTimeout(powerTimer.current);
    powerTimer.current = setTimeout(turnOn, reduced ? 220 : RESTART_DARK_MS);
  }, [powered, shuttingDown, turnOff, turnOn]);

  /* The sequences own timers that outlive the render that started them, so they have to
   *  be cancelled when the desk goes away — a restart mid-dive would otherwise light a
   *  machine nobody is looking at. */
  useEffect(
    () => () => {
      if (powerTimer.current !== null) clearTimeout(powerTimer.current);

      if (actionTimer.current !== null) clearTimeout(actionTimer.current);
    },
    [],
  );

  /* The terminal window's controls, seeded closed on every power-on: a machine starts at
   * its desktop, not at a shell.
   *
   *  The panel's launcher toggles *visibility* — the same thing Minimize does — so a
   *  window that was minimized comes back with its size and history intact, and only the
   *  title bar's Close throws it away. Opening a window that was fully closed starts it
   *  fresh, at its normal size. */
  const toggleTerminal = useCallback(() => {
    setTerminalWindow((window) =>
      window.open
        ? { ...window, minimized: !window.minimized }
        : { open: true, minimized: false, maximized: false },
    );
  }, []);

  const minimizeTerminal = useCallback(() => {
    setTerminalWindow((window) => ({ ...window, minimized: true }));
  }, []);

  const maximizeTerminal = useCallback(() => {
    setTerminalWindow((window) => ({ ...window, maximized: !window.maximized }));
  }, []);

  const closeTerminal = useCallback(() => {
    setTerminalWindow(CLOSED_WINDOW);
  }, []);

  /* The file manager's twin. Its Close also clears the path, so reopening from the panel
   * starts at Home rather than wherever the last visitor left it; minimizing keeps it,
   * which is the difference between the two buttons made visible. */
  const toggleFiles = useCallback(() => {
    setFileWindow((window) =>
      window.open
        ? { ...window, minimized: !window.minimized }
        : { open: true, minimized: false, maximized: false },
    );
  }, []);

  const minimizeFiles = useCallback(() => {
    setFileWindow((window) => ({ ...window, minimized: true }));
  }, []);

  const maximizeFiles = useCallback(() => {
    setFileWindow((window) => ({ ...window, maximized: !window.maximized }));
  }, []);

  const closeFiles = useCallback(() => {
    setFileWindow(CLOSED_WINDOW);
    setFilesPath(null);
  }, []);

  /* The bin on the desktop opens the file manager at Trash. It reuses the one window
   * rather than adding a second, so there is still exactly one file manager — the bin is
   * just another place it can be told to show. */
  const openTrash = useCallback(() => {
    setFilesPath("Trash");
    setFileWindow((window) => ({ ...window, open: true, minimized: false }));
  }, []);

  /* The document viewer's controls. Opening is its own action because the file is a
   *  parameter: it comes in from the folder row that was clicked, and it resets the
   *  window to a fresh, un-maximized one so a PDF is never first seen through the state
   *  the last PDF was left in. */
  const openDocument = useCallback((id: CvDocumentId) => {
    setViewingDocument(id);
    setViewerWindow({ open: true, minimized: false, maximized: false });
  }, []);

  const minimizeViewer = useCallback(() => {
    setViewerWindow((window) => ({ ...window, minimized: true }));
  }, []);

  const maximizeViewer = useCallback(() => {
    setViewerWindow((window) => ({ ...window, maximized: !window.maximized }));
  }, []);

  const closeViewer = useCallback(() => {
    setViewerWindow(CLOSED_WINDOW);
  }, []);

  /* The site viewer's controls, twin to the document viewer's. Opening takes the project
   * itself — a parameter that comes in from the detail panel — and starts a fresh,
   * un-maximized window so a site is never first seen through the state the last one was
   * left in. */
  const openProject = useCallback((project: Project) => {
    setViewingProject(project.id);
    setProjectWindow({ open: true, minimized: false, maximized: false });
  }, []);

  const minimizeProject = useCallback(() => {
    setProjectWindow((window) => ({ ...window, minimized: true }));
  }, []);

  const maximizeProject = useCallback(() => {
    setProjectWindow((window) => ({ ...window, maximized: !window.maximized }));
  }, []);

  const closeProject = useCallback(() => {
    setProjectWindow(CLOSED_WINDOW);
  }, []);

  /* What the panel and the case read: "is the window actually on the glass". A minimized
   * window is open but not visible, and a launcher that stayed pressed for it would be
   * reporting the wrong thing. */
  const terminalOpen = terminalWindow.open && !terminalWindow.minimized;
  const filesOpen = fileWindow.open && !fileWindow.minimized;

  /* The case's three controls, as one dispatcher.
   *
   *  Two of the three are aliases of state that already exists — the ring and the
   *  keyboard's dial are one power switch, the eject is the Kali panel's folder — and
   *  writing that mapping in one place is the whole point. The third, the fan, has no equivalent anywhere
   *  else on this desk, which is why it is the only one of them that exists as its
   *  own state.
   *
   *  `pressed` is a one-shot that decays on a timer rather than being set from the
   *  case's raycast: the case cannot report a release, because a pointerup outside
   *  the button after a drag out of it is indistinguishable from a release anywhere
   *  else on the desk. Timing it is the honest answer, and `CONTROL_LINGER` is the
   *  same figure the keycaps use so the two halves of the keyboard do not disagree
   *  about how long a press lasts. */
  const runTowerAction = useCallback(
    (action: TowerAction) => {
      if (action === "power") {
        /* Switching *on* from the case also takes the camera in, so the button does the
         * one thing a person pressing a power button is actually asking for. Switching
         * off does not pull the camera back out: leaving the desktop to switch the
         * machine off would take the reader's view with it, and the shell survives the
         * round trip either way (`togglePower` keeps the session). */
        if (!powered) onEnterTerminal();

        togglePower();

        return;
      }

      if (action === "drive") {
        toggleFiles();

        return;
      }

      setFanStep((step) => (step + 1) % FAN_STEPS);
    },
    [powered, onEnterTerminal, togglePower, toggleFiles],
  );

  const flashTowerAction = useCallback((action: TowerAction) => {
    setTowerPress(action);

    if (controlTimer.current !== null) clearTimeout(controlTimer.current);
    controlTimer.current = setTimeout(() => setTowerPress(null), CONTROL_LINGER);
  }, []);

  /* The legend's own activation path.
   *
   *  Enter and Space already arrive as a `click` on a real `<button>`, so the only
   *  thing this has to add is the decay the raycast cannot report. Two paths into one
   *  action, and they deliberately converge on `runTowerAction` rather than each
   *  writing the state itself. */
  const onTowerAction = useCallback(
    (action: TowerAction) => {
      flashTowerAction(action);
      runTowerAction(action);
    },
    [flashTowerAction, runTowerAction],
  );

  const flashKey = useCallback((key: string) => {
    setLiveKey(key);

    if (lingerTimer.current !== null) clearTimeout(lingerTimer.current);
    lingerTimer.current = setTimeout(() => setLiveKey(null), KEY_LINGER);
  }, []);

  const submit = useCallback(() => {
    const command = input.trim();

    // A bare Enter is not an error in a shell; it just moves the prompt down a line.
    // Nothing is echoed, which is exactly what pressing it on an empty line does.
    if (command === "") return;

    const response = runShellCommand(command, language, history);

    setLines((current) =>
      // `clear` genuinely clears. The banner is history, not chrome, so it goes with
      // everything else and comes back when the machine is next powered on.
      response.kind === "clear" ? [] : [...current, { kind: "command", text: command }, ...response.lines],
    );

    /* `reboot` and `shutdown` print their warning and then go down, on a delay so the
       reader sees why the machine left. The delay is separate from the sequence's own
       timer: this one is cancelled if the desk closes, the sequence's is the sequence. */
    if (response.kind === "action") {
      const action: PowerAction = response.action;

      if (actionTimer.current !== null) clearTimeout(actionTimer.current);
      actionTimer.current = setTimeout(() => {
        if (action === "reboot") {
          requestRestart();
        } else {
          requestShutdown();
        }
      }, COMMAND_ACTION_MS);
    }

    setHistory((current) => [...current, command]);
    setInput("");
    historyIndex.current = null;
  }, [input, language, history, requestRestart, requestShutdown]);

  /** Step through the history the way the arrow keys do in bash. */
  const recall = useCallback(
    (direction: -1 | 1) => {
      if (history.length === 0) return;

      const from = historyIndex.current;

      const next = from === null
        ? (direction === -1 ? history.length - 1 : null)
        : from + direction;

      if (next === null) {
        historyIndex.current = null;
        setInput("");

        return;
      }

      /* Down past the newest command is the empty line, not the newest command again.
         Clamping that direction would make the arrows feel broken: up, down, and
         nothing happens. Bash puts the pointer one past the end and draws a blank
         prompt there. */
      if (direction === 1 && next >= history.length) {
        historyIndex.current = null;
        setInput("");

        return;
      }

      // Clamped rather than refused: walking off the *top* of the history repeats the
      // first command, which is what bash does, and refusing would strand the arrow.
      const clamped = Math.min(Math.max(next, 0), history.length - 1);

      historyIndex.current = clamped;
      setInput(history[clamped] ?? "");
    },
    [history],
  );

  useEffect(() => {
    if (!active) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      /* Escape is not a control here, in either direction: the ring on the case is
       * that switch. It is swallowed rather than passed on, so the browser's own
       * Escape cannot reach a desk that is a picture of a machine, and so the esc cap
       * does not light as though something had happened. */
      if (event.key === "Escape") {
        event.preventDefault();

        return;
      }

      /* Whether this key belongs to the camera or to the shell.
       *
       *  `w` and `s` dive the hero, and they are also letters, so the rule has to be
       *  that a camera key only stays a camera key while the command line is not in
       *  use — and gives it back the moment it is. Otherwise powering the machine on
       *  would silently take `w` and `s` away, which is not a trade anybody agreed to.
       *
       *  The arrows are the same conflict wearing a hat: `ArrowUp` is both bash's
       *  history-walk and the hero's zoom-in, and letting both run turned a single
       *  keypress into a camera move the reader did not ask for. So the arrows follow
       *  the same rule as the letters — the command line takes them back while it is
       *  open.
       *
       *  The keys stop here, but the wheel does not need this seam: it is not a key,
       *  so there is nothing on it to type with. Whether a notch scrolls a window or
       *  moves the camera is decided in `Hero` by where the pointer is — over the
       *  glass it belongs to the machine, and off it, on a rail or the keyboard, it
       *  is the room's again. */
      const isCameraKey = !isPowered;

      diveWanted.current = !isPowered || isCameraKey;

      // Any other key lights a cap and squares the monitor up, so typing reads as
      // typing on *this* machine rather than as typing into a void.
      flashKey(capFor(event));
      setRecenterToken((token) => token + 1);

      if (!isPowered) return;

      /* A keystroke aimed at a shell that is not on the glass opens it first. The
       * keyboard is the terminal's own input device, and a keypress that landed in a
       * hidden window would be a keystroke the reader typed and could not see. Only
       * the keys the shell actually consumes count — a camera key or a modifier is not
       * a reason to put a window up. */
      if (!terminalOpen) {
        const shellKey =
          event.key === "Enter" ||
          event.key === "Backspace" ||
          event.key === "ArrowUp" ||
          event.key === "ArrowDown" ||
          event.key.length === 1;

        if (shellKey) {
          setTerminalWindow((window) => ({ ...window, open: true, minimized: false }));
        }
      }

      if (event.key === "Enter") {
        event.preventDefault();
        submit();

        return;
      }

      if (event.key === "Backspace") {
        event.preventDefault();
        setInput((current) => current.slice(0, -1));
        historyIndex.current = null;

        return;
      }

      if (event.key === "ArrowUp" || event.key === "ArrowDown") {
        event.preventDefault();
        recall(event.key === "ArrowUp" ? -1 : 1);

        return;
      }

      // Everything else that reaches the line is a printable character. Length is the
      // test because it is the only one that distinguishes "a" from "Enter" without
      // enumerating every named key on the keyboard, and every named key is either
      // handled above or has no business in a command line.
      if (event.key.length === 1) {
        event.preventDefault();
        setInput((current) => current + event.key);
        historyIndex.current = null;
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);

      diveWanted.current = false;

      if (lingerTimer.current !== null) clearTimeout(lingerTimer.current);
    };
  }, [active, isPowered, terminalOpen, flashKey, submit, recall, diveWanted]);

// --- Keyboard fit ----------------------------------------------------------
  // The keyboard is one object that gets smaller, never one that reflows: a
  // keyboard whose rows wrapped would stop being the keyboard it is imitating. So
  // its metrics are fixed in rem and the whole slab is scaled to fit the width it is
  // given.
  //
  // It can also grow. The width budget is the stage width and the height budget is a
  // share of the station's viewport height, so the slab scales up to fill the desk
  // without crowding the monitor off it.
  //
  // The fit is handed the box the slab is *drawn* at rather than the box it is
  // authored at, because a transform does not feed back into layout: laying the row out
  // against the authored size is what made a slab drawn at more than 1:1 overflow its
  // own row, upwards, over the monitor's base. See `KEYBOARD_MAX_SCALE`.
  const [keyboardFit, setKeyboardFit] = useState({ scale: 1, width: 0, height: 0 });

  useEffect(() => {
    const station = stationRef.current;
    const row = keyboardRowRef.current;
    const fit = keyboardFitRef.current;

    if (!station || !row || !fit) return;

    /* The slab itself, not the fit element.
     *
     *  The fit element is now sized in JS, so its own box is the answer to the question
     *  rather than the source of it: reading `offsetWidth` back off it would measure the
     *  scale from last time and converge on the wrong number one resize later. The slab
     *  is the one box on this desk that never changes size. */
    const slab = fit.querySelector<HTMLElement>(".keyboard__slab");

    if (!slab) return;

    const measure = () => {
      /* The width the monitor's half of the desk has, not the width of the whole desk.
       *
       *  The row spans the station so the slab can centre itself, and it carries the
       *  stage's own `padding-left` so that centring lands under the monitor instead of
       *  half a lane to its left. `clientWidth` includes padding, so the slab's budget is
       *  what remains after the lane — the same number the stage hands the monitor's
       *  scene, read the same way the cable reads it. */
      const lane = Number.parseFloat(getComputedStyle(row).paddingLeft) || 0;
      const availableWidth = (row.clientWidth - lane) * KEYBOARD_WIDTH_SHARE;
      const naturalWidth = slab.offsetWidth;

      if (availableWidth <= 0 || naturalWidth <= 0) return;

      const maxHeight = station.clientHeight * KEYBOARD_HEIGHT_SHARE;
      const naturalHeight = slab.offsetHeight;

      const scaleFromWidth = availableWidth / naturalWidth;
      const scaleFromHeight = naturalHeight <= 0 ? 1 : maxHeight / naturalHeight;

      const next = Math.min(KEYBOARD_MAX_SCALE, scaleFromWidth, scaleFromHeight);

      if (next < 0.1) return;

      setKeyboardFit((current) => {
        const width = Math.round(naturalWidth * next);
        const height = Math.round(naturalHeight * next);

        if (current.width === width && current.height === height) return current;

        return { scale: next, width, height };
      });
    };

    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(station);
    observer.observe(row);

    return () => observer.disconnect();
  }, []);

  // --- Cable -----------------------------------------------------------------
  // Measured rather than hard-coded, because every anchor on it moves with the window:
  // the gap between the monitor's base and the keyboard's top edge changes with every
  // viewport, and the monitor's drawn size is decided inside a perspective camera.
  // Written straight to the path's `d` attribute, so dragging a window never re-renders
  // the scene.
  //
  // A callback rather than an effect closure because two different things have to be
  // able to ask for it: the observer below, and the scene reporting where it put the
  // stand. It reads nothing but refs, so there is nothing to depend on.
  const drawCables = useCallback(() => {
    const svg = cableSvgRef.current;
    const stage = stageRef.current;
    const fit = keyboardFitRef.current;
    const path = cableRef.current;

    if (!svg || !stage || !fit || !path) return;

    /* The SVG's own origin, not the viewport's.
     *
     *  A path's coordinates resolve against the element it lives in, and this one is
     *  inset inside the rig — a box that starts some 350px in from the left of the page.
     *  Handing it viewport coordinates drew the whole cable up and to the left of both
     *  of the objects it was meant to join, which is what left the monitor with a cable
     *  sprouting out of the middle of the case and none at its foot. */
    const svgBox = svg.getBoundingClientRect();
    const stageBox = stage.getBoundingClientRect();

    /* The slab, not the row.
     *
     *  The row is a full-desk-wide box whose top edge is the top of the gap above the
     *  keyboard, so a cable measured to it ends in mid-air above the board — and at its
     *  centre x, which is half a lane to the left of the monitor anyway. The fit element
     *  is the slab's drawn box, so the run lands on the keyboard's back edge, under the
     *  middle of it, which is where a cable is plugged in. */
    const keyboardBox = fit.getBoundingClientRect();

    /* The same box, published for the desk.
     *
     *  The desk is a separate scene with no access to this measurement, and it needs the
     *  slab's *front* edge rather than the cable's back one: a desk surface is placed
     *  where the keyboard's front edge is, so that the two are always touching rather than
     *  the keyboard being somewhere in front of a board it does not stand on. Written here
     *  because this function already has the box open and runs on every resize that could
     *  have moved it. */
    const anchors = deskAnchorsRef.current;

    anchors.monitorFoot = footPointRef.current;
    anchors.monitorNeck = neckPointRef.current;
    anchors.keyboardLeft = { x: keyboardBox.left, y: keyboardBox.bottom };
    anchors.keyboardRight = { x: keyboardBox.right, y: keyboardBox.bottom };

    /* The stage's *content* box, not its border box.
     *
     *  The stage reserves the case's lane as a left padding, so the monitor is fitted
     *  and centred in what is left of it — which is half a lane right of the stage's
     *  own centre. Anchoring the cable to the border box's centre would leave it
     *  sprouting from beside the case rather than from behind the monitor's base, and
     *  the error is worst at exactly the wide layouts where the lane is widest.
     *
     *  Read from the computed style rather than mirrored in JS: `--tower-lane` is a
     *  clamp() over a percentage, so its resolved value is a function of the window
     *  and there is no version of it that can be written down here and stay right. */
    const lane = Number.parseFloat(getComputedStyle(stage).paddingLeft) || 0;
    const stageWidth = stageBox.width - lane;

    /* Where the stand meets the desk, as projected by the scene.
     *
     *  It used to be guessed at as a fixed fraction of the stage's height, and the guess
     *  was 80px low at 1440x900: the cable started in clear air on the desk with the
     *  monitor nowhere near it, which no amount of curve tuning can rescue. The scene
     *  knows where its own base is; until it has said — the first paint, and any desk
     *  without WebGL — this falls back to the stage's bottom edge, which is the one
     *  guess that is never further away than the desk the cable is lying on. */
    const foot = footPointRef.current;
    const fromX = foot?.x ?? stageBox.left + lane + stageWidth / 2;
    const fromY = foot?.y ?? stageBox.bottom;
    const toX = keyboardBox.left + keyboardBox.width / 2;
    const toY = keyboardBox.top;

    const gap = Math.max(12, toY - fromY);
    // Lean it to one side so it reads as a cable that was plugged in, rather than
    // as a line drawn between two points.
    const lean = Math.min(gap * 0.7, stageWidth * 0.08);
    const droop = gap * 0.85;
    // One origin for every point on the path, because four hand-subtracted offsets are
    // four chances to miss one.
    const ox = svgBox.left;
    const oy = svgBox.top;

    path.setAttribute(
      "d",
      `M ${fromX - ox} ${fromY - oy} C ${fromX + lean - ox} ${fromY + droop - oy}, ${toX - lean - ox} ${toY - droop * 0.2 - oy}, ${toX - ox} ${toY - oy}`,
    );

    /* The case-to-monitor run is not drawn here.
     *
     *  It was, as a stroked path, and it was the one thing on this desk that could not be
     *  made to look right here: a cable is a tube, not a line, and this SVG has no width
     *  and no light to give one. It is real `TubeGeometry` now, in `CableScene`, between
     *  the case's published corner and the monitor's published neck. */
  }, []);

  useEffect(() => {
    const stage = stageRef.current;
    const row = keyboardRowRef.current;

    if (!stage || !row) return;

    drawCables();

    const observer = new ResizeObserver(drawCables);
    observer.observe(stage);
    observer.observe(row);

    return () => observer.disconnect();
  }, [drawCables]);

  /* The slab is sized by React and the cable is not, so the two land a frame apart:
   * one more pass on the next frame redraws the run against the box the slab ended up
   * in rather than the one it was leaving. */
  useEffect(() => {
    const raf = requestAnimationFrame(drawCables);

    return () => cancelAnimationFrame(raf);
  }, [keyboardFit, drawCables]);

  const onFootPoint = useCallback(
    (point: { x: number; y: number }) => {
      footPointRef.current = point;
      deskAnchorsRef.current.monitorFoot = point;
      drawCables();
    },
    [drawCables],
  );

  /* The monitor's neck, read by the 3D cable. No redraw here: the cable polls the anchors
   *  on its own frame, so this is a write and nothing more. */
  const onNeckPoint = useCallback((point: { x: number; y: number }) => {
    neckPointRef.current = point;
    deskAnchorsRef.current.monitorNeck = point;
  }, []);

  /* The case's base, for the desk and for the cable.
   *
   *  No redraw from here on purpose: both consumers read these anchors on their own
   *  frames — the 3D cable polls them every frame — so calling into anything from this
   *  would be work for a consumer that is already looking. It still lands in the same ref
   *  as the monitor's foot, because "where each thing on this desk meets the surface" is
   *  one measurement set and splitting it across two would mean a consumer had to guess
   *  which half was current. */
  const onTowerBase = useCallback(
    (base: { left: { x: number; y: number }; right: { x: number; y: number } }) => {
      deskAnchorsRef.current.towerLeft = base.left;
      deskAnchorsRef.current.towerRight = base.right;
    },
    [],
  );

  const onKeyboardPress = useCallback(
    (key: string) => {
      /* The dial is the case's ring seen from the keyboard's side of the desk — the
       * same switch, so it goes through the same dispatcher and gets the same camera
       * move on the way in. */
      if (key === "power") {
        runTowerAction("power");

        return;
      }

      flashKey(key);
      setRecenterToken((token) => token + 1);
    },
    [runTowerAction, flashKey],
  );

  const onScreenElement = useCallback((element: HTMLElement) => {
    setScreenElement(element);
  }, []);

  const onFailed = useCallback(() => {
    setSceneFailed(true);
  }, []);

  const onTowerFailed = useCallback(() => {
    setTowerFailed(true);
  }, []);

  const onDeskFailed = useCallback(() => {
    setDeskFailed(true);
  }, []);

  const onCableFailed = useCallback(() => {
    setCableFailed(true);
  }, []);

  const copy = desktopCopy[language];

  /* Booting is a third state of the glass, distinct from off and from the desktop, so
   * it is derived here rather than passed as `powered && something` into `ScreenContent`:
   * the screen takes one word for the state it is in. */
  const booting = isPowered && bootPhase === "booting";

  const glass = (
    <ScreenContent
      booting={booting}
      fileWindow={fileWindow}
      filesOpen={filesOpen}
      filesPath={filesPath}
      input={input}
      language={language}
      lines={lines}
      onCloseFiles={closeFiles}
      onCloseTerminal={closeTerminal}
      onCloseViewer={closeViewer}
      onCloseProject={closeProject}
      onFilesPathChange={setFilesPath}
      onMaximizeFiles={maximizeFiles}
      onMaximizeTerminal={maximizeTerminal}
      onMaximizeViewer={maximizeViewer}
      onMaximizeProject={maximizeProject}
      onMinimizeFiles={minimizeFiles}
      onMinimizeTerminal={minimizeTerminal}
      onMinimizeViewer={minimizeViewer}
      onMinimizeProject={minimizeProject}
      onOpenDocument={openDocument}
      onOpenProject={openProject}
      onOpenTrash={openTrash}
      onLogOut={onExitTerminal}
      onRestart={requestRestart}
      onShutdown={requestShutdown}
      onToggleFiles={toggleFiles}
      onToggleTerminal={toggleTerminal}
      powered={isPowered}
      projectWindow={projectWindow}
      shuttingDown={shuttingDown}
      terminalOpen={terminalOpen}
      terminalWindow={terminalWindow}
      viewerWindow={viewerWindow}
      viewingDocument={viewingDocument}
      viewingProject={viewingProject}
    />
  );

  return (
    <div
      className={cn("station", isPowered ? "station--on" : "station--off")}
      data-live-key={liveKey ?? undefined}
      ref={stationRef}
    >
      {/* The three columns of the desk, and the order they are declared in is the
          order they are read in: the machine's specification, then the machine, then
          how to use it.

          The room goes in first and underneath: the wall, its light and the few things
          on it are scenery, so they carry no text and take no clicks. Declared here
          rather than inside the rig because the wall belongs to the whole desk — it
          runs behind the rails as well as behind the monitor. */}
      {/* Under the wall, and first in the DOM so the wall's shafts and pinned notes sit
          on top of it. The station paints its own opaque `--desk-surface` gradient, so
          "behind the wall" means between that gradient and the room's decorations, not
          off the back of it. */}
      <ParticleWave className="room__wave" theme={theme} />

      <WallScenery />

      {/* The desk's head. A title, a section number and a live readout of how far in
          the camera is — the three things a printed spread puts above its columns,
          and the reason this desk now reads as a spread rather than as three floating
          panels. The depth figure is the hero's magnification passed down already
          quantised, so it changes about forty times across a dive instead of
          sixty times a second. */}
      <header className="station__masthead">
        <p className="station__masthead-number">{copy.masthead.number}</p>

        <h1 className="station__masthead-title">{copy.masthead.title}</h1>

        <p className="station__masthead-depth">
          <span className="station__masthead-depth-label">
            {copy.masthead.depthLabel}
          </span>

          <span className="station__masthead-depth-value">
            <span className="station__masthead-depth-from">
              {copy.masthead.scaleFrom}
            </span>

            <span aria-hidden="true" className="station__masthead-depth-rule" />

            <span>{depth}×</span>
          </span>
        </p>
      </header>

      <aside className="station__rail station__rail--left">
        <h2 className="station__rail-title">{copy.specsTitle}</h2>
        {/* A definition list, because this is a list of label/value pairs and the
            markup should say so rather than pretending to be a layout. */}
        <dl className="station__specs">
          {copy.specs.map(([label, value]) => (
            <div className="station__spec" key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>

        {/* The case's own controls, under the machine they belong to. Placed here
            rather than floating beside the case because this rail is the part of the
            desk that is already about the machine; the case itself is the drawing,
            and a second set of controls next to a drawing of controls is a lie about
            there being six. */}
        <TowerLegend
          controls={copy.tower.controls}
          filesOpen={filesOpen}
          fanStep={fanStep}
          hovered={towerHover}
          note={copy.tower.note}
          onAction={onTowerAction}
          onHovered={setTowerHover}
          powered={isPowered}
          title={copy.tower.title}
        />

        {/* The one piece of prose on the desk, and it is prose rather than a caption
            because it is the desk's claim: everything here is real. Set at the
            bottom of the rail where a printed spread puts its closing note. */}
        <p className="station__caption">
          <strong className="station__caption-lead">{copy.caption.lead}</strong>

          {copy.caption.body}
        </p>
      </aside>

      {/* Middle: the monitor and the keyboard, stacked. This column is the only one
          that flexes, because it is the only one holding the scene — the rails are
          fixed-width text and have nothing to give. */}
      <div className="station__rig">
        {/* The surface the two machines stand on, and the bottom of the whole rig.
         *
         *  First child and `z-index: 0` on purpose. It is a transparent canvas like the
         *  two machines above it, so DOM order alone decides the stacking: the desk draws
         *  first, the case and the monitor over it, the keyboard over both. That is the
         *  only arrangement in which a cable running across the board can pass *behind*
         *  the case — the reason it could not be an SVG overlay at `z-index: 3`.
         *
         *  In the rig rather than in the stage, because the desk has to reach under the
         *  keyboard as well: a board that stopped at the stage's bottom edge left the
         *  slab standing on the room's background with the desk behind it, which is a
         *  picture of a desk with a keyboard in front of it. The rig is the one box that
         *  spans the monitor and the keyboard, so it is the only one a desk can be sized
         *  against. */}
        {deskFailed ? null : (
          <DeskScene
            anchorsRef={deskAnchorsRef}
            screenElement={screenElement}
            theme={theme}
            onFailed={onDeskFailed}
          />
        )}

        <div className="station__stage" ref={stageRef}>
          {/* The objects on the desk, measured against the stage rather than the
              viewport so they stay beside the monitor at every keyboard size. Before
              the scene, so the WebGL canvas — which is transparent, and later in the
              DOM — draws over them. */}
          <DeskScenery />

          {/* The case, in its own scene and its own renderer.
              *
              *  Not inside `MonitorScene` because that one fits the monitor to its
              *  stage, and adding a tower to it would shrink the monitor to make room
              *  for its neighbour — which is exactly backwards. Two canvases also means
              *  two WebGL contexts, and that is a real cost: eight is the floor where
              *  browsers start dropping contexts, so this desk is spending two.
              *
              *  So it renders only where there is room for it. Below the breakpoint the
              *  element is display-none, which means no resize work, no context, and no
              *  legend — and the rail's own rows still drive the same state, so the
              *  machine keeps its three controls on a screen too narrow for a tower. */}
          {towerFailed ? null : (
            <TowerScene
              hovered={towerHover}
              onAction={runTowerAction}
              onBase={onTowerBase}
              onFailed={onTowerFailed}
              onHover={setTowerHover}
              pressed={towerPress}
              fanStep={fanStep}
              filesOpen={filesOpen}
              powered={isPowered}
              theme={theme}
            />
          )}

          {sceneFailed ? (
            // No GPU: the desk survives without the plastic, because a machine that
            // cannot run WebGL should still get the terminal.
            <div className="screen screen--flat">{glass}</div>
          ) : (
            <MonitorScene
              powered={isPowered}
              theme={theme}
              onFootPoint={onFootPoint}
              onNeckPoint={onNeckPoint}
              onScreenElement={onScreenElement}
              recenterToken={recenterToken}
              onFailed={onFailed}
            />
          )}

          {screenElement ? createPortal(glass, screenElement) : null}
        </div>

        {/* The display cable, as real geometry.
         *
         *  Beside the stage rather than inside it, so it layers over the machines the way
         *  a cable lying across a desk does — and its own context, because it joins two
         *  objects that neither machine scene can see from where it sits. It reads the
         *  same published anchors the desk does: the case's corner and the monitor's
         *  neck. */}
        {cableFailed ? null : (
          <CableScene anchorsRef={deskAnchorsRef} onFailed={onCableFailed} />
        )}

        <svg className="station__cable" aria-hidden="true" focusable="false" ref={cableSvgRef}>
          {/* One run, and only one: the themed monitor-to-keyboard cable. The case-to-
              monitor display cable that used to share this overlay is real geometry now,
              in `CableScene`, because a tube needs width and light that a path cannot
              give it. */}
          <path ref={cableRef} className="station__cable-line" />
        </svg>

<div className="station__keyboard" ref={keyboardRowRef}>
          {/* The tray the keyboard sits in — a shade of the board, drawn as the well
              itself instead of as a pocket in the 3D top. The board's slab is only a few
              millimetres thick, so a real cutout can never read: no matter how deep the
              hole the DOM keyboard in front of it is drawn over the whole centre of the
              desk, and nothing of the pocket survives except its walls. A well behind the
              keys gets to be a *band* — wide enough, proportioned to the slab, darker than
              the board on every side — which is the one cue that still reads. */}
          <div className="station__keyboard-well" />
          {/* Sized to the box the slab is drawn at, not to the box it is authored at:
              the transform then draws the authored slab into it, and the row reserves
              the space that is actually used. See `KEYBOARD_MAX_SCALE`. */}
          <div
            className="station__keyboard-fit"
            ref={keyboardFitRef}
            style={{
              height: keyboardFit.height || undefined,
              width: keyboardFit.width || undefined,
            }}
          >
            <GamingMouse />
            <Keyboard onKeyPress={onKeyboardPress} scale={keyboardFit.scale} />
          </div>

          {/* Every non-letter key the keyboard has, each one saying what it does.
              Replaces a single tracked line that named two of them and implied the
              other two did nothing. */}
          <KeyLegend keys={copy.keys} label={copy.keysLabel} powered={isPowered} />
        </div>
      </div>

      {/* Right: two paragraphs, and only two. A third would stop being read and start
          being skipped, which is the failure mode of every instruction panel ever
          written. */}
      <aside className="station__rail station__rail--right">
        <h2 className="station__rail-title">{copy.helpTitle}</h2>
        {copy.help.map((paragraph) => (
          <p className="station__rail-text" key={paragraph}>
            {paragraph}
          </p>
        ))}

        {/* The shell's vocabulary, as a table rather than as more prose.
            *
            *  This is the one thing a visitor cannot get from the machine itself until
            *  they have already worked out that they can type into it — which is the
            *  catch-22 that every command-line toy dies of. Printing the commands next
            *  to the machine turns the first command from a guess into a copy.
            *
            *  Kept short deliberately: these are the commands worth showing, not every
            *  one the shell answers. A complete list here would be a second document
            *  competing with the first. */}
        <section className="station__commands">
          <h3 className="station__rail-subtitle">{copy.commands.title}</h3>

          <dl className="station__command-list">
            {copy.commands.rows.map(([command, description]) => (
              <div className="station__command" key={command}>
                <dt>{command}</dt>
                <dd>{description}</dd>
              </div>
            ))}
          </dl>
        </section>
      </aside>
    </div>
  );
}

interface ScreenContentProps {
  language: Language;
  powered: boolean;
  /** Powering on: the boot sequence owns the glass until it finishes. */
  booting: boolean;
  /** The terminal window's three facts — open, hidden, full — and the controls that
   *  move them. Passed as the state rather than as booleans so Minimize and Close stay
   *  distinguishable: one hides, the other unmounts. */
  terminalWindow: DesktopWindow;
  onMinimizeTerminal: () => void;
  onMaximizeTerminal: () => void;
  onCloseTerminal: () => void;
  /** The same, for the file manager. */
  fileWindow: DesktopWindow;
  filesPath: FilesPath;
  onFilesPathChange: (path: FilesPath) => void;
  onMinimizeFiles: () => void;
  onMaximizeFiles: () => void;
  onCloseFiles: () => void;
  /** The document viewer, a third window. It carries which PDF is open as well as the
   *  usual window facts, because a viewer with no file has nothing to show. It opens
   *  from a row in the CV folder, which is why `onOpenDocument` takes the id. */
  viewerWindow: DesktopWindow;
  viewingDocument: CvDocumentId | null;
  onOpenDocument: (id: CvDocumentId) => void;
  onMinimizeViewer: () => void;
  onMaximizeViewer: () => void;
  onCloseViewer: () => void;
  /** The site viewer, a fourth window and the same shape as the document viewer: it
   *  carries which project is open as well as the usual window facts, and opens from a
   *  project's detail panel, which is why `onOpenProject` takes the project. */
  projectWindow: DesktopWindow;
  viewingProject: Project["id"] | null;
  onOpenProject: (project: Project) => void;
  onMinimizeProject: () => void;
  onMaximizeProject: () => void;
  onCloseProject: () => void;
  /** Whether each window is visible, which is what the panel's launchers report. */
  terminalOpen: boolean;
  filesOpen: boolean;
  onToggleTerminal: () => void;
  onToggleFiles: () => void;
  /** The desktop's bin, which opens the file manager at Trash. */
  onOpenTrash: () => void;
  /** The panel mark's session menu. Log Out leaves the desk; the other two bring the
   *  glass down and, for a restart, back up again. */
  onLogOut: () => void;
  onRestart: () => void;
  onShutdown: () => void;
  /** The power-off animation is running: the mark blinks over the desktop and the
   *  machine is about to lose power. */
  shuttingDown: boolean;
  lines: readonly ShellLine[];
  input: string;
}

/** The bin on the desktop. Drawn at the desktop's own scale — bigger than the panel's
 *  glyphs, because it labels a target rather than reporting a state. */
const TrashIcon = () => (
  <svg aria-hidden="true" className="desktop-icon__icon" fill="none" focusable="false" viewBox="0 0 24 24">
    <path d="M4 6.4h16" stroke="currentColor" strokeLinecap="round" strokeWidth="1.6" />
    <path d="M9.2 6.4V4.5A1.5 1.5 0 0 1 10.7 3h2.6a1.5 1.5 0 0 1 1.5 1.5v1.9" stroke="currentColor" strokeWidth="1.6" />
    <path
      d="M6.3 6.4l0.8 12.4A1.7 1.7 0 0 0 8.8 20.5h6.4a1.7 1.7 0 0 0 1.7-1.7l0.8-12.4"
      stroke="currentColor"
      strokeLinejoin="round"
      strokeWidth="1.6"
    />
    <path d="M10.1 10.1v6.6M13.9 10.1v6.6" stroke="currentColor" strokeLinecap="round" strokeWidth="1.6" />
  </svg>
);

/** What is actually on the glass.
 *
 *  Three states live here rather than in the scene, so the shell keeps native
 *  interaction whichever one is up: it is real DOM inside a CSS 3D transform, so
 *  selection, scrolling and focus behave exactly the way the browser intends.
 *
 *  Booting is the machine waking: a dark screen, then the Kali mark wiped into place
 *  and breathing before anything is usable. The powered state it hands over to is a
 *  Kali desktop — a wallpaper with the panel across the top, a bin in the corner, and
 *  windows *on* it: the terminal and the file manager open on the same glass, not on
 *  another page, so the monitor never stops being the monitor. The specification and
 *  the instructions are *not* on the glass: they sit on the desk beside it, because a
 *  monitor is a window onto a machine, and a machine's spec sheet is not inside its
 *  screen. */
function ScreenContent({
  language,
  powered,
  booting,
  terminalWindow,
  onMinimizeTerminal,
  onMaximizeTerminal,
  onCloseTerminal,
  fileWindow,
  filesPath,
  onFilesPathChange,
  onMinimizeFiles,
  onMaximizeFiles,
  onCloseFiles,
  viewerWindow,
  viewingDocument,
  onOpenDocument,
  onMinimizeViewer,
  onMaximizeViewer,
  onCloseViewer,
  projectWindow,
  viewingProject,
  onOpenProject,
  onMinimizeProject,
  onMaximizeProject,
  onCloseProject,
  terminalOpen,
  filesOpen,
  onToggleTerminal,
  onToggleFiles,
  onOpenTrash,
  onLogOut,
  onRestart,
  onShutdown,
  shuttingDown,
  lines,
  input,
}: ScreenContentProps) {
  const copy = desktopCopy[language];

  /* The document the viewer was opened with, resolved back to the entry that names it
   *  and points at it. Null when nothing is open, which lets the render below ask one
   *  question ("is there a file") rather than two. */
  const viewedDocument =
    viewingDocument === null
      ? null
      : (cvDocuments.find((doc) => doc.id === viewingDocument) ?? null);

  /* The project the site viewer was opened with, resolved the same way — the window
    *  holds the id, and this is the one place both know the lookup. */
  const viewedProject =
    viewingProject === null
      ? null
      : (projects.find((entry) => entry.id === viewingProject) ?? null);

  if (booting) return <BootScreen label={copy.boot.label} />;

  if (powered) {
    return (
      <div className="screen screen--desktop">
        {/* The desktop itself, behind everything: a red bloom that settles into a dark
            field with the dragon faint on it, so the first frame after the boot has
            something to fade up through rather than a flat panel. */}
        <div aria-hidden="true" className="screen__wallpaper">
          <KaliMark className="screen__wallpaper-mark" size={1} />
        </div>

        <KaliPanel
          copy={copy}
          filesOpen={filesOpen}
          onLogOut={onLogOut}
          onRestart={onRestart}
          onShutdown={onShutdown}
          onToggleFiles={onToggleFiles}
          onToggleTerminal={onToggleTerminal}
          terminalOpen={terminalOpen}
        />

        <div className="screen__content">
          {/* The desktop's own contents, under the windows: the bin, the one thing a
              desktop has before anything is open. It opens the file manager at Trash
              rather than being a second file manager. */}
          <div className="desktop-icons">
            <button
              aria-label={copy.files.trash.name}
              className="desktop-icon"
              onClick={onOpenTrash}
              type="button"
            >
              <TrashIcon />
              <span className="desktop-icon__label">{copy.files.trash.name}</span>
            </button>
          </div>

          {/* A window, opened from the panel, not the surface of the desktop. Minimizing
              it leaves the session exactly where it was; closing it ends this window but
              not the session, which lives in the station and outlives every window. */}
          {terminalWindow.open && (
            <TerminalWindow
              closeLabel={copy.terminal.close}
              controls={copy.window}
              maximized={terminalWindow.maximized}
              minimized={terminalWindow.minimized}
              onClose={onCloseTerminal}
              onMaximize={onMaximizeTerminal}
              onMinimize={onMinimizeTerminal}
              title={copy.terminal.title}
            >
              <Shell input={input} lines={lines} />
            </TerminalWindow>
          )}

          {/* The folder, a second window over the first — the same chrome, the same three
              controls, so the two read as one desktop rather than two widgets. */}
          {fileWindow.open && (
            <FileManager
              controls={copy.window}
              copy={copy.files}
              language={language}
              maximized={fileWindow.maximized}
              minimized={fileWindow.minimized}
              onClose={onCloseFiles}
              onMaximize={onMaximizeFiles}
              onMinimize={onMinimizeFiles}
              onOpenDocument={onOpenDocument}
              onPathChange={onFilesPathChange}
              onViewProject={onOpenProject}
              path={filesPath}
            />
          )}

          {/* The reader, over the folder it was opened from: the same chrome again, so
              the PDF is one more window on this desktop rather than a jump to another
              page. It stays open on its own — closing the folder behind it leaves the
              document where it was. */}
          {viewerWindow.open && viewedDocument !== null && (
            <PdfViewer
              closeLabel={copy.files.close}
              controls={copy.window}
              doc={viewedDocument}
              label={copy.files.viewerLabel}
              maximized={viewerWindow.maximized}
              minimized={viewerWindow.minimized}
              onClose={onCloseViewer}
              onMaximize={onMaximizeViewer}
              onMinimize={onMinimizeViewer}
            />
          )}

          {/* The site viewer, over the grid and the detail it was opened from: the same
              chrome again, so a website is one more window on this desktop rather than a
              jump to another page. A live project is a framed site; a dead one is its
              repository drawn here, because GitHub will not be framed. */}
          {projectWindow.open && viewedProject !== null && (
            <ProjectViewer
              controls={copy.window}
              copy={copy.files}
              language={language}
              maximized={projectWindow.maximized}
              minimized={projectWindow.minimized}
              onClose={onCloseProject}
              onMaximize={onMaximizeProject}
              onMinimize={onMinimizeProject}
              project={viewedProject}
            />
          )}
        </div>

        {/* Going down. The sequence in `ShutdownScreen` darkens the desktop, lets the
            mark settle once, and drains the light before the station cuts power — at
            which point this unmounts and the standby mark is what is left on the dark
            glass. */}
        {shuttingDown && <ShutdownScreen label={copy.panel.shutDown} />}

        {/* Glass last, so the reflection and the scanlines sit over the pixels. */}
        <div aria-hidden="true" className="screen__glass" />
      </div>
    );
  }

  /* Standby is the logo and nothing else. The text it used to carry said "no signal,
   * press escape to power on" — which is a paragraph of instructions printed on a
   * monitor that is, by definition, showing nothing. The mark is what identifies the
   * machine, and it is the one thing big enough to read from across a room.
   *
   *  The hint that used to sit under the wordmark now lives on the desk, in
   *  `.station__hint`, where it is real page text rather than pixels on a screen that
   *  is switched off. */
  return (
    <div className="screen">
      {/* Mark over wordmark, the way a machine is badged: the mark says which OS, the
          word says it in letters for anyone who does not read dragon silhouettes. The
          wordmark is small on purpose — it is the caption, not a second headline — but
          it is not so small that the glass overlay eats it. */}
      <div className="screen__standby">
        <KaliMark className="screen__standby-mark" size={34} />
      </div>

      {/* Glass last, so the reflection and the scanlines sit over the pixels. */}
      <div className="screen__glass" aria-hidden="true" />
    </div>
  );
}

interface TerminalWindowProps {
  title: string;
  closeLabel: string;
  controls: DesktopCopy["window"];
  maximized: boolean;
  minimized: boolean;
  onMinimize: () => void;
  onMaximize: () => void;
  onClose: () => void;
  children: ReactNode;
}

/** The terminal, as a window on the desktop.
 *
 *  The chrome is the file manager's — a title bar, a shadow, and the same three controls
 *  — so the two windows read as the same desktop rather than two widgets that happen to
 *  overlap. The body is the `Shell` untouched, which is the whole reason it is a window
 *  and not a rewrite: the session keeps its native scrollback, selection and focus, and
 *  closing the window does not end it. */
const TerminalWindow = ({
  title,
  closeLabel,
  controls,
  maximized,
  minimized,
  onMinimize,
  onMaximize,
  onClose,
  children,
}: TerminalWindowProps) => (
  <div className={cn("term-window", maximized && "term-window--maximized", minimized && "term-window--minimized")}>
    <header className="term-window__bar">
      <span className="term-window__title">{title}</span>

      <WindowControls
        closeLabel={closeLabel}
        copy={controls}
        maximized={maximized}
        onClose={onClose}
        onMaximize={onMaximize}
        onMinimize={onMinimize}
      />
    </header>

    <div className="term-window__body">{children}</div>
  </div>
);

/* --- Key mapping --------------------------------------------------------------- */

/** The shifted face of every key that has one.
 *
 *  Without this, `!` lights nothing at all: the cap for it is printed `1`, and the
 *  event reports the character that came out, not the key that was hit. The whole
 *  point of lighting caps is that the keyboard agrees with the line above it, so a
 *  shifted letter has to agree too. */
const SHIFTED = new Map<string, string>([
  ["!", "1"],
  ["@", "2"],
  ["#", "3"],
  ["$", "4"],
  ["%", "5"],
  ["^", "6"],
  ["&", "7"],
  ["*", "8"],
  ["(", "9"],
  [")", "0"],
  ["_", "-"],
  ["+", "="],
  ["{", "["],
  ["}", "]"],
  ["|", "\\"],
  [":", ";"],
  ['"', "'"],
  ["<", ","],
  [">", "."],
  ["?", "/"],
  ["~", "`"],
]);

/** Map a real keyboard event onto the name of the cap that should light up. */
const capFor = (event: KeyboardEvent): string => {
  switch (event.key) {
    case " ":
      return " ";
    case "Backspace":
      return "delete";
    case "Escape":
      return "escape";
    case "Enter":
      return "enter";
    case "Tab":
      return "tab";
    case "CapsLock":
      return "capslock";
    case "ArrowUp":
      return "arrowup";
    case "ArrowDown":
      return "arrowdown";
    case "ArrowLeft":
      return "arrowleft";
    case "ArrowRight":
      return "arrowright";
    case "Shift":
      return "shift";
    case "Control":
      return "control";
    case "Alt":
      return "alt";
    case "Meta":
      return "meta";
    default: {
      const shifted = SHIFTED.get(event.key);

      if (shifted !== undefined) return shifted;

      // Single printable characters light their own letter or number cap; anything
      // else has no cap to light and returns a name that matches nothing.
      return event.key.length === 1 ? event.key.toLowerCase() : "";
    }
  }
};

