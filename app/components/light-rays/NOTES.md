# LightRays — customized vendored copy

Source: [React Bits](https://reactbits.dev/) — `LightRays` component. This is a
**customized vendor copy**, not a from-scratch reimplementation. The WebGL setup
and both shaders are kept close to verbatim.

Upstream already renders this with `ogl`, so it needed no renderer port. (Its docs
compare the choice against `DitherVeil`, which also drives `ogl` directly.)

## Divergences from upstream

1. **`lightMode` is kept off, and that is deliberate.** The prop exists in
   upstream's source but is absent from its props table, and it cannot be used as
   an overlay. Its shader branch ends with `fragColor = vec4(mix(vec3(1.0), ink,
   energy), 1.0)` — alpha hard-coded to `1.0`, i.e. it paints the full canvas as
   an opaque sheet. The normal path instead carries the ray strength in the
   alpha channel (`rays1 * 0.5 + rays2 * 0.4`, where `vec4(1.0) * strength`
   gives `a = strength`), which is what lets the layer composite additively over
   the content behind it. Enabling `lightMode` here was measured to replace the
   entire hero background with a near-white sheet and hide the dithered clouds
   completely. The prop is still plumbed through `lib/palettes.ts`
   (`rayLightMode`) so it can be flipped in one place, but it must stay `false`
   while this layer sits above the clouds. For reference, `lightMode` is meant
   for a component that *is* the background — a white surface with dark beams —
   not for one that lightens a page.

2. **Props are applied through the uniform-sync effect, not by re-initialising
   the context.** Upstream's init effect lists every prop in its dependency
   array, so changing `raysColor` tears down the WebGL context and builds a new
   one. Since `raysColor` is theme-driven, every theme toggle would have flashed.
   The init effect here depends on `[isVisible]` only, and all prop changes go
   through the second effect, which writes the uniforms in place and calls
   `wake()`.

3. **`prefers-reduced-motion` is respected.** `iTime` stays at `0`, so the rays
   hold a single static frame instead of animating.

4. **Rendering pauses while the tab is hidden.** A `visibilitychange` listener
   stops the rAF loop and restarts it on return, so a backgrounded tab does not
   keep a WebGL context busy. The existing `IntersectionObserver` gate is kept
   and still decides when the context is created at all.

5. **The resize listener is named and removed on cleanup.** Upstream registers
   `window.addEventListener('resize', () => { ... })` with an inline function it
   can never remove, leaking a listener per mount.

6. **WebGL creation is guarded.** If the `Renderer` constructor throws, the
   component returns without mounting a canvas instead of taking down the page.

7. **Upstream's CSS `z-index: 3` is not used.** The vendored stylesheet keeps
   `position: relative` and no `z-index`, because this layer is stacked between
   the script name and the portrait in `hero/hero.css`.

8. **The renderer is created with `premultipliedAlpha: true`.** The normal shader
   path writes `fragColor = rays1 * 0.5 + rays2 * 0.4` from `vec4(1.0) *
   strength`, so the framebuffer colour already *is* the premultiplied colour.
   With the default `premultipliedAlpha: false` the compositor re-multiplies it
   (`src * a + dst * (1 - a)`), which squared the alpha and composited the layer
   toward grey. Measured on the light theme, that darkened the cream `#F4F1EA`
   field down to `#B0AFAD` in the ray origin region instead of lighting it.

9. **New `glow` prop (default `true`) — the ray colour is forced to white.**
   Being additive is not sufficient on a light page. Upstream multiplies the ray
   colour by per-channel brightness weights of `0.1..0.9` and then pulls it
   `1 - saturation` toward grey, so the resulting colour is a mid-tone no matter
   how the alpha is composited: it can only ever drag the page toward grey. With
   `glow` on, the noise keeps shaping the *coverage* only and the colour is set to
   white, which makes the layer a real light source on both themes. The colour is
   scaled by the same coverage value the alpha channel carries
   (`fragColor.rgb = vec3(1.0) * cover`) because the buffer is premultiplied —
   setting `rgb` to a constant `1.0` ignores the coverage and makes the layer
   saturate to an opaque white sheet wherever the rays are weak.

10. **New `intensity` prop (default `0.35`)** scales the finished `fragColor` once
    at the end of `mainImage`, so the layer's contribution to the page is tunable
    in one place. Driven from `RAY_OPTIONS.intensity` in `hero/Hero.tsx`.

## Updating

Re-fetch upstream `LightRays` (see reactbits.dev), re-apply the divergences above,
and update this file.
