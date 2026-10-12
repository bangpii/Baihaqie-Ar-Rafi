# DitherVeil — customized vendored copy

Source: [React Bits](https://reactbits.dev/) — `DitherVeil` component (WebGL,
powered by `ogl`). This is a **customized vendor copy**, not a from-scratch
reimplementation.

## Divergences from upstream

All changes exist so a **transparent cut-out PNG** (subject on alpha) renders
correctly in **both light and dark themes**:

1. **`backdrop` prop added.** Replaces the measured edge colour as the canvas
   "matte". `uMatte` is derived from `backdrop` every frame (in `frame()`), so
   the area around the transparent subject always matches the active theme
   (paper tone in light mode, ink tone in dark mode) and switches instantly on
   theme change — no reload needed.

2. **Alpha-aware fragment shader.** In `viewFragment`:
   - `framed` is multiplied by the sampled texture's alpha
     (`within(sampleUv) * sampled.a`), so fully transparent cells dither as the
     backdrop tone instead of sampling RGB(0,0,0).
   - The revealed `photo` is gated by `within(photoUv) * rawA`, so the
     hover-reveal shows the **true subject colours** where opaque and the
     backdrop tone where transparent (previously a transparent cut-out could
     reveal black).

3. **Backdrop in the diffusion key.** `updateDiffusion` includes `s.backdrop`
   in its cache key so switching theme re-runs Floyd-Steinberg/Atkinson
   diffusion against the correct matte fill.

4. **WebGL fallback.** Context creation is probed (webgl2/webgl) and the
   `Renderer` constructor is wrapped in try/catch. On failure the component
   sets `webglFailed` and renders a CSS-only fallback (`dither-veil__fallback`:
   duotone filter + scanline overlay, colour reveal on hover) instead of
   throwing `unable to create webgl context` and blanking the page.

5. **Dither confined to the subject.** A new `uBackdrop` uniform (the exact
   theme backdrop hex) replaces the halftoned matte outside the opaque subject:
   `solidOutside = 1 - smoothstep(0.002, 0.06, framed)`. Cells with zero alpha
   (transparent cut-out area and contain-mode letterbox bars) render as a solid
   theme colour, so dot/cell patterns never bleed onto the surrounding page.
   The dithered hologram dots appear only inside the person's silhouette, with
   a smooth blur at the anti-aliased edge.

6. **See-through around the subject.** Backed by divergences #1/#2, the
   framebuffer is now transparent instead of opaque: the `Renderer` is created
   with `alpha: true, premultipliedAlpha: false`, and the fragment shader
   outputs `fragColor.a = 1 - solidOutside` (opaque inside the silhouette,
   transparent outside). The page background supplies the surrounding tone, and
   the `hero-name` element is kept **behind** the veil in the DOM so the big
   script name shows through around the portrait but stays hidden behind the
   dithered body — no other behaviour altered.

Everything else is verbatim upstream. No other behaviour altered.

## Updating

Re-fetch upstream `DitherVeil` (see reactbits.dev), re-apply the divergences
above, and update this file.
6. Added a `sink` prop (0-1). At 1 the dither threshold is pushed past 1.0 and
   the reveal mask is forced to 0, so every cell resolves to the ink floor and
   the raw photo stops mixing in. Drives the deep-zoom dive in the hero: past a
   certain scale the halftone is one cell wide on screen, so the ending would
   otherwise be a coin flip between an ink dot and a paper dot.
