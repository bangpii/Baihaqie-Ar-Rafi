"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

import { palettes, type Theme } from "@/app/lib/palettes";

/** Particle opacity, per theme.
 *
 *  Not `palettes.ink`/`paper`, and not black and white. The particles stand in front
 *  of `--desk-wall`, and a particle only reads if it separates from what is behind it:
 *  on the light wall that means ink, on the ink wall that means light. Both are the
 *  page's own ink and paper, so the field is always the same material as the page.
 *
 *  The two alphas are close, and that is measured rather than guessed. A first pass set
 *  dark to 0.34 to make the field visible against a deep blue wall, and it cost the rail
 *  text more than half its contrast: the particles lift the background under the rails
 *  from luminance 0.048 to 0.165, which took every spec line from 8.4:1 down to 4.1:1.
 *  The rails sit on the bare wall with no scrim, so anything painted behind them is
 *  subtracted straight out of their contrast.
 *
 *  So the ceiling here is the rails, not the wall. The dark wall is now kept so close
 *  to pure black that any visible field distances it from that (the shafts alone smear
 *  it grey), so the dark alpha is set only high enough to leave a whisper of depth. */
const PARTICLE: Record<Theme, { color: string; alpha: number }> = {
  light: { color: palettes.light.ink, alpha: 0.11 },
  dark: { color: palettes.dark.paper, alpha: 0.03 },
};

/** Grid size. 200x200 is the number the original wave was written at, and it is the
 *  wrong number here: that is 40,000 point sprites, each one a fragment shader
 *  invocation doing two `sin` and two `cos`, across a full-viewport canvas. It renders
 *  on a desktop and it does not render on a phone. 120x120 is a third of the work for a
 *  field that reads identically at this scale, and the wider `gap` below buys back the
 *  sense of density by spacing the survivors further apart. */
const GRID = { x: 120, y: 120, gap: 0.42 } as const;

/** Wave-seconds passed per real second, so the field moves at the same speed on a 60Hz
 *  laptop and a 144Hz monitor.
 *
 *  0.05 per *frame* was the original's rate, which is a scroll of its own: at 60fps
 *  that is 3.0 wave-seconds a second — the field crosses its cycle roughly every two
 *  seconds, faster than the eye can settle, and enough to pull attention straight off
 *  the terminal. At 0.72 a wave takes about nine seconds to pass, which reads as a swell. */
const WAVE_SPEED = 0.72;

/** Longest frame credited to the clock, so a tab that was backgrounded for a minute
 *  does not teleport the field forward when it wakes. */
const MAX_DELTA = 1 / 15;

export interface ParticleWaveProps {
  theme: Theme;
  className?: string;
}

const vertexShader = /* glsl */ `
  attribute float scale;
  uniform float uTime;

  void main() {
    vec3 p = position;
    float s = scale;

    // Height is sampled twice on purpose. The first reading displaces the point; the
    // second, taken after x has moved, is what varies the sprite's size — so a point
    // on a crest is both higher and brighter, which is the whole reason a wave reads
    // as a wave instead of as a rippling texture.
    p.y += (sin(p.x + uTime) * 0.5) + (cos(p.z + uTime) * 0.1) * 2.0;
    p.x += sin(p.z + uTime) * 0.5;
    s += (sin(p.x + uTime) * 0.5) + (cos(p.z + uTime) * 0.1) * 2.0;

    vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);

    // Perspective divide, so a point further away is a smaller point.
    gl_PointSize = s * 15.0 * (1.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 uColor;
  uniform float uAlpha;

  void main() {
    // Square sprites, no disc mask: 14,400 point sprites is a lot of overdraw, and a
    // per-fragment discard on a square this small buys a softness nobody can see at the
    // opacity this layer runs at.
    gl_FragColor = vec4(uColor, uAlpha);
  }
`;

