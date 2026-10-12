"use client";

import { KaliMark } from "./KaliMark";

import "./shutdown.css";

/** Power-off to dark glass, in ms. The sum of `--shut-scrim`, `--shut-in`,
 *  `--shut-settle` and `--shut-out` in `shutdown.css`; keep the two in step together. */
export const SHUTDOWN_DURATION_MS = 3_400;

interface ShutdownScreenProps {
  /** One phrase for a screen reader. The sequence itself is scenery, but a reader who
   *  cannot see it should still be told the machine is closing rather than guessing at
   *  a darkening rectangle. */
  label: string;
}

export const ShutdownScreen = ({ label }: ShutdownScreenProps) => (
  <div className="screen__shutdown">
    <div aria-label={label} className="shutdown" role="status">
      <div className="shutdown__stage">
        <KaliMark className="shutdown__logo" size={26} />
      </div>
    </div>
  </div>
);

export default ShutdownScreen;
