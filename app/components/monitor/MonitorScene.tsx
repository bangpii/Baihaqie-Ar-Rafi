"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { CSS3DObject, CSS3DRenderer } from "three/examples/jsm/renderers/CSS3DRenderer.js";

import { palettes, type Theme } from "@/app/lib/palettes";

import { HARDWARE } from "./hardware";

/** World units. Arbitrary but consistent: 1 unit reads as ~1cm on a 25-unit display.
 *
 *  These numbers are a 24-inch 16:9 panel, and they are the second time this model has
 *  been drawn from dimensions instead of from a picture of the thing. The first version
 *  was 26x17 — a 1.53 body around a 1.6 screen — which is not a shape any monitor is: it
 *  made the panel taller than its own screen wanted, and the slack came out as 1.4 units
 *  of bezel on every side including a chin as deep as the top bezel. A real 24" is 1.77
 *  inside and about 1.70 outside, because the glass sits on a slightly larger panel, and
 *  the three thin sides are *thin*: half a centimetre against a centimetre of chin.
 *
 *  That asymmetry is the whole of "looks like a real monitor". A symmetric bezel reads as
 *  a box with a screen in it; a chin deeper than the top reads as the part of a monitor
 *  that carries the badge, the OSD buttons and the vents, which is what a chin is for. */
const MODEL = {
  /** The panel: 1.70 aspect, 1.5 units thick — thinner than it was, because a thin edge
   *  catching one highlight is most of what makes a panel read as glass rather than box. */
  body: { w: 25.4, h: 14.9, d: 1.5, radius: 0.42 },
  /** 23.6 x 13.3 === 1.774, the screen's own aspect, and the number the DOM is fitted to. */
  screen: { w: 23.6, h: 13.3, d: 0.14, y: -0.3 },
  /** The bezel, stated as the two numbers that are actually seen: a 5mm top and an 11mm
   *  chin. The screen's centre therefore sits 3mm *below* the panel's centre, which is
   *  why `screen.y` is not zero and why the CSS3D object is moved with it. */
  bezel: { top: 0.5, chin: 1.1 },
  neck: { w: 2.6, h: 3.2, d: 1.3, radius: 0.36 },
  base: { w: 10.4, h: 0.72, d: 6.2, radius: 0.3 },
  /** How far the panel leans back, in radians. Monitors are not vertical — they are set
   *  to lean slightly away from the viewer, and the pivot for that lean is the neck
   *  joint at the panel's foot rather than its middle. */
  tilt: 0.055,
} as const;

/** Authoring size of the screen DOM element, in CSS pixels.
 *
 *  1180x665, which is `MODEL.screen` at exactly 50 CSS pixels to the world unit —
 *  23.6 / 1180 === 13.3 / 665, so the element and the plate it sits on have the same
 *  aspect to the last decimal and the desktop covers the glass and nothing but glass.
 *
 *  That equality is the whole reason for the number. The element was authored at
 *  1152x720 — a 1.6 aspect, correct for the 26x17 body this panel used to be — and the
 *  screen underneath it had since been redrawn as a 1.774 16:9 panel. A CSS3DObject is
 *  scaled by a *scalar*, so the two can never be reconciled after the fact: the element
 *  kept its 1.6 and was drawn 10.9% too tall for the plate. Measured at 1440x900 that
 *  was 12.6px of desktop hanging over the top bezel and 12.6px over the chin, with the
 *  panel's top edge painted on the plastic — which is exactly "the content does not sit
 *  inside the screen".
 *
 *  1cqw is unchanged by the correction: it was 11.52 authored pixels at a scale of
 *  0.02049 units per pixel, and it is 11.8 at 0.02. The type on the glass is the size
 *  it has always been; only the box it is laid out in is now the right shape. */
const SCREEN_DOM = { w: 1180, h: 665 } as const;

/** The screen plate sits just behind the bezel's front face (body.d / 2 === 0.75). */
const SCREEN_Z = 0.7;

/** Breathing room around the monitor when fitting, as a multiplier on its size. */
const FIT_MARGIN = 1.12;

