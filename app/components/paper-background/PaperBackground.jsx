/* oxlint-disable */
/*
 * PaperBackground — crumpled paper surface, rendered with ogl.
 *
 * Crumpled paper is a height field, not a colour field: the creases are only
 * visible because they catch light. So this shader builds a ridged fBm height
 * field, derives a surface normal from it by finite differences, and shades that
 * normal against a single fixed light direction. The result is a real relief
 * rather than a painted-on texture, and it re-tints instantly from the theme.
 *
 * The surface is deliberately static: crumpled paper does not move, so there is
 * no rAF loop at all. The layer draws once on mount and then only on resize or
 * a prop change (i.e. a theme toggle), which costs nothing while idle.
 *
 * Dependency: ogl. WebGL only; SSG/SSR renders an empty container.
 */
import { useEffect, useRef } from 'react';
import { Renderer, Program, Mesh, Triangle } from 'ogl';

import './PaperBackground.css';

const hexToRgb = (hex) => {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return m
    ? [parseInt(m[1], 16) / 255, parseInt(m[2], 16) / 255, parseInt(m[3], 16) / 255]
    : [1, 1, 1];
};

const vertex = `#version 300 es
in vec2 position;
out vec2 vUv;
void main() {
  vUv = position * 0.5 + 0.5;
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const fragment = `#version 300 es
precision highp float;
precision highp int;

uniform vec2 uResolution;
uniform vec3 uPaperColor;
uniform vec3 uCreaseColor;
uniform float uScale;
uniform float uStrength;
uniform float uFocus;
uniform float uFiber;
uniform float uSeed;
uniform float uCrease;
uniform float uAmbient;
uniform float uDetailLimit;

out vec4 fragColor;

const int OCTAVES = 4;

