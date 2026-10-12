"use client";

import { memo, useCallback, type MouseEvent, type ReactNode } from "react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Command,
  FastForward,
  Globe,
  Mic,
  Moon,
  Rewind,
  Search,
  SkipForward,
  Sun,
  SunDim,
  Table,
  Volume1,
  Volume2,
  VolumeX,
} from "lucide-react";

import "./keyboard.css";

type Align = "start" | "end" | "center";

interface KeySpec {
  /** Printed on the cap, and the value matched against real key events. */
  dataKey: string;
  label: string;
  secondaryLabel?: string;
  widthRem: number;
  heightRem?: number;
  align?: Align;
  /** Replaces the label stack entirely, for keys that print a glyph. */
  content?: ReactNode;
  /** Shadows the row of WASD, which is how the caller highlights a live key. */
  tone?: "w" | "asd" | "none";
}

const CAP_UNIT_REM = 1.5;

const alignClass: Record<Align, string> = {
  start: "keyboard__label--start",
  end: "keyboard__label--end",
  center: "keyboard__label--center",
};

/** The option glyph, drawn inline. The original used a two-shape SVG for it; the
 *  rest of the keycaps are lucide, and a lone hand-rolled path next to sixteen
 *  of them reads as a different keyboard. */
const OptionGlyph = () => (
  <svg
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 32 32"
    className="keyboard__glyph"
  >
    <rect stroke="currentColor" strokeWidth="3" x="18" y="5" width="10" height="2" />
    <polygon stroke="currentColor" strokeWidth="3" points="10.6,5 4,5 4,7 9.4,7 18.4,27 28,27 28,25 19.6,25" />
  </svg>
);

const Key = memo(function Key({
  dataKey,
  label,
  secondaryLabel,
  widthRem,
  heightRem = CAP_UNIT_REM,
  align,
  content,
  tone,
}: KeySpec) {
  return (
    <div
      className="keyboard__key"
      data-key={dataKey}
      data-tone={tone ?? "none"}
      style={{ width: `${widthRem}rem` }}
    >
      <div
        className="keyboard__cap"
        style={{ height: `${heightRem}rem`, width: `${widthRem}rem` }}
      >
        {content ?? (
          <div className={`keyboard__label ${alignClass[align ?? "center"]}`}>
            {secondaryLabel !== undefined && (
              <span className="keyboard__label-line">{secondaryLabel}</span>
            )}

            <span className="keyboard__label-line">{label}</span>
          </div>
        )}
      </div>
    </div>
  );
});

const ArrowKey = ({ direction }: { direction: "up" | "down" | "left" | "right" }) => {
  const glyphs = {
    up: <ChevronUp className="keyboard__glyph" />,
    down: <ChevronDown className="keyboard__glyph" />,
    left: <ChevronLeft className="keyboard__glyph" />,
    right: <ChevronRight className="keyboard__glyph" />,
  };

  return (
    <div
      className="keyboard__key"
      data-key={direction === "up" ? "arrowup" : `arrow${direction}`}
      style={{ width: `${CAP_UNIT_REM}rem` }}
    >
      <div
        className="keyboard__cap keyboard__cap--shallow"
        style={{ height: "0.75rem", width: `${CAP_UNIT_REM}rem` }}
      >
        {glyphs[direction]}
      </div>
    </div>
  );
};

/** The function row.
 *
 *  macOS puts the media and brightness keys here, and the original design filled
 *  F1-F12 with lucide glyphs to match. They are kept because they are most of
 *  what makes the slab read as a Mac keyboard rather than a generic grid, and
 *  they cost nothing to draw. */
const functionKeys: readonly KeySpec[] = [
  { dataKey: "f1", label: "F1", widthRem: CAP_UNIT_REM, content: <Cap icon={<SunDim className="keyboard__glyph" />} label="F1" /> },
  { dataKey: "f2", label: "F2", widthRem: CAP_UNIT_REM, content: <Cap icon={<Sun className="keyboard__glyph" />} label="F2" /> },
  { dataKey: "f3", label: "F3", widthRem: CAP_UNIT_REM, content: <Cap icon={<Table className="keyboard__glyph" />} label="F3" /> },
  { dataKey: "f4", label: "F4", widthRem: CAP_UNIT_REM, content: <Cap icon={<Search className="keyboard__glyph" />} label="F4" /> },
  { dataKey: "f5", label: "F5", widthRem: CAP_UNIT_REM, content: <Cap icon={<Mic className="keyboard__glyph" />} label="F5" /> },
  { dataKey: "f6", label: "F6", widthRem: CAP_UNIT_REM, content: <Cap icon={<Moon className="keyboard__glyph" />} label="F6" /> },
  { dataKey: "f7", label: "F7", widthRem: CAP_UNIT_REM, content: <Cap icon={<Rewind className="keyboard__glyph" />} label="F7" /> },
  { dataKey: "f8", label: "F8", widthRem: CAP_UNIT_REM, content: <Cap icon={<SkipForward className="keyboard__glyph" />} label="F8" /> },
  { dataKey: "f9", label: "F9", widthRem: CAP_UNIT_REM, content: <Cap icon={<FastForward className="keyboard__glyph" />} label="F9" /> },
  { dataKey: "f10", label: "F10", widthRem: CAP_UNIT_REM, content: <Cap icon={<VolumeX className="keyboard__glyph" />} label="F10" /> },
  { dataKey: "f11", label: "F11", widthRem: CAP_UNIT_REM, content: <Cap icon={<Volume1 className="keyboard__glyph" />} label="F11" /> },
  { dataKey: "f12", label: "F12", widthRem: CAP_UNIT_REM, content: <Cap icon={<Volume2 className="keyboard__glyph" />} label="F12" /> },
];

