import { type ReactNode } from "react";
import { createPortal } from "react-dom";

import { cn } from "@/app/lib/utils";

import "./reveal.css";

export interface MonitorRevealProps {
  /** Whether the desk is mounted at all. False keeps the WebGL context unbuilt. */
  live: boolean;
  /** Whether it should respond to input. False while the reveal is still opening. */
  active: boolean;
  children: ReactNode;
}

export function MonitorReveal({ live, active, children }: MonitorRevealProps) {
  /* Portalled to <body> rather than rendered in place. A `position: fixed` overlay
   * is contained by any ancestor with a transform, filter or `will-change:
   * transform`, and this scene already has one of those on an ancestor — which
   * would quietly scale the whole desk with the hero's zoom instead of letting it
   * sit in front. Portalling makes that class of accident impossible rather than
   * merely absent today.
   *
   * No `mounted` state and no effect to set one: `live` cannot be true during
   * SSR — it only latches once the user has actually dived — so `document` is
   * guaranteed to exist by the time this branch is reached. The guard is only
   * here so the invariant does not have to be taken on faith. */
  if (!live || typeof document === "undefined") return null;

  return createPortal(
    <>
      {/* The room, arriving before the desk. Fixed and full-frame at z 59, one step
       *  under the window it sits behind, and portalled with it rather than inside it
       *  for the reason above: `.monitor-reveal` clips its own contents to the opening
       *  window, so a backdrop rendered in there would only ever be visible *through*
       *  the window — the one place that does not need it. As a sibling it stays put
       *  while the window grows across it.
       *
       *  `pointer-events: none` is load-bearing rather than tidy: it covers the whole
       *  viewport at full height, so without it the hero underneath would stop
       *  receiving the clicks that drive the dive for the whole approach. */}
      <div className="monitor-backdrop" aria-hidden="true" />

      <div
        className={cn("monitor-reveal", active && "monitor-reveal--active")}
        // The station is scenery, but its text is the point of the whole scene, so it
        // stays in the accessibility tree. Out of the tab order though: reachable by
        // screen reader, never a series of sixty phantom tab stops.
        role="group"
        aria-label="Interactive terminal and keyboard"
      >
        {children}
      </div>
    </>,
    document.body,
  );
}