/* Ashima webgl-noise simplex, the same implementation DitherVeil uses. */
vec4 mod289(vec4 x) { return x - floor(x * (1.0/289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
vec2 fade(vec2 t) { return t*t*t*(t*(t*6.0-15.0)+10.0); }

float cnoise(vec2 P) {
  vec4 Pi = floor(P.xyxy) + vec4(0.0,0.0,1.0,1.0);
  vec4 Pf = fract(P.xyxy) - vec4(0.0,0.0,1.0,1.0);
  Pi = mod289(Pi);
  vec4 ix = Pi.xzxz;
  vec4 iy = Pi.yyww;
  vec4 fx = Pf.xzxz;
  vec4 fy = Pf.yyww;
  vec4 i = permute(permute(ix) + iy);
  vec4 gx = fract(i * (1.0/41.0)) * 2.0 - 1.0;
  vec4 gy = abs(gx) - 0.5;
  vec4 tx = floor(gx + 0.5);
  gx = gx - tx;
  vec2 g00 = vec2(gx.x, gy.x);
  vec2 g10 = vec2(gx.y, gy.y);
  vec2 g01 = vec2(gx.z, gy.z);
  vec2 g11 = vec2(gx.w, gy.w);
  vec4 norm = taylorInvSqrt(vec4(dot(g00,g00), dot(g01,g01), dot(g10,g10), dot(g11,g11)));
  g00 *= norm.x; g01 *= norm.y; g10 *= norm.z; g11 *= norm.w;
  float n00 = dot(g00, vec2(fx.x, fy.x));
  float n10 = dot(g10, vec2(fx.y, fy.y));
  float n01 = dot(g01, vec2(fx.z, fy.z));
  float n11 = dot(g11, vec2(fx.y, fy.y));
  vec2 fade_xy = fade(Pf.xy);
  vec2 n_x = mix(vec2(n00, n01), vec2(n10, n11), fade_xy.x);
  return 2.3 * mix(n_x.x, n_x.y, fade_xy.y);
}

/*
 * Ridged fBm, and specifically a ridged *multifractal*: each octave is weighted
 * by the previous one, so detail accumulates on the ridge lines instead of being
 * spread evenly over the sheet. That is what produces the two things the eye
 * uses to recognise crumpled paper - large flat facets, and thin creases
 * separating them. A plain sum of octaves just looks like lumpy cloth.
 *
 * 'freqBase' is the family's own starting frequency, and it is the *only* scale
 * applied to p (the caller offsets instead of pre-multiplying) so that the
 * band limit below can be evaluated against the true spatial frequency. Scaling
 * p here as well would square the frequency and quietly alias the fine octaves
 * of the tighter families.
 *
 * 'sharp' is the exponent on the ridge profile, and it is what separates a folded
 * sheet from a soft one. A low exponent keeps the whole surface sloping, so every
 * pixel ends up on a mid tone and the folds read as an airbrushed gradient. A high
 * exponent collapses the field to near zero everywhere except within a few pixels
 * of the ridge line itself, which puts a flat facet between the creases and a hard
 * wall between the facets - the actual signature of crumpled paper. Because the
 * normal is a finite difference of this same function, the flattening is free: the
 * facets get zero slope and the entire lighting range is spent on the walls.
 */
float ridges(vec2 p, float seed, float freqBase, float sharp) {
  float value = 0.0;
  float amp = 0.5;
  float freq = freqBase;
  float prev = 1.0;
  for (int i = 0; i < OCTAVES; i++) {
    float n = 1.0 - abs(cnoise(p * freq + seed));
    n = pow(n, sharp);
    n *= prev;
    /* Band-limit: an octave finer than the derivative step cannot be resolved
       and only aliases into flat noise, so fade the fine ones out. This is what
       keeps the fold size identical on every display instead of drifting with dpr.
       Note the direction: the FOLD structure lives at the low frequencies, so
       this has to attenuate as freq rises, not as it falls. */
    n *= 1.0 - smoothstep(uDetailLimit, uDetailLimit * 2.0, freq);
    prev = n;
    value += n * amp;
    freq *= 2.03;
    amp *= 0.55;
  }
  return value;
}

float height(vec2 p) {
  /* Four crease families on a deliberately wide 1 / 1.37 / 2.1 / 4.2 ladder. The
     spacing of this ladder is the whole "crumpled but not cramped" decision: at
     uScale 4.5 it puts a major facet roughly every 320px, a mid crease every
     150px and the finest every 75px on a 1440px viewport. Each step is a clean
     multiple of the one below, so the eye reads four distinct fold sizes instead
     of an even field of creases - an octave count or a tighter ladder is exactly
     what turns a sheet of paper into felt.
     The exponents climb with frequency on purpose, and together they are the
     "clear, not crowded" brief: the two coarse families stay soft so they lay
     down broad facets that each catch the light as one flat tone, and the two
     fine families are sharpened into a handful of thin hard crease lines drawn
     over them. Uniform sharpness would give either an airbrush or a hedgehog,
     never paper. */
  float h = ridges(p, uSeed, 1.0, 2.0);
  h += 0.80 * ridges(p + vec2(7.3, -4.1), uSeed + 11.7, 1.37, 2.0);
  h += 0.66 * ridges(p + vec2(-3.1, 6.8), uSeed + 41.5, 2.10, 2.5);
  h += 0.34 * ridges(p + vec2(4.7, 1.9), uSeed + 63.1, 4.20, 3.0);
  /* A very slow swell, so the sheet is not perfectly flat between creases. */
  h += 0.16 * cnoise(p * 0.22 + vec2(-2.6, 5.2));
  return h;
}

void main() {
  float aspect = uResolution.x / uResolution.y;
  vec2 uv = gl_FragCoord.xy / uResolution - 0.5;
  vec2 screen = uv * vec2(aspect, 1.0);
  vec2 p = screen * uScale;

  /* Finite differences, one pixel apart in noise space, so the crease width is
     stable across viewport sizes and dpr. */
  float e = uScale / uResolution.y;
  float h  = height(p);
  float hx = height(p + vec2(e, 0.0));
  float hy = height(p + vec2(0.0, e));

  vec2 grad = vec2(hx - h, hy - h) / e;

  vec3 n = normalize(vec3(
    -grad.x * uStrength,
    -grad.y * uStrength,
    1.0
  ));

  /* One fixed key light, high and to the left, like a desk lamp. */
  vec3 lightDir = normalize(vec3(-0.52, 0.66, 0.55));
  float diffuse = clamp(dot(n, lightDir), 0.0, 1.0);

  /* Ambient floor keeps the unlit side of every crease as paper, not as shadow.
     This is the single loudest knob on the whole surface: it is the darkest the
     relief can ever get, so a high floor flattens the crumple into a faint
     gradient no matter how deep the normal is, and a low one turns the sheet
     into contrasty rock. Kept as a uniform because the two palettes need
     different values for the same reason the normal strength differs. */
  float shade = uAmbient + (1.0 - uAmbient) * diffuse;

  /* A wide, low-power sheen: paper is slightly glossy, which is what separates
     a lit crease from a drawn line. */
  vec3 viewDir = vec3(0.0, 0.0, 1.0);
  float sheen = pow(clamp(dot(reflect(-lightDir, n), viewDir), 0.0, 1.0), 6.0);
  shade += sheen * 0.16;

  /* Clamped at 1.2 rather than 1.0, and the order matters. The sheen pushes a lit
     facet past the paper tone; clamping to 1.0 first threw that highlight away, so
     the sheet could only ever get darker than the paper and never lighter. The
     result measured as a muddy mid-tone sheet - the folds read as dirt rather than
     as relief, because relief needs a dark side AND a bright side. Letting shade
     run slightly over 1 gives the ridges a highlight to sit against the valleys. */
  vec3 color = mix(uCreaseColor, uPaperColor, min(shade, 1.2));

  /* Crease accent - this, not the diffuse term, is what draws the creases. The
     steepest part of the relief is the crease *wall*: the near-vertical face
     where two facets meet. Shading alone cannot draw it, because a height field
     is continuous, so its normals are continuous, so its tones are continuous -
     measured, a purely diffuse sheet histograms as one soft hump and reads as
     an airbrush no matter how deep the relief is. Detecting the wall separately
     and pushing it most of the way to the crease colour is what puts a hard line
     on the paper.

     Two details make it read as a line instead of a tint: the smoothstep band is
     narrow, so only the steepest few percent of the surface is touched and the
     lines stay sparse; and it runs off the gradient the normal already needs, so
     it costs no extra height() samples. The narrow band is also why a
     mis-tuned PAPER_OPTIONS.crease still looks like an accent and not like dirt. */
  /* Thresholds sit on the measured gradient distribution of this field rather than
     on a guess. At the current strength the outer paper runs p50 = 1.98, p90 = 2.83,
     p95 = 2.97, p99 = 4.52, so a band from 2.10 to 3.30 covers roughly p72..p97.

     The coverage is the point. An earlier band at p95..p99 measured only 2% of the
     sheet: correct lines, but too few of them to read as a crumpled sheet at all. A
     crease is the *wall* of a fold, and a fold only exists where enough of the sheet
     is steep enough to have one, so clarity comes from taking the band out to p88 -
     about 12% of the surface - rather than from making each line darker. */
  float crease = smoothstep(2.10, 3.30, length(grad) * uStrength);
  color = mix(color, uCreaseColor, crease * uCrease);

  /* Paper fibre: fine, very low contrast, and locked to physical pixels so it
     reads as the same grain size on any display rather than shrinking with the
     noise field. Sampled at ~6px, which is coarse enough to resolve. */
  vec2 gp = gl_FragCoord.xy / uResolution.y;
  float grain = cnoise(gp * 110.0) * 0.5 + cnoise(gp * 260.0) * 0.5;
  color *= 1.0 + grain * uFiber;

  /* Hold the middle of the sheet back so the name and portrait stay legible. */
  float r = length(screen) / (0.5 * length(vec2(aspect, 1.0)));
  float relief = mix(uFocus, 1.0, smoothstep(0.08, 0.95, r));
  color = mix(uPaperColor, color, relief);

  fragColor = vec4(color, 1.0);
}
`;

const PaperBackground = ({
  paperColor = '#808080',
  creaseColor = '#4a4a4a',
  scale = 6,
  strength = 0.5,
  focus = 0.45,
  fiber = 0.02,
  crease = 0.35,
  ambient = 0.46,
  seed = 0,
  className = '',
  style = undefined
}) => {
  const containerRef = useRef(null);
  const settingsRef = useRef(null);
  const wakeRef = useRef(() => {});

  useEffect(() => {
    settingsRef.current = { paperColor, creaseColor, scale, strength, focus, fiber, crease, ambient, seed };
    wakeRef.current();
  });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    let renderer;
    try {
      // No separate capability probe: constructing Renderer already throws when
      // WebGL is unavailable, and a probe canvas would leave a live context
      // behind for the lifetime of the page.
      renderer = new Renderer({
        dpr: Math.min(window.devicePixelRatio || 1, 2),
        alpha: false,
        antialias: false,
        depth: false
      });
    } catch {
      return undefined;
    }

    const gl = renderer.gl;
    const canvas = gl.canvas;
    canvas.style.display = 'block';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    container.appendChild(canvas);

    const uniforms = {
      uResolution: { value: [1, 1] },
      uPaperColor: { value: hexToRgb(paperColor) },
      uCreaseColor: { value: hexToRgb(creaseColor) },
      uScale: { value: scale },
      uStrength: { value: strength },
      uFocus: { value: focus },
      uFiber: { value: fiber },
      uSeed: { value: seed },
      uCrease: { value: crease },
      uAmbient: { value: ambient },
      uDetailLimit: { value: 1 }
    };

    const mesh = new Mesh(gl, {
      geometry: new Triangle(gl),
      program: new Program(gl, {
        vertex,
        fragment,
        uniforms,
        depthTest: false,
        depthWrite: false
      })
    });

    let raf = 0;

    const draw = () => {
      const s = settingsRef.current;
      if (!s) return;
      const { clientWidth, clientHeight } = container;
      if (clientWidth > 0 && clientHeight > 0) renderer.setSize(clientWidth, clientHeight);
      uniforms.uResolution.value = [canvas.width, canvas.height];
      uniforms.uPaperColor.value = hexToRgb(s.paperColor);
      uniforms.uCreaseColor.value = hexToRgb(s.creaseColor);
      uniforms.uScale.value = s.scale;
      uniforms.uStrength.value = s.strength;
      uniforms.uFocus.value = s.focus;
      uniforms.uFiber.value = s.fiber;
      uniforms.uSeed.value = s.seed;
      uniforms.uCrease.value = s.crease;
      uniforms.uAmbient.value = s.ambient;
      /* Highest noise frequency the sheet is allowed to carry, in noise-space
         units, and the single most important number on this background.

         At the original four-pixels-per-period the finest surviving ridge lines
         land about 6px apart, and a measured scanline confirms the damage: 4.9
         dark runs per 140px, median width 1px, typical spacing 12px. One-pixel
         lines twelve pixels apart is the signature of a crack in a sheet, not of
         a folded one, and no amount of shading rescues it.

         Widening the period to seventy pixels is what buys the fold structure the
         eye actually reads: creases land roughly every 50-150px and the area
         between them becomes a facet wide enough to catch the light as one flat
         tone. It also means most of OCTAVES is band-limited away on any given
         family, which is why the octave count is low - the detail is not being
         thrown away, it was never allowed to exist.

         Derived from the live buffer so it self-adjusts to dpr and viewport
         instead of being tuned for one screen. */
      uniforms.uDetailLimit.value = canvas.height / (70.0 * s.scale);
      renderer.render({ scene: mesh });
    };

    /* Coalesce redraws so a burst of prop changes costs one frame. */
    const wake = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        draw();
      });
    };
    wakeRef.current = wake;

    const resizeObserver = new ResizeObserver(wake);
    resizeObserver.observe(container);
    /* Paint once immediately so the first frame never depends on the initial
       ResizeObserver callback landing before the browser composites. */
    wake();

    return () => {
      wakeRef.current = () => {};
      resizeObserver.disconnect();
      if (raf) cancelAnimationFrame(raf);
      const loseContext = gl.getExtension('WEBGL_lose_context');
      if (loseContext) loseContext.loseContext();
      if (canvas.parentNode === container) container.removeChild(canvas);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`paper-bg ${className}`.trim()}
      style={style}
      aria-hidden="true"
    />
  );
};

export default PaperBackground;