export function ParticleWave({ theme, className }: ParticleWaveProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const uniformsRef = useRef<{ uColor: { value: THREE.Color }; uAlpha: { value: number } } | null>(null);

  /* Read through a ref so the mount effect has no dependency on `theme` at all. It
   * builds the scene once and must never rebuild it — see the theme effect below for
   * why rebuilding is visible — and depending on `theme` here would rebuild the scene,
   * the context and the wave's clock on every flip.
   *
   * Written in an effect rather than during render because a render-phase ref write is
   * not safe: a render that React throws away would still have mutated it, and the
   * scene would pick up a theme that was never committed. Effects below run in
   * declaration order, so this lands before the scene is built. */
  const themeRef = useRef(theme);

  useEffect(() => {
    themeRef.current = theme;
  }, [theme]);

  useEffect(() => {
    const host = hostRef.current;

    if (!host) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const tune = PARTICLE[themeRef.current];

    let renderer: THREE.WebGLRenderer;

    try {
      renderer = new THREE.WebGLRenderer({
        antialias: false,
        // See the header: alpha is what puts this layer under the wall instead of over it.
        alpha: true,
        powerPreference: "low-power",
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      host.appendChild(renderer.domElement);
    } catch {
      // No context. The room is still a room without a field in it, so there is nothing
      // to report upward and nothing to tear down.
      return;
    }

    renderer.domElement.setAttribute("aria-hidden", "true");

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, 1, 0.01, 1000);
    camera.position.set(0, 6, 5);

    const count = GRID.x * GRID.y;
    const positions = new Float32Array(count * 3);
    const scales = new Float32Array(count);

    let i = 0;
    let j = 0;

    for (let ix = 0; ix < GRID.x; ix += 1) {
      for (let iy = 0; iy < GRID.y; iy += 1) {
        positions[i] = ix * GRID.gap - (GRID.x * GRID.gap) / 2;
        positions[i + 1] = 0;
        positions[i + 2] = iy * GRID.gap - (GRID.y * GRID.gap) / 2;
        scales[j] = 1;
        i += 3;
        j += 1;
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("scale", new THREE.BufferAttribute(scales, 1));

    const uniforms = {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(tune.color) },
      uAlpha: { value: tune.alpha },
    };

    const material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      vertexShader,
      fragmentShader,
      uniforms,
    });

    uniformsRef.current = uniforms;

    const particles = new THREE.Points(geometry, material);
    scene.add(particles);

    let visible = true;
    let raf = 0;
    let elapsed = 0;
    let last = 0;

    const render = () => {
      camera.lookAt(scene.position);
      renderer.render(scene, camera);
    };

    const frame = (now: number) => {
      if (!visible) {
        raf = 0;

        return;
      }

      /* Reduced motion stops the clock rather than slowing it. A wave crawling at a
       * tenth speed is still moving, and the reduced-motion ask is that it not be.
       * One frame is drawn, and it stays on screen. */
      if (!reducedMotion.matches) {
        /* `last` is 0 on the first frame, which would be a delta of the full timestamp
         * and would throw the field forward by however long the page had been open. */
        const delta = last === 0 ? 0 : Math.min((now - last) / 1000, MAX_DELTA);
        last = now;
        elapsed += delta * WAVE_SPEED;
      } else {
        last = 0;
      }

      uniforms.uTime.value = elapsed;

      render();
      raf = requestAnimationFrame(frame);
    };

    const wake = () => {
      if (raf || !visible) return;
      /* Zeroed so the first frame after a stop does not credit the paused interval. */
      last = 0;
      raf = requestAnimationFrame(frame);
    };

    const stop = () => {
      if (!raf) return;
      cancelAnimationFrame(raf);
      raf = 0;
    };

    const layout = () => {
      const width = host.clientWidth;
      const height = host.clientHeight;

      if (!width || !height) return;

      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
      render();
    };

    const onMotionChange = () => {
      /* Leaving reduced motion resumes from wherever the clock stopped rather than
       * snapping to zero, so the field does not jump when the preference changes. */
      if (reducedMotion.matches) stop();
      else wake();
    };

    /* Off-screen is the common case for a page that can be at its hero or at this desk:
     * rendering a full-viewport field nobody is looking at is pure heat. */
    const visibilityObserver = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;

      if (visible) wake();
      else stop();
    });

    const resizeObserver = new ResizeObserver(() => layout());

    resizeObserver.observe(host);
    visibilityObserver.observe(host);
    reducedMotion.addEventListener("change", onMotionChange);

    layout();
    wake();

    return () => {
      stop();
      resizeObserver.disconnect();
      visibilityObserver.disconnect();
      reducedMotion.removeEventListener("change", onMotionChange);

      scene.remove(particles);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      renderer.domElement.remove();
      uniformsRef.current = null;
    };
  }, []);

  /* Theme is a uniform write, not a rebuild: the scene, its buffers, its context and its
   * running clock all survive a theme flip. Rebuilding on `theme` would restart the
   * wave from zero and drop the context — visible as a flicker on every theme toggle,
   * which is the exact moment a user is looking straight at this layer. */
  useEffect(() => {
    const uniforms = uniformsRef.current;

    if (!uniforms) return;

    const tune = PARTICLE[theme];
    uniforms.uColor.value.set(tune.color);
    uniforms.uAlpha.value = tune.alpha;
  }, [theme]);

  return <div aria-hidden="true" className={className} ref={hostRef} />;
}