const numberRow: readonly KeySpec[] = [
  { dataKey: "`", label: "~", secondaryLabel: "`", widthRem: CAP_UNIT_REM },
  { dataKey: "1", label: "1", secondaryLabel: "!", widthRem: CAP_UNIT_REM },
  { dataKey: "2", label: "2", secondaryLabel: "@", widthRem: CAP_UNIT_REM },
  { dataKey: "3", label: "3", secondaryLabel: "#", widthRem: CAP_UNIT_REM },
  { dataKey: "4", label: "4", secondaryLabel: "$", widthRem: CAP_UNIT_REM },
  { dataKey: "5", label: "5", secondaryLabel: "%", widthRem: CAP_UNIT_REM },
  { dataKey: "6", label: "6", secondaryLabel: "^", widthRem: CAP_UNIT_REM },
  { dataKey: "7", label: "7", secondaryLabel: "&", widthRem: CAP_UNIT_REM },
  { dataKey: "8", label: "8", secondaryLabel: "*", widthRem: CAP_UNIT_REM },
  { dataKey: "9", label: "9", secondaryLabel: "(", widthRem: CAP_UNIT_REM },
  { dataKey: "0", label: "0", secondaryLabel: ")", widthRem: CAP_UNIT_REM },
  { dataKey: "-", label: "-", secondaryLabel: "_", widthRem: CAP_UNIT_REM },
  { dataKey: "=", label: "=", secondaryLabel: "+", widthRem: CAP_UNIT_REM },
];

const qwertyRow: readonly KeySpec[] = ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"].map(
  (letter): KeySpec => ({
    dataKey: letter,
    label: letter.toUpperCase(),
    widthRem: CAP_UNIT_REM,
    tone: letter === "w" ? "w" : "none",
  }),
);

const qwertySpecial: readonly KeySpec[] = [
  { dataKey: "[", label: "[", secondaryLabel: "{", widthRem: CAP_UNIT_REM },
  { dataKey: "]", label: "]", secondaryLabel: "}", widthRem: CAP_UNIT_REM },
  { dataKey: "\\", label: "\\", secondaryLabel: "|", widthRem: CAP_UNIT_REM },
];

const asdfRow: readonly KeySpec[] = ["a", "s", "d", "f", "g", "h", "j", "k", "l"].map(
  (letter): KeySpec => ({
    dataKey: letter,
    label: letter.toUpperCase(),
    widthRem: CAP_UNIT_REM,
    tone: ["a", "s", "d"].includes(letter) ? "asd" : "none",
  }),
);

const asdfSpecial: readonly KeySpec[] = [
  { dataKey: ";", label: ";", secondaryLabel: ":", widthRem: CAP_UNIT_REM },
  { dataKey: "'", label: "'", secondaryLabel: "\"", widthRem: CAP_UNIT_REM },
];

const zxcvRow: readonly KeySpec[] = ["z", "x", "c", "v", "b", "n", "m"].map(
  (letter): KeySpec => ({
    dataKey: letter,
    label: letter.toUpperCase(),
    widthRem: CAP_UNIT_REM,
  }),
);

const zxcvSpecial: readonly KeySpec[] = [
  { dataKey: ",", label: ",", secondaryLabel: "<", widthRem: CAP_UNIT_REM },
  { dataKey: ".", label: ".", secondaryLabel: ">", widthRem: CAP_UNIT_REM },
  { dataKey: "/", label: "/", secondaryLabel: "?", widthRem: CAP_UNIT_REM },
];

/** A function key prints an icon above its label, which does not fit the shared
 *  two-line label stack. */
function Cap({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <div className="keyboard__label keyboard__label--center keyboard__label--stack">
      <span className="keyboard__label-line">{icon}</span>
      <span className="keyboard__label-line">{label}</span>
    </div>
  );
}

const Row = ({ children }: { children: ReactNode }) => (
  <div className="keyboard__row">{children}</div>
);

interface KeyboardProps {
  /** Called with the `data-key` of whichever cap was clicked. */
  onKeyPress?: (key: string) => void;
  /** How far to magnify the slab.
   *
   *  The slab's own metrics are fixed, so this is the only thing about it that changes
   *  size: a keyboard is one object drawn at a different distance, never a different
   *  arrangement of keys. Measured and owned by the station, which knows how much desk
   *  the keyboard has been given. */
  scale?: number;
}

