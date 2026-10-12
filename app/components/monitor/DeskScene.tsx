"use client";

import type { RefObject } from "react";

import type { Theme } from "@/app/lib/palettes";

/** Where each object standing on the desk says its base is, in viewport pixels.
 *
 *  Reported by the scenes that draw them rather than measured here, because none of
 *  these three boxes is knowable from the outside: the monitor is fitted through a
 *  perspective camera by its height and the tower by whichever of two constraints ran out
 *  first, so both are a different size at every window size. Guessing any of them in this
 *  scene is what produced a desk the objects floated above.
 *
 *  Every field is a point on that object's *front* bottom edge, because the front edge is
 *  the one the eye compares against a desk's front edge, and the two points that give a
 *  cable somewhere to arrive from and leave. */
export interface DeskAnchors {
  /** The monitor stand's front-bottom centre, from `MonitorScene`. */
  monitorFoot: { x: number; y: number } | null;
  /** The monitor stand's neck — where its column meets the panel — from `MonitorScene`.
   *  The display cable climbs to this point rather than to the foot. */
  monitorNeck: { x: number; y: number } | null;
  /** The keyboard slab's front-bottom corners, from the station's fit measurement. */
  keyboardLeft: { x: number; y: number } | null;
  keyboardRight: { x: number; y: number } | null;
  /** The case's front-bottom corners, from `TowerScene`. Null when there is no case on
   *  the desk — below the breakpoint it is not rendered at all, and a cable to a machine
   *  that is not there is a cable to nowhere. */
  towerLeft: { x: number; y: number } | null;
  towerRight: { x: number; y: number } | null;
}

export interface DeskSceneProps {
  anchorsRef: RefObject<DeskAnchors>;
  screenElement: HTMLElement | null;
  theme: Theme;
  onFailed: () => void;
}

export function DeskScene(props: DeskSceneProps) {
  void props;

  return <div aria-hidden="true" className="station__desk" />;
}