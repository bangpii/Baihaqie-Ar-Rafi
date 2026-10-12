export const themes = ["light", "dark"] as const;

export type Theme = (typeof themes)[number];

export type Palette = {
  ink: string;
  paper: string;
  backdrop: string;
  rim: string;
  accent: string;
  background: string;
  /** Ray-layer colour, and it means opposite things per theme.
   *
   *  The light layer is additive, so on the dark theme this is a real light source
   *  and wants to be white. On the cream theme it is not additive at all - the glow
   *  path is off there, because the paper already sits at 240 and an additive layer
   *  has only 15 levels of headroom before it clips - and the layer works as the soft
   *  shadow *between* the shafts instead. That means it wants to be well below the
   *  paper, not above it: a near-white ray colour measures out at a -2/255 wash,
   *  which is nothing. */
  ray: string;
  rayLightMode: boolean;
  /** Crumpled-paper surface behind the portrait. `paper` above is the veil's
   *  dot colour, which is a different surface, hence the distinct names.
   *
   *  `paperCrease` is deliberately a long way below `paperBase` rather than a
   *  near neighbour of it. It is the darkest the relief is allowed to go, so a
   *  tight paper-to-crease gap caps how crumpled the sheet can read no matter how
   *  the shader is tuned - measured, a 24-level gap leaves the creases as a faint
   *  tint. Do not close it: paperBase is the veil's matte and has to stay put,
   *  so the range is widened from this end. */
  paperBase: string;
  paperCrease: string;
};

export type Palettes = {
  light: Palette;
  dark: Palette;
};

export const palettes: Palettes = {
  light: {
    ink: "#171A22",
    paper: "#F4F1EA",
    backdrop: "#F4F1EA",
    rim: "#AB1111",
    accent: "#AB1111",
    background: "#F4F1EA",
    ray: "#8A8172",
    rayLightMode: false,
    paperBase: "#F4F1EA",
    paperCrease: "#C4B69A",
  },
  dark: {
    ink: "#0B0E14",
    paper: "#E6E8EE",
    backdrop: "#0B0E14",
    rim: "#EA2E2E",
    accent: "#EA2E2E",
    background: "#0B0E14",
    ray: "#E6E8EE",
    rayLightMode: false,
    paperBase: "#141821",
    paperCrease: "#04060A",
  },
};