/** The keyboard under the monitor.
 *
 *  Clicks are handled by delegation on the slab rather than by making all sixty
 *  caps buttons. Sixty tab stops ahead of the page's own controls is worse than
 *  useless for anyone navigating by keyboard, and the caps are a picture of a
 *  keyboard rather than a set of controls - the real input still arrives as real
 *  key events, which the station maps back onto these caps. */
export const Keyboard = ({ onKeyPress, scale = 1 }: KeyboardProps) => {
  const onClick = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      // Narrowed with instanceof rather than cast: `event.target` is typed
      // `EventTarget | null`, and a cast would silence that instead of answering
      // it. A click that did not land on an element — or landed on a text node —
      // simply has no cap to report.
      const target = event.target;

      if (!(target instanceof HTMLElement)) return;

      const cap = target.closest<HTMLElement>("[data-key]");

      if (!cap) return;

      const key = cap.dataset.key;

      if (key !== undefined) onKeyPress?.(key);
    },
    [onKeyPress],
  );

  return (
    <div className="keyboard" style={{ transform: `scale(${scale})` }}>
      <div className="keyboard__slab" onClick={onClick} aria-hidden="true">
        <Row>
          <Key dataKey="escape" label="esc" widthRem={2.5} align="start" />
          {functionKeys.map((key) => (
            <Key key={key.dataKey} {...key} />
          ))}
          <Key
            dataKey="power"
            label=""
            widthRem={CAP_UNIT_REM}
            content={<div className="keyboard__dial" />}
          />
        </Row>

        <Row>
          {numberRow.map((key) => (
            <Key key={key.dataKey} {...key} />
          ))}
          <Key dataKey="delete" label="delete" widthRem={2.5} align="end" />
        </Row>

        <Row>
          <Key dataKey="tab" label="tab" widthRem={2.5} align="start" />
          {qwertyRow.map((key) => (
            <Key key={key.dataKey} {...key} />
          ))}
          {qwertySpecial.map((key) => (
            <Key key={key.dataKey} {...key} />
          ))}
        </Row>

        <Row>
          <Key dataKey="capslock" label="caps lock" widthRem={2.8} align="start" />
          {asdfRow.map((key) => (
            <Key key={key.dataKey} {...key} />
          ))}
          {asdfSpecial.map((key) => (
            <Key key={key.dataKey} {...key} />
          ))}
          <Key dataKey="enter" label="return" widthRem={2.85} align="end" />
        </Row>

        <Row>
          <Key dataKey="shift" label="shift" widthRem={3.65} />
          {zxcvRow.map((key) => (
            <Key key={key.dataKey} {...key} />
          ))}
          {zxcvSpecial.map((key) => (
            <Key key={key.dataKey} {...key} />
          ))}
          <Key dataKey="shift" label="shift" widthRem={3.65} />
        </Row>

        <Row>
          <Key
            dataKey="fn"
            label="fn"
            widthRem={1.75}
            heightRem={1.75}
            content={
              <div className="keyboard__label keyboard__label--start keyboard__label--spread">
                <Globe className="keyboard__glyph" />
                <span className="keyboard__label-line">fn</span>
              </div>
            }
          />

          <Key
            dataKey="control"
            label="control"
            widthRem={CAP_UNIT_REM}
            content={
              <div className="keyboard__label keyboard__label--start keyboard__label--spread">
                <ChevronUp className="keyboard__glyph" />
                <span className="keyboard__label-line">control</span>
              </div>
            }
          />

          <Key
            dataKey="alt"
            label="option"
            widthRem={CAP_UNIT_REM}
            content={
              <div className="keyboard__label keyboard__label--end keyboard__label--spread">
                <OptionGlyph />
                <span className="keyboard__label-line">option</span>
              </div>
            }
          />

          <Key
            dataKey="meta"
            label="command"
            widthRem={2}
            content={
              <div className="keyboard__label keyboard__label--center keyboard__label--spread">
                <Command className="keyboard__glyph" />
                <span className="keyboard__label-line">command</span>
              </div>
            }
          />

          {/* The slab's own mark. The original printed the component's name here,
              which is a caption about the code rather than anything on the
              object; this is the one word that belongs on the machine. */}
          <Key
            dataKey=" "
            label="BangPii"
            widthRem={8.2}
            content={
              <div className="keyboard__label keyboard__label--center">
                <span className="keyboard__mark">BangPii</span>
              </div>
            }
          />

          <Key
            dataKey="meta"
            label="command"
            widthRem={2}
            content={
              <div className="keyboard__label keyboard__label--center keyboard__label--spread">
                <Command className="keyboard__glyph" />
                <span className="keyboard__label-line">command</span>
              </div>
            }
          />

          <Key
            dataKey="alt"
            label="option"
            widthRem={CAP_UNIT_REM}
            content={
              <div className="keyboard__label keyboard__label--end keyboard__label--spread">
                <OptionGlyph />
                <span className="keyboard__label-line">option</span>
              </div>
            }
          />

          <div className="keyboard__arrows">
            <ArrowKey direction="up" />

            <div className="keyboard__arrows-row">
              <ArrowKey direction="left" />
              <ArrowKey direction="down" />
              <ArrowKey direction="right" />
            </div>
          </div>
        </Row>
      </div>
    </div>
  );
};

export default Keyboard;
