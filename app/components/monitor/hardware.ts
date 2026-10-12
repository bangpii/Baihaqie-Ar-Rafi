import type { Theme } from "@/app/lib/palettes";

/** Per-theme colours for the plastic, the tinted glass and the wire mesh.
 *
 *  `body` is the face colour — the one measured against the wall in `globals.css`'s
 *  comments, at 1.65:1 on the light theme and 1.67:1 on the dark one, which is the
 *  whole reason the wall is tuned against it.
 *
 *  `panel` is the inset front bezel and the chassis sides. A step off `body` in both
 *  themes, and in opposite directions in effect: on the light theme it is *darker*,
 *  because a beige tower whose bezel is lighter than its shell has no edge to read;
 *  on the dark theme it is darker too, for the ordinary reason that dark plastic has
 *  nowhere to go but down.
 *
 *  `mesh` is the wire grille. It is the one value here that is *lighter* than its
 *  surroundings in both themes, because it is the only part of the machine that is
 *  lit from behind by anything: on the light theme by the room, on the dark theme by
 *  the fan LEDs and the power ring. */
export const HARDWARE: Record<
  Theme,
  { body: string; panel: string; mesh: string }
> = {
  light: { body: "#e7e4dd", panel: "#cdc8bd", mesh: "#8a857a" },
  dark: { body: "#20242b", panel: "#14171c", mesh: "#4c5461" },
};

/** Per-theme colours for the desk the machines stand on, in `DeskScene`.
 *
 *  Held here rather than in `globals.css` for the same reason `HARDWARE` is: this is
 *  hardware-coloured geometry drawn by a WebGL scene, not a DOM layer, and a scene that
 *  had to go and resolve a CSS custom property would be the only thing on this desk doing
 *  that. One edit moves the desk and both machines together.
 *
 *  Deliberately a step off the monitor rather than the same value as it. A monitor and
 *  the desk it stands on are two objects that happen to share a neutral palette, and
 *  painting them the identical grey makes the base of the stand disappear into the board
 *  it is standing on. `top` therefore tracks `HARDWARE.body` closely — the desk reads as
 *  the same grey family the monitor is — and `edge` and `frame` fall away from it so the
 *  board, its front lip and its legs separate as three surfaces.
 *
 *  On the light theme the desk is a hair *darker* than the monitor and on the dark theme a
 *  hair lighter, so the monitor is the lighter object in both. That is the arrangement a
 *  desk is usually photographed in, and it is the arrangement where the stand's own
 *  silhouette survives contact with the surface under it. */
export const DESK: Record<Theme, { top: string; edge: string; frame: string }> = {
  /*  Neutral and in the case's own family, warm tan gone: beside `#e7e4dd` the board
   *  reads `#f7f6f2` out of the renderer but has to *be* that light at the token,
   *  because this scene's key and ambient and ACES knock a lit surface down by a
   *  third and the room's flat half is tuned to the rendered result, not to the
   *  material. The frames stay a step below the board, which is what keeps the
   *  stand's silhouette reading as an object *on* the surface rather than part of
   *  it — the monitor's stand and the legs hold the contact, the surface holds the
   *  family. */
  light: { top: "#f7f6f2", edge: "#cccac2", frame: "#96948d" },
  dark: { top: "#6a727c", edge: "#3c434d", frame: "#4c535e" },
};

/** World units. Arbitrary but consistent, and the consistency is the point: the
 *  monitor and the tower are both authored in this scale and fitted by their own
 *  cameras, so "the same unit" is the only thing that makes a tower beside a monitor
 *  look like a tower beside a monitor rather than like two models of unrelated sizes.
 *
 *  1 unit reads as ~1cm against the monitor's 26-unit display face, which puts the
 *  monitor at roughly the width of a 24" panel and the tower at the height of a
 *  mid-tower beside it. */
export const UNITS = "cm" as const;
