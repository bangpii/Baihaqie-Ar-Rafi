"use client";

import { useCallback } from "react";

import type { TowerAction } from "./TowerScene";

/** One control's copy, taken straight from `desktopCopy`. */
export interface TowerControl {
  action: TowerAction;
  /** The three letters printed on the case, and on the cap drawn here. */
  cap: string;
  /** What the control is, in the reader's language. The cap alone is a code. */
  label: string;
  /** What it is doing now, indexed by the control's own value. */
  states: readonly string[];
}

export interface TowerLegendProps {
  title: string;
  controls: readonly TowerControl[];
  note: string;
  /** Whether the machine is up. */
  powered: boolean;
  /** Whether the file manager is open on the glass. */
  filesOpen: boolean;
  /** Which fan speed step, 0-based. */
  fanStep: number;
  /** Fired by click and by Enter/Space, identically to a click on the case. */
  onAction: (action: TowerAction) => void;
  /** Which control the reader is pointing at *or* has focused. Hovering the ring on
   *  the case lights this row as well as the ring, so the scene and the rail stay one
   *  control seen twice rather than two controls that happen to agree. */
  hovered: TowerAction | null;
  onHovered: (action: TowerAction | null) => void;
}

export function TowerLegend({
  title,
  controls,
  note,
  powered,
  filesOpen,
  fanStep,
  onAction,
  hovered,
  onHovered,
}: TowerLegendProps) {
  /* One place that knows what each control's number means. The fan is the odd one —
   *  it has three states and wraps — which is exactly why `states` is a list and not
   *  a pair of on/off strings. Clamped, because the index comes from a counter the
   *  reader drives and an out-of-range one would print `undefined` into the rail. */
  const valueFor = useCallback(
    (action: TowerAction) => {
      if (action === "power") return powered ? 1 : 0;

      if (action === "drive") return filesOpen ? 1 : 0;

      return Math.max(0, Math.min(2, fanStep));
    },
    [powered, filesOpen, fanStep],
  );

  return (
    <section className="tower-legend-block">
      <h3 className="station__rail-subtitle">{title}</h3>

      <div className="tower-legend">
        {controls.map((control) => {
          const value = valueFor(control.action);
          const state = control.states[value] ?? control.states[0] ?? "";

          return (
            <button
              className="tower-legend__row"
              /* `on` is the row's own state, `lit` is the case's. They are different
               *  because they answer different questions: `on` asks what the control is
               *  doing, `lit` asks whether the reader is looking at the thing on the
               *  case that does it. Pointing at the ring in the scene has to light this
               *  row, or the two halves of one control stop being one control. */
              data-lit={hovered === control.action ? "true" : undefined}
              data-state={value > 0 ? "on" : "off"}
              key={control.action}
              /* `pressed` is not passed through: the browser's own focus ring and the
               *  case's depress animation are both honest press feedback, and a third
               *  one on the row would only be redundant. */
              onClick={() => onAction(control.action)}
              onFocus={() => onHovered(control.action)}
              onBlur={() => onHovered(null)}
              onPointerEnter={() => onHovered(control.action)}
              onPointerLeave={() => onHovered(null)}
              type="button"
            >
              <span className="tower-legend__cap" aria-hidden="true">
                {control.cap}
              </span>

              <span className="tower-legend__label">{control.label}</span>

              <span className="tower-legend__state">{state}</span>
            </button>
          );
        })}
      </div>

      <p className="tower-legend__note">{note}</p>
    </section>
  );
}