/** Pointer parallax, as a rotation in radians at the extreme edge of the viewport. */
const TILT = 0.05;

export interface MonitorSceneProps {
  /** Whether the monitor is on. Drives the screen's emissive glow and its cast light. */
  powered: boolean;
  /** Theme, applied to the hardware and the accent without rebuilding the scene. */
  theme: Theme;
  /** Receives the element to portal the terminal into. */
  onScreenElement: (element: HTMLElement) => void;
  /** Receives the point in viewport pixels where the stand meets the desk, whenever
   *  the monitor is refitted.
   *
   *  Published rather than left to be guessed because the monitor's drawn size is not
   *  knowable from the outside: it is whichever of the two fit constraints ran out
   *  first, through a perspective camera, at this moment. The cable needs to leave the
   *  base and not the air 80px below it, and only the scene knows where the base is.
   *
   *  The mid-depth centre of the base's underside, not its front lip: the run starts
   *  tucked behind the foot and emerges from under it, which is what a cable plugged
   *  into a monitor does. The pointer parallax and the idle bob move it after this is
   *  published — both by a couple of pixels, on a slack cable, behind the stand. */
  onFootPoint: (point: { x: number; y: number }) => void;
  /** Receives the point in viewport pixels where the stand's column — the neck — meets
   *  the back of the panel, whenever the monitor is refitted.
   *
   *  The display cable does not run to the base: it climbs the stand and plugs into the
   *  neck, which is where the ports are on a real monitor. Published for the same reason
   *  the foot is: only the scene knows where its own neck is drawn at this window size. */
  onNeckPoint: (point: { x: number; y: number }) => void;
  /** Bumping this snaps the parallax back to rest, e.g. when the terminal takes focus. */
  recenterToken: number;
  /** Fires if WebGL is unavailable; the station then runs without a 3D body. */
  onFailed: () => void;
}

/** The handful of materials a theme swap has to repaint. */
interface ThemeableMaterials {
  body: THREE.MeshStandardMaterial;
  /** The frame the glass sits inside: darker than the panel, so the step around the
   *  screen is a shadow rather than a drawn line. */
  lip: THREE.MeshStandardMaterial;
  stand: THREE.MeshStandardMaterial;
  screen: THREE.MeshStandardMaterial;
  led: THREE.MeshBasicMaterial;
  /** The indicator's base red, held apart from `led.color` because the render loop
   *  rewrites that colour every frame from the power ramp — so the theme has to repaint
   *  the *source*, not the per-frame result. */
  ledAccent: THREE.Color;
  /** The red the power indicator pools on the chin while the panel is up. */
  ledGlow: THREE.PointLight;
  rim: THREE.DirectionalLight;
  backlight: THREE.PointLight;
}

