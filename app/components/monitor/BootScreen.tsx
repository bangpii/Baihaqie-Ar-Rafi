"use client";

import { KaliMark } from "./KaliMark";

import "./boot.css";

/** Power-on to desktop, in ms. The sum of `--boot-post`, `--boot-wipe`, `--boot-hold`,
 *  `--boot-pulse` and `--boot-out` in `boot.css`; keep the two in step together. */
export const BOOT_DURATION_MS = 10_400;

/** The same walk with motion turned down. The wipe and the breath are the first things
 *  dropped under `prefers-reduced-motion`, so the sequence has nothing left to hold a
 *  reader for ten seconds — a short black beat, then the desktop. */
export const BOOT_REDUCED_MS = 1_400;

interface BootScreenProps {
  /** One phrase for a screen reader. The sequence itself is scenery, but a reader who
   *  cannot see it should still be told the machine is coming up rather than guessing
   *  at a black rectangle. */
  label: string;
}

export const BootScreen = ({ label }: BootScreenProps) => (
  <div className="screen screen--boot">
    <div aria-label={label} className="boot" role="status">
      <div className="boot__stage">
        <KaliMark className="boot__logo" size={30} />
      </div>
    </div>

    {/* Glass last, so the reflection and the scanlines sit over the boot. */}
    <div aria-hidden="true" className="screen__glass" />
  </div>
);

export default BootScreen;