export function MonitorScene({ powered, theme, onScreenElement, onFootPoint, onNeckPoint, recenterToken, onFailed }: MonitorSceneProps) {
  const canvasHostRef = useRef<HTMLDivElement | null>(null);
  const cssHostRef = useRef<HTMLDivElement | null>(null);

  /* Live inputs read by the render loop. A power toggle is a uniform change, not
   * a new scene — rebuilding would drop the GL context for something that costs
   * one float to lerp.
   *
   * Synced in an effect rather than during render on purpose. Writing a ref while
   * rendering is what the compiler rules flag, and rightly: a render can be thrown
   * away, and a ref written during one is a value from a commit that never
   * happened. Running after every commit costs four assignments and is always
   * describing the render that actually shipped. */
  const poweredRef = useRef(powered);
  const recenterRef = useRef(recenterToken);
  const onScreenElementRef = useRef(onScreenElement);
  const onFootPointRef = useRef(onFootPoint);
  const onNeckPointRef = useRef(onNeckPoint);
  const onFailedRef = useRef(onFailed);

  useEffect(() => {
    poweredRef.current = powered;
    recenterRef.current = recenterToken;
    onScreenElementRef.current = onScreenElement;
    onFootPointRef.current = onFootPoint;
    onNeckPointRef.current = onNeckPoint;
    onFailedRef.current = onFailed;
  });

  /* Set by the build effect, consumed by the theme effect below. Ordering
   * matters: the theme effect must not repaint materials that do not exist yet.
   *
   * `themeRef` is read once, inside the build effect, for the colour the scene
   * starts life with. It is deliberately not kept in step with `theme` on every
   * render: the build effect must not depend on the theme or it would tear the
   * scene down on every toggle, which is exactly what the theme effect exists to
   * avoid. */
  const materialsRef = useRef<ThemeableMaterials | null>(null);
  const themeRef = useRef(theme);

  useEffect(() => {
    const canvasHost = canvasHostRef.current;
    const cssHost = cssHostRef.current;

    if (!canvasHost || !cssHost) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let idleEnabled = !reducedMotion.matches;

    let renderer: THREE.WebGLRenderer;
    let cssRenderer: CSS3DRenderer;
    let pmrem: THREE.PMREMGenerator;
    let room: RoomEnvironment;

    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.05;
      canvasHost.appendChild(renderer.domElement);

      cssRenderer = new CSS3DRenderer();
      cssHost.appendChild(cssRenderer.domElement);

      pmrem = new THREE.PMREMGenerator(renderer);
      room = new RoomEnvironment();
    } catch {
      // No GPU, no context: the station keeps working, it just has no monitor body
      // behind the terminal. Same courtesy as DitherVeil's fallback.
      onFailedRef.current();

      return;
    }

    renderer.domElement.setAttribute("aria-hidden", "true");
    cssRenderer.domElement.setAttribute("aria-hidden", "true");

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 200);

    // RoomEnvironment gives the plastic and aluminium something to reflect. Without
    // it, MeshStandardMaterial metalness reads as flat grey paint — the tell that
    // makes CG hardware look like CG hardware.
    const envTexture = pmrem.fromScene(room, 0.04).texture;
    scene.environment = envTexture;

    // `root` carries the tilt, `model` carries the built geometry. Keeping them apart
    // lets the fit pass recenter the model without fighting the parallax.
    const root = new THREE.Group();
    const model = new THREE.Group();
    root.add(model);
    scene.add(root);

    // --- Geometry --------------------------------------------------------------
    const initialHardware = HARDWARE[themeRef.current];
    const initialAccent = palettes[themeRef.current].accent;

    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(initialHardware.body),
      roughness: 0.62,
      metalness: 0.08,
    });

    /* The panel, on a hinge at its own foot.
     *
     *  Everything that is the panel rather than the stand goes in this group: the shell,
     *  the glass, the frame around it, the badge, and — added further down, after the
     *  DOM exists — the screen the reader is actually looking at. Grouping them is not
     *  tidiness, it is correctness. A tilt applied to the shell and not to the CSS3D
     *  screen would show the reader a picture lying flat on a bezel standing up, and no
     *  amount of tuning elsewhere would hide that; putting the panel's contents in one
     *  place makes it impossible to tilt one without the other.
     *
     *  The pivot is at `body.h / 2` below the panel's centre — the neck joint — because
     *  that is the axis a monitor really turns on, and because pivoting about the middle
     *  would swing the panel's foot forwards off the top of the stand. */
    const panel = new THREE.Group();

    panel.position.y = -MODEL.body.h / 2;
    panel.rotation.x = -MODEL.tilt;
    model.add(panel);

    const body = new THREE.Mesh(
      new RoundedBoxGeometry(MODEL.body.w, MODEL.body.h, MODEL.body.d, 4, MODEL.body.radius),
      bodyMaterial,
    );

    body.position.y = MODEL.body.h / 2;
    panel.add(body);

    /* The frame around the glass.
     *
     *  A screen is not printed on the front of a monitor; it is set *into* one, a
     *  millimetre or two behind a lip that stands proud of the shell. Standing that lip
     *  up as its own thin plate is the difference between "a dark rectangle on a grey
     *  box" and "glass in a frame", and it costs one box and one material. It is
     *  deliberately larger than the glass rather than cut to it: a frame is what shows
     *  at the edges, so it has to be outside the thing it frames. */
    const lipMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(initialHardware.body).multiplyScalar(0.55),
      roughness: 0.62,
      metalness: 0.24,
    });

    const lip = new THREE.Mesh(
      new RoundedBoxGeometry(
        MODEL.screen.w + 0.42,
        MODEL.screen.h + 0.42,
        0.07,
        2,
        0.06,
      ),
      lipMaterial,
    );

    lip.position.set(0, MODEL.body.h / 2 + MODEL.screen.y, SCREEN_Z + 0.08);
    panel.add(lip);

    // The screen plate is what you see when the monitor is off: near-black, slightly
    // glossy glass. When it is on, the emissive lifts just enough to sell backlight
    // bleed without washing out the DOM sitting on top of it.
    const screenMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(0x05060a),
      roughness: 0.22,
      metalness: 0.1,
      emissive: new THREE.Color(initialAccent),
      emissiveIntensity: 0,
    });

    const screenPlate = new THREE.Mesh(
      new RoundedBoxGeometry(MODEL.screen.w, MODEL.screen.h, MODEL.screen.d, 2, 0.1),
      screenMaterial,
    );

    screenPlate.position.set(0, MODEL.body.h / 2 + MODEL.screen.y, SCREEN_Z);
    panel.add(screenPlate);

    // Stand.
    const standMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(initialHardware.body).multiplyScalar(0.9),
      roughness: 0.48,
      metalness: 0.32,
    });

    const neckTop = -MODEL.body.h / 2;

    const neck = new THREE.Mesh(
      new RoundedBoxGeometry(MODEL.neck.w, MODEL.neck.h, MODEL.neck.d, 3, MODEL.neck.radius),
      standMaterial,
    );

    neck.position.set(0, neckTop - MODEL.neck.h / 2, -0.1);
    model.add(neck);

    /* The hinge: the barrel the panel actually turns on.
     *
     *  A panel meeting a stand along a flat line reads as two objects stacked. A real
     *  one meets it through a cylinder a centimetre across, and that cylinder is the
     *  only part of a monitor whose silhouette the eye can check, because it is the part
     *  that is *supposed* to be a joint. It sits at the neck's top, across the panel's
     *  width, and the tilt above rotates around it. */
    const hinge = new THREE.Mesh(
      new THREE.CylinderGeometry(0.42, 0.42, MODEL.neck.w + 0.7, 14),
      standMaterial,
    );

    hinge.rotation.z = Math.PI / 2;
    hinge.position.set(0, neckTop - 0.34, -0.1);
    model.add(hinge);

    const base = new THREE.Mesh(
      new RoundedBoxGeometry(MODEL.base.w, MODEL.base.h, MODEL.base.d, 3, MODEL.base.radius),
      standMaterial,
    );

    base.position.set(0, neckTop - MODEL.neck.h - MODEL.base.h / 2, 0.3);
    model.add(base);

    /* A second, smaller plate on the base.
     *
     *  Real stands are not one slab: they step up towards the neck, so the top surface
     *  the column rises from is smaller than the footprint. One box on another gives that
     *  for a quarter of the geometry of a lathe-turned base, and the step's front edge
     *  catches the key light as a second, thinner highlight line. */
    const baseTop = new THREE.Mesh(
      new RoundedBoxGeometry(MODEL.base.w * 0.52, 0.24, MODEL.base.d * 0.62, 2, 0.1),
      standMaterial,
    );

    baseTop.position.set(0, base.position.y + MODEL.base.h / 2 + 0.1, 0.12);
    model.add(baseTop);

    // The power indicator on the chin. This is the one thing on a real monitor that
    // tells you whether it is up before you look at the screen, so it is the cue that
    // says "press enter" when it is dark and the confirmation that it is alive when it
    // is not. Standby keeps a dim pinprick of red; power blows it out and throws its
    // light onto the chin around it. The material is held separately so the theme
    // effect can repaint it through a typed reference rather than reading it back off
    // the mesh, which would mean a cast.
    const ledMaterial = new THREE.MeshBasicMaterial({ color: new THREE.Color(initialAccent) });
    const led = new THREE.Mesh(new RoundedBoxGeometry(0.5, 0.16, 0.06, 1, 0.05), ledMaterial);

    /* The chin, in the panel's own coordinates. The group is pivoted on the panel's foot,
     * so the panel spans y from 0 at its bottom edge to `body.h` at its top, and the chin
     * is simply the first `bezel.chin` of those units — its centre the half of it. */
    const chinMid = MODEL.bezel.chin / 2;

    led.position.set(MODEL.body.w / 2 - 1.9, chinMid, MODEL.body.d / 2 + 0.02);
    panel.add(led);

    /* The light the indicator casts while the panel is up. A point light just in front
     * of the LED, short-range so it stays a halo on the chin instead of washing the
     * whole panel: this is what makes the indicator read as *lit* rather than as a
     * painted red chip. Its intensity is driven by the same power ramp as the screen. */
    const ledGlow = new THREE.PointLight(new THREE.Color(initialAccent), 0, 2.6, 2);
    ledGlow.position.set(led.position.x, chinMid, MODEL.body.d / 2 + 0.14);
    panel.add(ledGlow);

    /* The badge. Not a logo — this project has no brand to put on a monitor, and a fake
     * one would be worse than none. What goes on the chin of every real panel is a
     * moulded strip: the badge's recess, or the seam where the bezel meets the shell.
     * Two marks standing slightly off the surface do the same job and stay honest, and
     * they are what stops the chin reading as the empty band it currently is. */
    for (const x of [-1.9, 1.9]) {
      const badge = new THREE.Mesh(
        new RoundedBoxGeometry(1.1, 0.07, 0.05, 1, 0.03),
        lipMaterial,
      );

      badge.position.set(x, chinMid, MODEL.body.d / 2 + 0.01);
      panel.add(badge);
    }

    // --- Lights ----------------------------------------------------------------
    scene.add(new THREE.AmbientLight(0xffffff, 0.5));

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.1);
    keyLight.position.set(-9, 11, 15);
    scene.add(keyLight);

    // Rim from behind-right, tinted with the page accent so the silhouette separates
    // from the page instead of dissolving into it.
    const rimLight = new THREE.DirectionalLight(new THREE.Color(initialAccent), 0.8);
    rimLight.position.set(12, 3, -9);
    scene.add(rimLight);

    // Backlight spill: the glow a real monitor throws onto its own bezel.
    const backlight = new THREE.PointLight(new THREE.Color(initialAccent), 0, 9, 2);
    backlight.position.set(0, 0, MODEL.body.d / 2 + 0.7);
    model.add(backlight);

    // Published so the theme effect can repaint without a rebuild.
    const themeMaterials: ThemeableMaterials = {
      body: bodyMaterial,
      lip: lipMaterial,
      stand: standMaterial,
      screen: screenMaterial,
      led: ledMaterial,
      ledAccent: new THREE.Color(initialAccent),
      ledGlow,
      rim: rimLight,
      backlight,
    };

    materialsRef.current = themeMaterials;

    // --- Fit -------------------------------------------------------------------
    // Measure the model *before* the screen object joins it. A CSS3DObject has no
    // geometry and contributes nothing to the bounds, but ordering it this way means
    // the fit cannot depend on DOM timing at all.
    const bounds = new THREE.Box3().setFromObject(model);
    const size = bounds.getSize(new THREE.Vector3());
    bounds.getCenter(model.position).negate();

    /* Where the stand meets the desk, in the model's own coordinates: the centre of the
     * base's front-bottom edge.
     *
     *  The front face rather than the middle of the base's depth, because the cable is
     *  drawn *over* the scene and this is the bottom of the silhouette as the viewer
     *  sees it: the nearest bottom edge projects lower than the far one, and an anchor
     *  halfway between them lands nine pixels up the stand's face, with the first
     *  stretch of cable painted across it. `bounds` is read before the recentring above
     *  moves the model, which is what `localToWorld` then accounts for. */
    const foot = new THREE.Vector3(0, bounds.min.y, bounds.max.z);
    /* The neck, in the model's own coordinates: the middle of the stand's column, at the
     *  depth its centre sits. This is the point the display cable climbs to, so it is the
     *  top of the run rather than the bottom. Read alongside `foot` so the two anchors are
     *  in the same frame. */
    const neckAnchor = new THREE.Vector3(0, neckTop - MODEL.neck.h / 2, -0.1);
    const projected = new THREE.Vector3();

    const fit = (width: number, height: number) => {
      const aspect = width / Math.max(height, 1);
      const tangent = Math.tan(((camera.fov * Math.PI) / 180) / 2);

      const distanceForHeight = size.y / 2 / tangent;
      const distanceForWidth = size.x / 2 / tangent / aspect;

      // Max, not min: that is what guarantees the monitor is never cropped on either
      // axis, however lopsided the stage is.
      camera.position.set(0, 0, Math.max(distanceForHeight, distanceForWidth) * FIT_MARGIN);
      camera.aspect = aspect;
      camera.near = Math.max(0.1, camera.position.z - size.z * 2);
      camera.far = camera.position.z + size.z * 4 + 20;
      camera.updateProjectionMatrix();
      camera.updateMatrixWorld();

      renderer.setSize(width, height);
      cssRenderer.setSize(width, height);

      /* Published after the projection is valid, in the same viewport coordinates the
       * station's cable is drawn in. `width`/`height` are the canvas box's own size,
       * so the device pixel ratio is nowhere in this and the answer is in CSS pixels. */
      const host = canvasHost.getBoundingClientRect();

      projected.copy(foot);
      model.localToWorld(projected);
      projected.project(camera);

      onFootPointRef.current({
        x: host.left + (projected.x * 0.5 + 0.5) * width,
        y: host.top + (0.5 - projected.y * 0.5) * height,
      });

      projected.copy(neckAnchor);
      model.localToWorld(projected);
      projected.project(camera);

      onNeckPointRef.current({
        x: host.left + (projected.x * 0.5 + 0.5) * width,
        y: host.top + (0.5 - projected.y * 0.5) * height,
      });
    };

    // The station decides how tall the stage is; the scene only needs to fit itself
    // to whatever box it is finally given.
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];

      if (!entry) return;

      const { width, height } = entry.contentRect;

      if (width > 0 && height > 0) fit(Math.round(width), Math.round(height));
    });

    observer.observe(canvasHost);

    // --- Screen DOM ------------------------------------------------------------
    const screenElement = document.createElement("div");
    screenElement.className = "monitor__screen-dom";

    const screenObject = new CSS3DObject(screenElement);
    screenObject.scale.setScalar(MODEL.screen.w / SCREEN_DOM.w);
    screenObject.position.set(
      0,
      MODEL.body.h / 2 + MODEL.screen.y,
      SCREEN_Z + MODEL.screen.d,
    );
    panel.add(screenObject);

    onScreenElementRef.current(screenElement);

    // --- Pointer parallax ------------------------------------------------------
    // Follows the pointer while it is over the page, and eases home when it leaves.
    const tiltCurrent = { x: 0, y: 0 };
    const pointer = { x: 0, y: 0 };
    let recentring = false;
    let lastToken = recenterRef.current;

    const onPointerMove = (event: PointerEvent) => {
      // A recentre in flight wins over pointer movement, otherwise nudging the mouse
      // while typing would cancel the snap the user just asked for.
      if (recentring) return;
      pointer.x = event.clientX / window.innerWidth - 0.5;
      pointer.y = event.clientY / window.innerHeight - 0.5;
    };

    const onPointerLeave = () => {
      pointer.x = 0;
      pointer.y = 0;
    };

    const onMotionChange = (event: MediaQueryListEvent) => {
      idleEnabled = !event.matches;
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    document.addEventListener("pointerleave", onPointerLeave, { passive: true });
    reducedMotion.addEventListener("change", onMotionChange);

    // --- Loop ------------------------------------------------------------------
    let power = poweredRef.current ? 1 : 0;
    let raf = 0;
    const clock = new THREE.Clock();

    const frame = () => {
      const delta = Math.min(clock.getDelta(), 0.05);
      const elapsed = clock.elapsedTime;

      // Power ramps rather than snaps. A soft bloom-up is most of what makes the
      // Enter toggle feel like hardware instead of a boolean.
      power += ((poweredRef.current ? 1 : 0) - power) * Math.min(1, delta * 7);
      screenMaterial.emissiveIntensity = power * 0.42;
      backlight.intensity = power * 2.4;

      // The power indicator rides the same ramp: a dim standby pinprick when the panel
      // is down, a blown-out red core and a pool on the chin once it is up. It breathes
      // very slightly so it reads as a live lamp and not as a painted chip — the breath
      // is dropped when motion is turned down, like every other idle animation here.
      const ledPulse = idleEnabled ? 1 + Math.sin(elapsed * 3.1) * 0.06 : 1;

      ledMaterial.color
        .copy(themeMaterials.ledAccent)
        .multiplyScalar((0.24 + power * 2.6) * ledPulse);
      ledGlow.intensity = power * 3.4 * ledPulse;

      // Recentre on demand: drain the pointer to zero and hold it there until it
      // arrives, so the monitor squares up to the viewer while they type.
      if (recenterRef.current !== lastToken) {
        lastToken = recenterRef.current;
        recentring = true;
      }

      if (recentring) {
        pointer.x *= 0.88;
        pointer.y *= 0.88;

        if (Math.abs(pointer.x) < 0.001 && Math.abs(pointer.y) < 0.001) {
          pointer.x = 0;
          pointer.y = 0;
          recentring = false;
        }
      }

      tiltCurrent.x += (-pointer.y * TILT - tiltCurrent.x) * Math.min(1, delta * 4.5);
      tiltCurrent.y += (pointer.x * TILT - tiltCurrent.y) * Math.min(1, delta * 4.5);

      root.rotation.x = tiltCurrent.x;
      root.rotation.y = tiltCurrent.y;

      renderer.render(scene, camera);
      cssRenderer.render(scene, camera);

      raf = requestAnimationFrame(frame);
    };

    raf = requestAnimationFrame(frame);

    // --- Teardown --------------------------------------------------------------
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      window.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerleave", onPointerLeave);
      reducedMotion.removeEventListener("change", onMotionChange);

      scene.environment = null;
      envTexture.dispose();
      room.dispose();
      pmrem.dispose();

      // Traverse the root, not the scene: `root` is already detached above.
      root.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        object.geometry.dispose();
        const { material } = object;

        if (Array.isArray(material)) material.forEach((entry) => entry.dispose());
        else material.dispose();
      });

      renderer.dispose();
      renderer.domElement.remove();
      cssRenderer.domElement.remove();
      screenElement.remove();
      materialsRef.current = null;
    };
  }, []);

  // Theme swap.
  //
  //  Repaints the existing materials instead of rebuilding the scene. Rebuilding
  //  would mean tearing down and recreating the GL context on every toggle, which
  //  flashes and re-runs PMREM — a visible stutter for something that is four
  //  colour assignments. `themeRef` is only read as a fallback if the build effect
  //  somehow has not landed yet, in which case there is nothing to repaint anyway.
  useEffect(() => {
    const materials = materialsRef.current;

    if (!materials) return;

    const body = new THREE.Color(HARDWARE[theme].body);
    const accent = new THREE.Color(palettes[theme].accent);

    materials.body.color.copy(body);
    materials.lip.color.copy(body).multiplyScalar(0.55);
    materials.stand.color.copy(body).multiplyScalar(0.9);
    materials.screen.emissive.copy(accent);
    materials.ledAccent.copy(accent);
    materials.ledGlow.color.copy(accent);
    materials.rim.color.copy(accent);
    materials.backlight.color.copy(accent);
  }, [theme]);

  return (
    <div className="monitor__stage">
      <div className="monitor__canvas-layer" ref={canvasHostRef} />
      <div className="monitor__dom-layer" ref={cssHostRef} />
    </div>
  );
}

