"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

import { palettes, type Theme } from "@/app/lib/palettes";

import { KALI_PATH } from "./KaliMark";
import { HARDWARE } from "./hardware";

/** The three things this case can do. A union rather than a bare string, because it is
 *  the vocabulary shared with `.tower__legend` in the DOM and with the station's
 *  dispatcher, and a typo in it should not compile. */
export type TowerAction = "power" | "drive" | "fan";

/** Model dimensions, in the shared world units (see `hardware.ts`).
 *
 *  A mid-tower is roughly 21 × 45 × 45 cm, which at this scale is 11 × 22 × 20. The
 *  depth is the one number that has to be argued about: true depth would make the
 *  case a corridor pointing at the viewer, dominating the stage it shares with the
 *  monitor. At 20 it reads as a case turned a few degrees toward the centre of the
 *  desk, which is what `FACING` below is for.
 *
 *  The interior sits at negative x throughout, and that is not a convention — it is
 *  the consequence of the yaw. A positive Y rotation swings a face's normal towards
 *  the camera only on the side it was turned *away* from, so after `FACING` the −X
 *  face is the one turned towards the reader and the one the glass belongs on. */
const CASE = {
  chassis: { w: 11, h: 22, d: 20, radius: 0.4 },
  /** The bezel stands proud of the chassis rather than flush with it: a case with a
   *  flat front has no edge to catch the key light, and the object reads as a
   *  silhouette instead of as a box with a face.
   *
   *  `d` is the bezel's width *across the front face*, which is the chassis's width —
   *  11 units, less a little for the corners. It was 18.8, which is the chassis's
   *  *depth*, and a front panel sized to the depth of the box it is fitted to hangs
   *  four units off each side of the case like a bracket. The cost was not cosmetic:
   *  the fit frames the silhouette, so a bezel that overhangs made the case 4 units
   *  wider than it is tall once yawed, the camera backed off to keep up, and the case
   *  drew smaller than its own lane while touching both edges of its canvas. */
  bezel: { w: 0.6, h: 20.4, d: 10.8 },
  glass: { w: 0.35, h: 19.4, d: 17.2, x: -5.5 },
  /** Diameters for the ring and the cap; the cap is what travels on a press. */
  /*  The two small controls are spaced by the *hit pads* in `HIT.padPixels` rather
   *  than by how they look: at 9 px to the unit a 1.5-unit ring is a 13px target,
   *  which is a decoration and not something a pointer can be aimed at. The pads
   *  need 2 units of clearance each, so the ring and the eject sit 4.2 units apart
   *  and the fan's disc, whose own top edge is at y = 1.8, has the eject's pad to
   *  itself above it. Read as a case: power high on the bezel, the eject below it,
   *  intake at the bottom, which is also how the real thing is arranged. */
  power: { ring: 1.5, cap: 0.95, x: 3.3, y: 8.8 },
  drive: { w: 1.5, h: 0.42, d: 0.5, x: 3.3, y: 4.6 },
  /** The front grille, and the one piece of the case that has to know where the panel
   *  is: the bezel's outer face is at `frontZ + bezel.w` = 10.6, and a grille at 10.4
   *  would be two tenths of a unit *inside* it — mounted behind its own panel, which
   *  renders as a case with a blank front and a fan nowhere. Mounted proud of the
   *  panel, which is where a fan with a wire grille in front of it actually lives. */
  intake: { x: 0, y: -2.6, r: 4.4 },
  interior: {
    board: { w: 0.4, h: 13, d: 15, x: -4.3, y: 1.2 },
    gpu: { w: 2.6, h: 1.9, d: 12, x: -2.4, y: -1.6, z: 1.4 },
    ram: { w: 0.5, h: 3.2, d: 0.34, x: -3.2, y: 4.2, z: -1.4, count: 4, gap: 0.9 },
    /* The CPU tower cooler and the M.2 drive, the two parts a glass side panel exists
     *  to show. Both are placed against the board's own face — the plane the reader looks
     *  through the glass at — rather than on the case's centre line, because a part
     *  floating a unit off the board it is mounted to is the one thing an open case makes
     *  obvious. `cooler.x` is the fin stack's centre; its fan hangs off the glass side of
     *  it by `cooler.fanGap`, and the stack's top stops short of the RAM bank above it. */
    cooler: { w: 0.34, h: 1.7, d: 0.85, x: -3.35, y: 1.1, z: 0, fan: 0.95, fanGap: 0.5 },
    nvme: { w: 0.12, h: 0.5, d: 2.6, x: -4.02, y: -2.6, z: -0.4 },
    shroud: { w: 3.4, h: 5.6, d: 17, x: -2.2, y: -7.4 },
    /* On the case's centre line and against its rear panel, not at x = -4.3 where the
     *  motherboard is. A fan is a disc in the plane of the panel it exhausts through,
     *  so a 3.6-unit disc centred 4.3 units off the axis is 2.4 units of fan hanging
     *  outside the case — which is also 2.4 units of width the fit had to frame. */
  },
  /** The two fans, and the only place in this model that had to stop making sense.
   *
   *  The intake used to sit at z = 7.2, which is correct and invisible: the front bezel
   *  is a solid plate, so a fan four units behind it is a fan nobody has ever seen. What
   *  was on the outside was three rings and eight spokes floating on that plate, which
   *  is what a fan looks like when someone has drawn the grille and forgotten the fan.
   *
   *  So the intake now sits *in* the front, on the panel's face, the way a fan behind a
   *  removable mesh filter actually appears from the front of a case — and the filter,
   *  the bore it is set into and the screws holding it there are all drawn, because the
   *  difference between a fan and a picture of a fan is that you can see the blades
   *  move behind the wire. */
  fans: {
    intake: { x: 0, y: -2.6, r: 4 },
    rear: { x: 0, y: -2.6, z: -9.3, r: 3.4 },
  },
} as const;

/** Yaw, in radians, turning the front bezel toward the centre of the desk.
 *
 *  Positive, because the tower stands on the left: turning its face to the right is
 *  turning it toward the reader, who is sitting centred on the monitor. Turned the
 *  other way it would present the glass panel and hide its own buttons.
 *
 *  0.24 and not 0.34, and the difference is worth half the case's size on screen. A
 *  yaw does not rotate a face, it rotates the whole *silhouette*: the projected width
 *  of this case is its width times the cosine plus its depth times the sine, so the
 *  20-unit depth contributes 4.8 units of sideways width here against 4.7 at 0.34 —
 *  3% of yaw for 3% of scale, which is not a trade any desk would refuse. */
const FACING = 0.24;

/** Breathing room around the case when fitting, as a multiplier on its size.
 *  Tighter than the monitor's 1.12: the monitor has to be allowed to run close to the
 *  stage edges, because it is the object the stage is for and this is not. */
const FIT_MARGIN = 1.08;

/** How far a pressed control travels into the case, in world units. Enough to read as
 *  a switch at a glance, small enough that the case does not look broken. */
const TRAVEL = { power: 0.24, drive: 0.14, fan: 0 } as const;

/** The hit pad's smallest on-screen diameter, in CSS pixels, for the two controls that
 *  need one. The fan does not: its own disc is 79px across.
 *
 *  A pad is invisible and exists purely so the pointer has something to find, which
 *  makes it the one piece of this case whose size is decided by the reader rather than
 *  by the object. 18px rather than the 24px touch guideline, deliberately: this case is
 *  a pointer target on a desktop, and it is removed from the page entirely below 900px
 *  where a finger would be the thing aiming at it. The pads are sized from the *fit*,
 *  so a wider lane grows them past 18 rather than leaving them behind. */
const HIT = { padPixels: 18 } as const;

/** Radians per second per fan step. Idle — the case switched off — is a tenth of the
 *  slowest step rather than a stop, because a case with three dead fans in a lit room
 *  reads as a prop and not as a machine. */
const FAN_STEPS = [1.6, 5.2, 11.4] as const;

const FAN_IDLE = 0.16;

/** Frame-rate independence for the hover and press lerps. At a fixed `0.15` per frame
 *  these feel identical at 60Hz and visibly sluggish at 144, because a lerp against a
 *  constant is a function of frame count rather than of time. */
const HOVER_EASE = 14;

const PRESS_EASE = 18;

export interface TowerSceneProps {
  /** Whether the machine is up. Lights the power ring, the interior and the fans. */
  powered: boolean;
  /** Whether the file manager is open on the glass. Lights the eject. */
  filesOpen: boolean;
  /** Which fan speed step, 0-based. */
  fanStep: number;
  theme: Theme;
  /** The control the reader is pointing at or has focused in the legend. */
  hovered: TowerAction | null;
  /** The control the reader just activated from the legend. */
  pressed: TowerAction | null;
  /** Fired by a raycast on the case, or by a legend button. */
  onAction: (action: TowerAction) => void;
  /** Reported when the pointer enters or leaves a control on the case, so the legend
   *  in the rail can light the row that belongs to it. Only on a *change*: the raycast
   *  runs on every pointer move across the whole lane, and a callback per move would be
   *  a React render per mouse move for a hover that has not changed. */
  onHover: (action: TowerAction | null) => void;
  /** Fires if WebGL is unavailable. The case then does not exist; the legend does. */
  onFailed: () => void;
  /** Reported in viewport pixels whenever the case is refitted: the two ends of its
   *  base's front-bottom edge, which is where the base meets the desk.
   *
   *  Published for `DeskScene`, which has to draw a surface the case can stand on and
   *  cannot know where the case is: like the monitor, it is fitted by a perspective camera
   *  to a lane whose size is a function of the window, so its footprint is unknowable from
   *  the outside. The front edge specifically, because that is the edge a desk's own front
   *  edge is read against, and the one a cable has to arrive at.
   *
   *  Nothing about the case's appearance depends on this — it is a projection, not a
   *  setting — which is why it can be added without the case being redrawn. */
  onBase: (base: { left: { x: number; y: number }; right: { x: number; y: number } }) => void;
}

/** Everything the loop needs to move or light, kept out of React's way.
 *
 *  `travel` is per-control rather than one number because the fan's target has nothing
 *  to press: its hit disc is invisible and a press on it is only meaningful as a glow
 *  on the grille, which the loop reads straight off `press`. */
interface Hotspot {
  action: TowerAction;
  /** The part that travels on a press — the cap or the eject, never the ring. */
  cap: THREE.Object3D;
  /** The part that lights. `null` where the control's feedback is not a lamp. */
  glow: THREE.MeshBasicMaterial | null;
  travel: number;
  /** The cap's resting z, so a press is a pure offset from where it was authored. */
  rest: number;
  hover: number;
  press: number;
  /** A decaying one-shot set on activation and read by the same lerp as `press`. */
  flash: number;
}

export function TowerScene({
  powered,
  filesOpen,
  fanStep,
  theme,
  hovered,
  pressed,
  onAction,
  onHover,
  onFailed,
  onBase,
}: TowerSceneProps) {
  const canvasHostRef = useRef<HTMLDivElement | null>(null);
  const hitHostRef = useRef<HTMLDivElement | null>(null);

  /* Live inputs, read by the render loop rather than captured by it. A power toggle
   * is a change of a few floats, not a new scene, and rebuilding the GL context for
   * one would flash and re-run PMREM.
   *
   * Synced in an effect on purpose rather than written during render: a render can be
   * thrown away, and a ref written during one describes a commit that never happened.
   * Running after every commit costs six assignments and is always describing the
   * render that actually shipped. */
  const poweredRef = useRef(powered);
  const filesOpenRef = useRef(filesOpen);
  const fanStepRef = useRef(fanStep);
  const hoveredRef = useRef(hovered);
  const pressedRef = useRef(pressed);
  const onActionRef = useRef(onAction);
  const onHoverRef = useRef(onHover);
  const onFailedRef = useRef(onFailed);
  const onBaseRef = useRef(onBase);

  useEffect(() => {
    poweredRef.current = powered;
    filesOpenRef.current = filesOpen;
    fanStepRef.current = fanStep;
    hoveredRef.current = hovered;
    pressedRef.current = pressed;
    onActionRef.current = onAction;
    onHoverRef.current = onHover;
    onFailedRef.current = onFailed;
    onBaseRef.current = onBase;
  });

  /* Set by the build effect, consumed by the theme effect below. Ordering matters:
   * the theme effect must not repaint materials that do not exist yet.
   *
   * `themeRef` is read once, inside the build effect, for the colour the scene starts
   * life with. It is deliberately not kept in step with `theme` on every render: the
   * build effect must not depend on the theme, or it would tear the scene down on
   * every toggle — which is exactly what the theme effect exists to avoid. The *live*
   * accent is `accentRef` instead, which the theme effect writes and the loop reads,
   * because the loop needs the current accent every frame and must not allocate a
   * `THREE.Color` sixty times a second to get it. */
  const materialsRef = useRef<{
    chassis: THREE.MeshStandardMaterial;
    bezel: THREE.MeshStandardMaterial;
    mesh: THREE.MeshStandardMaterial;
    ram: THREE.MeshStandardMaterial;
    fan: THREE.MeshStandardMaterial;
    glass: THREE.MeshStandardMaterial;
    /** The power ring, held apart from `glows` because it is the one lamp on this desk
     *  that is painted a colour rather than merely lit by one. */
    ring: THREE.MeshBasicMaterial;
    glows: THREE.MeshBasicMaterial[];
    /** The front activity dots: a row of LED indicators lit by the power state rather
     *  than by a control. */
    led: THREE.MeshBasicMaterial;
    /** The storage LED on the M.2 drive inside the case, which blinks with the same
     *  activity the front dots do. Repainted with the theme like the rest. */
    storage: THREE.MeshBasicMaterial;
    /*** The bezel's printed dragon badge, tinted by the accent. */
    badge: THREE.MeshBasicMaterial;
    ledLight: THREE.PointLight;
    rim: THREE.DirectionalLight;
    inside: THREE.PointLight;
  } | null>(null);

  const accentRef = useRef(new THREE.Color(palettes[theme].accent));
  const themeRef = useRef(theme);

  useEffect(() => {
    const canvasHost = canvasHostRef.current;
    const hitHost = hitHostRef.current;

    if (!canvasHost || !hitHost) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let idleEnabled = !reducedMotion.matches;

    let renderer: THREE.WebGLRenderer;
    let pmrem: THREE.PMREMGenerator;
    let room: RoomEnvironment;

    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.05;
      canvasHost.appendChild(renderer.domElement);
      pmrem = new THREE.PMREMGenerator(renderer);
      room = new RoomEnvironment();
    } catch {
      // No GPU, no context: the station keeps working, it just has no case standing
      // on the desk. Same courtesy as MonitorScene's fallback, and the legend buttons
      // below stay live either way.
      onFailedRef.current();

      return;
    }

    const canvas = renderer.domElement;

    canvas.setAttribute("aria-hidden", "true");

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 200);

    // The same environment the monitor stands in. Without it, MeshStandardMaterial
    // metalness reads as flat grey paint — the tell that makes CG hardware look like
    // CG hardware — and two scenes disagreeing about what the room looks like would
    // double it.
    const envTexture = pmrem.fromScene(room, 0.04).texture;
    scene.environment = envTexture;

    /* `root` carries the yaw and the fit; `caseGroup` is the machine. Keeping them
     *  apart lets the fit recentre the geometry without fighting the rotation. */
    const root = new THREE.Group();
    const caseGroup = new THREE.Group();

    root.add(caseGroup);
    root.rotation.y = FACING;
    scene.add(root);

    // --- Materials ---------------------------------------------------------------
    const initial = HARDWARE[themeRef.current];
    const initialAccent = accentRef.current;

    /* Matte, and matte on purpose.
     *
     *  0.62/0.08 where it was 0.58/0.12: a steel side panel is powder-coated, and the
     *  two numbers that make CG hardware look like CG hardware are a roughness low
     *  enough to show the environment as a reflection and a metalness that says
     *  "polished" on a surface that is neither. The roughness is what makes the key
     *  light fall off along the panel instead of sitting on it as a hotspot. */
    const chassisMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(initial.body),
      roughness: 0.62,
      metalness: 0.08,
    });

    /* The bezel is the one genuinely metallic thing on a real case — an anodised or
     *  brushed aluminium front, which is what makes a tower's face read as a face and
     *  not as the same box again. 0.38 metalness was halfway between paint and metal,
     *  which is the one finish that looks like neither; 0.72 with the roughness up
     *  gives brushed grain, so the panel catches the rim light along its brush
     *  direction rather than mirroring the room back at the reader. */
    const bezelMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(initial.panel),
      roughness: 0.34,
      metalness: 0.72,
    });

    /* The grille, as real geometry rather than a texture.
     *
     *  An alpha-mapped disc would have been cheaper and would have looked wrong: the
     *  fan has to be *seen* turning through it, which is the entire feedback for the
     *  one control on this case that is not a switch. Concentric rings and eight
     *  spokes is a dozen small meshes, and in exchange the grille catches the key
     *  light along its edges the way a stamped one does. */
    const meshMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(initial.mesh),
      roughness: 0.3,
      metalness: 0.82,
      emissive: initialAccent.clone(),
      emissiveIntensity: 0,
    });

    const interiorMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(0x14171d),
      roughness: 0.72,
      metalness: 0.22,
    });

    /* The glass side panel.
     *
     *  `MeshPhysicalMaterial` with transmission would be the accurate choice and is
     *  the wrong one here: it costs a scene render pass to fill, on a desk that
     *  already runs two frameloops. A thin, tinted, physically-smooth standard
     *  material reads the same at this size — a panel of glass seen from a metre away
     *  is a reflection and a tint, not a refraction. */
    const glassMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(initialAccent).multiplyScalar(0.4),
      roughness: 0.08,
      metalness: 0.1,
      transparent: true,
      opacity: 0.16,
      depthWrite: false,
    });

    // --- Geometry ----------------------------------------------------------------
    const chassis = new THREE.Mesh(
      new RoundedBoxGeometry(
        CASE.chassis.w,
        CASE.chassis.h,
        CASE.chassis.d,
        3,
        CASE.chassis.radius,
      ),
      chassisMaterial,
    );

    caseGroup.add(chassis);

    const frontZ = CASE.chassis.d / 2;
    const bezelPlane = frontZ + CASE.bezel.w;

    /* The intake, front to back, as it is actually assembled: a dark bore in the panel,
     * the fan sitting in it, and the wire filter clamped over the front of that.
     *
     *  Written as offsets from the bezel's face rather than as world depths, because
     *  these are the depths at which one part hides behind another and every one of
     *  them has to move together when the bezel's thickness changes. They are also the
     *  reason the assembly is visible at all: a fan behind a solid plate is a fan
     *  nobody has ever seen. */
    const INTAKE = {
      bore: bezelPlane + 0.02,
      frame: bezelPlane + 0.19,
      rotor: bezelPlane + 0.35,
      filter: bezelPlane + 0.8,
      hit: bezelPlane + 1.02,
    };

    // Front bezel, standing proud of the chassis face.
    const bezel = new THREE.Mesh(
      new RoundedBoxGeometry(CASE.bezel.w, CASE.bezel.h, CASE.bezel.d, 2, 0.2),
      bezelMaterial,
    );

    /* Rotated onto the front, and *positioned* onto the front.
     *
     *  The rotation turns the box's 0.6-unit axis from x to z, which makes the plate
     *  face the camera; the position then has to move it along z as well, and for a
     *  long time it did not — it was given `frontZ` on x, which is a number derived
     *  from the depth standing in for a position along the width. The result was a
     *  plate 10.3 units off to the case's right, hanging in the air beside a
     *  perfectly good front face, adding 5 units of sideways width to the silhouette.
     *
     *  That is not a cosmetic mistake. The fit frames the silhouette, so five phantom
     *  units of width put the camera 40% further back than the case needs, and a case
     *  drawn at 60% of its rightful size is a case whose power ring is 8px across and
     *  whose buttons cannot be found. The three controls were all along on the front
     *  plane at `bezelPlane`, which is where they should have been and where the
     *  missing plate was supposed to be. */
    bezel.rotation.y = Math.PI / 2;
    bezel.position.set(0, 0, frontZ + CASE.bezel.w / 2);
    caseGroup.add(bezel);

    const glass = new THREE.Mesh(
      new RoundedBoxGeometry(CASE.glass.w, CASE.glass.h, CASE.glass.d, 2, 0.15),
      glassMaterial,
    );

    glass.position.set(CASE.glass.x, 0, 0);
    caseGroup.add(glass);

    // --- Interior, seen through the glass -----------------------------------------
    const board = new THREE.Mesh(
      new RoundedBoxGeometry(
        CASE.interior.board.w,
        CASE.interior.board.h,
        CASE.interior.board.d,
        2,
        0.15,
      ),
      interiorMaterial,
    );

    board.position.set(CASE.interior.board.x, CASE.interior.board.y, 0);
    caseGroup.add(board);

    const gpu = new THREE.Mesh(
      new RoundedBoxGeometry(
        CASE.interior.gpu.w,
        CASE.interior.gpu.h,
        CASE.interior.gpu.d,
        2,
        0.2,
      ),
      interiorMaterial,
    );

    gpu.position.set(
      CASE.interior.gpu.x,
      CASE.interior.gpu.y,
      CASE.interior.gpu.z,
    );

    caseGroup.add(gpu);

    const shroud = new THREE.Mesh(
      new RoundedBoxGeometry(
        CASE.interior.shroud.w,
        CASE.interior.shroud.h,
        CASE.interior.shroud.d,
        2,
        0.2,
      ),
      interiorMaterial,
    );

    shroud.position.set(CASE.interior.shroud.x, CASE.interior.shroud.y, 0);
    caseGroup.add(shroud);

    /* The RAM bank, as four separate sticks rather than one bar: they are what tells
     *  the eye there is a motherboard in here at all. A single slab the same colour
     *  as the board it is soldered to does not. */
    const ramMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(initialAccent).multiplyScalar(0.55),
      roughness: 0.4,
      metalness: 0.2,
      emissive: initialAccent.clone(),
      emissiveIntensity: 0,
    });

    for (let index = 0; index < CASE.interior.ram.count; index += 1) {
      const stick = new THREE.Mesh(
        new RoundedBoxGeometry(
          CASE.interior.ram.w,
          CASE.interior.ram.h,
          CASE.interior.ram.d,
          1,
          0.08,
        ),
        ramMaterial,
      );

      stick.position.set(
        CASE.interior.ram.x,
        CASE.interior.ram.y,
        CASE.interior.ram.z + index * CASE.interior.ram.gap,
      );

      caseGroup.add(stick);
    }

    // --- CPU cooler, the M.2 drive and one cable ------------------------------------
    /* The parts that make the glass panel honest: without them the reader is looking
     * at an empty motherboard, which is worse than no window at all. Built at the
     * board's own depth and lit by the warm `inside` lamp like everything else in
     * there — they are components, not lamps, so no accent and no emissive. The one
     * exception is the storage LED on the drive's free end, because a storage LED is
     * exactly what a running machine shows, and it blinks with the same activity the
     * front dots do. */
    const finMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(0x232a35),
      roughness: 0.32,
      metalness: 0.85,
    });

    const coolerFins = new THREE.Mesh(
      new RoundedBoxGeometry(
        CASE.interior.cooler.w,
        CASE.interior.cooler.h,
        CASE.interior.cooler.d,
        2,
        0.08,
      ),
      finMaterial,
    );

    coolerFins.position.set(
      CASE.interior.cooler.x + 0.22,
      CASE.interior.cooler.y,
      CASE.interior.cooler.z,
    );

    caseGroup.add(coolerFins);

    const nvmeMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(0x10141b),
      roughness: 0.5,
      metalness: 0.6,
    });

    const nvme = new THREE.Mesh(
      new RoundedBoxGeometry(
        CASE.interior.nvme.w,
        CASE.interior.nvme.h,
        CASE.interior.nvme.d,
        1,
        0.05,
      ),
      nvmeMaterial,
    );

    nvme.position.set(CASE.interior.nvme.x, CASE.interior.nvme.y, CASE.interior.nvme.z);
    caseGroup.add(nvme);

    /* The little light on the stick's socket end, facing the glass the way an LED
     * faces the reader. A CircleGeometry faces +Z by default, so it is yawed a quarter
     * turn onto the drive's end plane. */
    const storageLedMaterial = new THREE.MeshBasicMaterial({
      color: initialAccent.clone(),
      transparent: true,
      depthWrite: false,
      opacity: 0,
    });

    const storageLed = new THREE.Mesh(new THREE.CircleGeometry(0.05, 12), storageLedMaterial);

    storageLed.rotation.y = -Math.PI / 2;
    storageLed.position.set(
      CASE.interior.nvme.x - CASE.interior.nvme.w / 2 - 0.02,
      CASE.interior.nvme.y,
      CASE.interior.nvme.z + CASE.interior.nvme.d / 2 - 0.3,
    );

    caseGroup.add(storageLed);

    /* A cable hanging from the PSU shroud to the board's edge — the one line of slack
     * that tells the eye the interior is assembled rather than drawn. A tube rather
     * than a path, because a cable has roundness and light like every other object
     * with a surface. */
    const cableMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(0x0b0d11),
      roughness: 0.9,
      metalness: 0.1,
    });

    const cableCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-2.6, -6.4, 2.4),
      new THREE.Vector3(-2.2, -6.0, 1.5),
      new THREE.Vector3(-2.9, -4.7, 0.8),
      new THREE.Vector3(-3.3, -4.4, 0.4),
    ]);

    const cable = new THREE.Mesh(new THREE.TubeGeometry(cableCurve, 18, 0.07, 6, false), cableMaterial);

    caseGroup.add(cable);

    // --- Fans ---------------------------------------------------------------------
    /* One rotor builder for both, because they differ in size and in nothing else — and
     *  because a fan built twice is a fan that spins at two different speeds on two
     *  sides of one case. */
    const fanMaterial = new THREE.MeshStandardMaterial({
      // A fan housing is never black. It is a dark grey that shows the light that
      // hits it, and pure black here is the whole difference between a component and
      // a hole cut in the case.
      color: new THREE.Color(0x0c0e12),
      roughness: 0.66,
      metalness: 0.14,
      emissive: initialAccent.clone(),
      emissiveIntensity: 0,
    });

    const bladeMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(0x1b1f26),
      roughness: 0.5,
      metalness: 0.3,
    });

    /* The label in the middle of a fan hub, which is the detail that makes the fan a
     * fan: a coloured dot with a ring around it, where every fan in the world has one
     * and no fan has ever been drawn without it. */
    const hubLabelMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(0x2b3038),
      roughness: 0.78,
      metalness: 0.05,
    });

    const fanRotor = (radius: number) => {
      const rotor = new THREE.Group();
      const blades = 9;
      const root = radius * 0.24;
      const tip = radius * 0.96;
      const rootWidth = radius * 0.54;
      const tipWidth = radius * 0.28;

      for (let index = 0; index < blades; index += 1) {
        /* The blade, as a shape rather than a box.
         *
         *  A rounded box spinning in a ring is a paper fan, and no amount of light on
         *  it will fix that: what the eye reads as a fan blade is the *sweep* — wide at
         *  the hub, narrower at the tip, and curved across its span so that no two
         *  points on it are at the same angle. So the outline is drawn once, in the
         *  plane of the fan, as a sliver with two curves in it, and extruded thin.
         *
         *  Nine blades rather than seven because that is what a 120mm case fan has,
         *  and the odd count is the other half of why the turning reads as rotation and
         *  not as a flicker. */
        const outline = new THREE.Shape();

        outline.moveTo(root, -rootWidth / 2);
        outline.quadraticCurveTo(
          (root + tip) * 0.52,
          -rootWidth * 0.6,
          tip,
          -tipWidth / 2,
        );
        outline.lineTo(tip, tipWidth / 2);
        outline.quadraticCurveTo(
          (root + tip) * 0.52,
          rootWidth * 0.32,
          root,
          rootWidth / 2,
        );
        outline.closePath();

        const blade = new THREE.Mesh(
          new THREE.ExtrudeGeometry(outline, {
            depth: 0.07,
            bevelEnabled: false,
            curveSegments: 10,
          }),
          bladeMaterial,
        );

        /* Pitch, about the blade's own span, before it is swung round the hub: every
         * blade is skewed identically or the rotor looks bent. */
        blade.rotation.x = 0.46;

        const spoke = new THREE.Group();

        spoke.rotation.z = (index / blades) * Math.PI * 2;
        spoke.add(blade);
        rotor.add(spoke);
      }

      const hub = new THREE.Mesh(
        new THREE.CylinderGeometry(radius * 0.21, radius * 0.23, 0.24, 20),
        bladeMaterial,
      );

      hub.rotation.x = Math.PI / 2;
      rotor.add(hub);

      const label = new THREE.Mesh(
        new THREE.CylinderGeometry(radius * 0.15, radius * 0.15, 0.06, 20),
        hubLabelMaterial,
      );

      label.rotation.x = Math.PI / 2;
      label.position.z = 0.13;
      rotor.add(label);

      return rotor;
    };

    /* The frame a fan is screwed into: four bars and a hole, plus a boss at each
     * corner for the screw that holds it to the case. Four bars rather than a ring
     * because that is the shape it arrives in, and because a square frame around a
     * round bore is the pair of shapes the eye needs to read "fan" at a glance. */
    const fanFrame = (radius: number) => {
      const frame = new THREE.Group();
      const side = radius * 2 + 0.7;
      const bar = 0.44;
      const depth = 0.4;

      for (const [w, h, x, y] of [
        [side, bar, 0, (side - bar) / 2],
        [side, bar, 0, -(side - bar) / 2],
        [bar, side - bar * 2, (side - bar) / 2, 0],
        [bar, side - bar * 2, -(side - bar) / 2, 0],
      ]) {
        const rail = new THREE.Mesh(
          new RoundedBoxGeometry(w, h, depth, 2, 0.1),
          fanMaterial,
        );

        rail.position.set(x, y, 0);
        frame.add(rail);
      }

      for (const x of [-1, 1]) {
        for (const y of [-1, 1]) {
          const boss = new THREE.Mesh(
            new THREE.CylinderGeometry(0.19, 0.21, depth + 0.16, 12),
            fanMaterial,
          );

          boss.rotation.x = Math.PI / 2;
          boss.position.set((x * (side - bar)) / 2, (y * (side - bar)) / 2, 0.04);
          frame.add(boss);

          /* The screw head in the boss. A shallow cylinder with a slot across it,
           * which at this size is four pixels of hardware and the whole difference
           * between a component and a part. */
          const screw = new THREE.Mesh(
            new THREE.CylinderGeometry(0.12, 0.12, 0.06, 10),
            bladeMaterial,
          );

          screw.rotation.x = Math.PI / 2;
          screw.position.set((x * (side - bar)) / 2, (y * (side - bar)) / 2, depth / 2 + 0.12);

          const slot = new THREE.Mesh(
            new RoundedBoxGeometry(0.17, 0.035, 0.03, 1, 0.01),
            fanMaterial,
          );

          slot.position.copy(screw.position);
          slot.position.z += 0.04;
          slot.rotation.z = x * y * 0.5;

          frame.add(screw, slot);
        }
      }

      return frame;
    };

    const intakeFan = fanRotor(CASE.fans.intake.r);
    const rearFan = fanRotor(CASE.fans.rear.r);

    intakeFan.position.set(CASE.fans.intake.x, CASE.fans.intake.y, INTAKE.rotor);
    rearFan.position.set(CASE.fans.rear.x, CASE.fans.rear.y, CASE.fans.rear.z);

    const intakeFrame = fanFrame(CASE.fans.intake.r);
    const rearFrame = fanFrame(CASE.fans.rear.r);

    intakeFrame.position.set(CASE.fans.intake.x, CASE.fans.intake.y, INTAKE.frame);
    rearFrame.position.set(CASE.fans.rear.x, CASE.fans.rear.y, CASE.fans.rear.z);

    caseGroup.add(intakeFan, rearFan, intakeFrame, rearFrame);

    /* The CPU cooler's fan, built by the same rotor builder, hung off the glass side of
     * the fin stack and yawed a quarter turn so it faces the reader through the panel.
     * The rotor spins about its own local Z whatever the mount's yaw — which is why the
     * frame loop only ever writes `rotation.z` here, exactly as it does for the two
     * case fans. */
    const coolerFan = fanRotor(CASE.interior.cooler.fan);

    coolerFan.rotation.y = -Math.PI / 2;
    coolerFan.position.set(
      CASE.interior.cooler.x - CASE.interior.cooler.fanGap,
      CASE.interior.cooler.y,
      CASE.interior.cooler.z,
    );
    caseGroup.add(coolerFan);

    // --- The intake: bore, fan, wire filter -------------------------------------------
    /* The bore is the shadow the assembly sits in. A dark disc on the panel is what
     * turns a fan that is merely in front of the case into one that is set *into* it —
     * the whole depth cue, for one circle, and cheaper than any amount of rim light. */
    const bore = new THREE.Mesh(
      new THREE.CircleGeometry(CASE.intake.r + 0.18, 32),
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(0x05060a),
        roughness: 0.9,
        metalness: 0.05,
      }),
    );

    bore.position.set(CASE.intake.x, CASE.intake.y, INTAKE.bore);
    caseGroup.add(bore);

    /* The wire filter, in front of the fan and only just.
     *
     *  Four rings and twelve spokes, against the three and eight that were here, and the
     *  extra wire is the point rather than the detail: a filter coarse enough to read as
     *  a spiderweb stops reading as a mesh, and this is the one place on the case where
     *  the reader is meant to see the fan turning *through* something. */
    for (const factor of [1, 0.8, 0.58, 0.34]) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(CASE.intake.r * factor, 0.05, 6, 36),
        meshMaterial,
      );

      ring.position.set(CASE.intake.x, CASE.intake.y, INTAKE.filter);
      caseGroup.add(ring);
    }

    for (let index = 0; index < 12; index += 1) {
      const spoke = new THREE.Mesh(
        new RoundedBoxGeometry(CASE.intake.r * 2, 0.055, 0.055, 1, 0.02),
        meshMaterial,
      );

      spoke.position.set(CASE.intake.x, CASE.intake.y, INTAKE.filter);
      spoke.rotation.z = (index / 12) * Math.PI;

      const spokeGroup = new THREE.Group();

      /* Half a step off the rings, so no spoke lands on a ring's crown. A grille whose
       * wires all meet at the same angle is a drawing of a grille. */
      spokeGroup.rotation.z = Math.PI / 12;
      spokeGroup.add(spoke);
      caseGroup.add(spokeGroup);
    }

    /* The lip the filter is clamped under: a chamfered ring standing a little proud of
     * the panel, which is what stops the wire from looking painted onto the bezel. */
    const filterLip = new THREE.Mesh(
      new THREE.TorusGeometry(CASE.intake.r + 0.34, 0.16, 8, 40),
      bezelMaterial,
    );

    filterLip.position.set(CASE.intake.x, CASE.intake.y, INTAKE.filter - 0.22);
    caseGroup.add(filterLip);

    /* The invisible hit disc, in front of the whole assembly.
     *
     *  It has to be in front, and it has to be invisible rather than absent: a ray
     *  that stopped at the filter would arrive at sixteen wires and a fan frame before
     *  it found the button, and a mesh that renders nothing is still a mesh a
     *  raycaster will happily hit. `opacity: 0` rather than `visible: false`, because
     *  only one of those is reliably a raycast target across three versions. */
    /* The invisible hit disc in front of the grille.
     *
     *  It has to be in front, and it has to be invisible rather than absent: a ray
     *  that stopped at the grille would arrive at nine rings and eight spokes before
     *  it found the button, and a mesh that renders nothing is still a mesh a
     *  raycaster will happily hit. `opacity: 0` rather than `visible: false`, because
     *  only one of those is reliably a raycast target across three versions. */
    const targetMaterial = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });

    const fanTarget = new THREE.Mesh(
      new THREE.CircleGeometry(CASE.intake.r, 24),
      targetMaterial,
    );

    fanTarget.position.set(CASE.intake.x, CASE.intake.y, INTAKE.hit);

    // --- Buttons --------------------------------------------------------------------
    const hotspots: Hotspot[] = [];
    const glowMaterials: THREE.MeshBasicMaterial[] = [];

    const addHotspot = (
      action: TowerAction,
      cap: THREE.Object3D,
      glow: THREE.MeshBasicMaterial | null,
      travel: number,
    ): Hotspot => {
      const hotspot: Hotspot = {
        action,
        cap,
        glow,
        travel,
        rest: cap.position.z,
        hover: 0,
        press: 0,
        flash: 0,
      };

      hotspots.push(hotspot);

      if (glow) glowMaterials.push(glow);

      return hotspot;
    };

    const powerRingMaterial = new THREE.MeshBasicMaterial({
      color: initialAccent.clone(),
      /* Set once, here, and never flipped again: a `transparent` flag that changes
       * per frame forces three.js to recompile the program every time it toggles,
       * which is the most expensive thing this scene could possibly do. Opacity is
       * the state; the flag is not. */
      transparent: true,
      depthWrite: false,
    });

    const powerRing = new THREE.Mesh(
      new THREE.TorusGeometry(CASE.power.ring / 2, 0.09, 8, 28),
      powerRingMaterial,
    );

    powerRing.position.set(CASE.power.x, CASE.power.y, bezelPlane + 0.16);
    caseGroup.add(powerRing);

    const powerCap = new THREE.Mesh(
      new THREE.CylinderGeometry(
        CASE.power.cap / 2,
        CASE.power.cap / 2,
        0.16,
        20,
      ),
      bezelMaterial,
    );

    /* The cylinder's axis is Y, which would stand the cap up out of the bezel;
     *  tipped onto Z it lies along the case front, which is the direction it
     *  travels when pressed. */
    powerCap.rotation.x = Math.PI / 2;
    powerCap.position.set(CASE.power.x, CASE.power.y, bezelPlane + 0.1);
    caseGroup.add(powerCap);

    const driveLedMaterial = new THREE.MeshBasicMaterial({
      color: initialAccent.clone(),
      transparent: true,
      depthWrite: false,
    });

    const driveCap = new THREE.Mesh(
      new RoundedBoxGeometry(
        CASE.drive.w,
        CASE.drive.h,
        CASE.drive.d,
        2,
        0.08,
      ),
      bezelMaterial,
    );

    driveCap.position.set(CASE.drive.x, CASE.drive.y, bezelPlane + 0.14);
    caseGroup.add(driveCap);

    const driveLed = new THREE.Mesh(
      new RoundedBoxGeometry(0.22, 0.22, 0.06, 1, 0.04),
      driveLedMaterial,
    );

    driveLed.position.set(CASE.drive.x + 1.3, CASE.drive.y, bezelPlane + 0.2);
    caseGroup.add(driveLed);

    /* The two pads: invisible, and in front of the lamps rather than on them.
     *
     *  This case is drawn about 200px tall, which puts its power ring at 13px and its
     *  eject at 4px of height. Both are honest sizes for a 44cm case, and neither is a
     *  size a pointer can be aimed at — so the artwork stays honest and the *target*
     *  does not. A disc and a plate, transparent and unlit, sitting a fraction of a
     *  unit proud of the bezel so a ray arrives at the pad before it arrives at the
     *  lamp, sized in `fit` from the pixels per unit this lane actually resolved to.
     *
     *  `CircleGeometry`/`PlaneGeometry` already face +Z, which is the direction the
     *  bezel faces, so neither needs the rotation the caps needed to lie along Z. */
    const powerPad = new THREE.Mesh(new THREE.CircleGeometry(1, 24), targetMaterial);

    powerPad.position.set(CASE.power.x, CASE.power.y, bezelPlane + 0.3);
    caseGroup.add(powerPad);

    const drivePad = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), targetMaterial);

    /* Centred between the eject and its LED rather than on the eject, because that is
     *  the thing the eye reads as one control: the cap is the part that moves and the
     *  LED is the part that answers. */
    drivePad.position.set(CASE.drive.x + 0.6, CASE.drive.y, bezelPlane + 0.3);
    caseGroup.add(drivePad);

    /* The front I/O, because a face with a power button on it and nothing else is a
     *  diagram of a case rather than a case.
     *
     *  A full modern deck, stepped along the bezel from the power button towards the
     *  case's left edge the way a real front panel is put together: USB-C, two USB-A,
     *  an HDMI, then the audio pair, all in one row under the power ring. None of them
     *  is a control — a port is a socket, not a switch, and a hit pad on one would
     *  promise a press that does nothing. They are here to be looked at.
     *
     *  Recessed rather than proud — a port is a hole, and a hole in a 44cm case
     *  photographed from a metre away is a dark rectangle, which is what these are:
     *  `interiorMaterial`, unlit, sitting a hair *behind* the bezel's outer face so the
     *  bezel's own edge draws the opening around them. The shapes are what tells the
     *  sockets apart at this size: small rounded rectangles for USB, a wider, lower one
     *  for HDMI, two circles for the jacks.
     *
     *  Cheap in the only currency that matters here: six pieces, no textures, and
     *  nothing added to the raycast list — they are decoration on a face the pointer
     *  passes over, and the pads in front of the real controls already own that
     *  ground. */
    const ioPorts = new THREE.Group();

    for (const [w, h, x] of [
      [0.4, 0.26, CASE.power.x - 0.6],
      [0.62, 0.3, CASE.power.x - 1.52],
      [0.5, 0.3, CASE.power.x - 2.42],
      [0.92, 0.24, CASE.power.x - 3.5],
    ] as const) {
      const port = new THREE.Mesh(
        new RoundedBoxGeometry(w, h, 0.22, 1, 0.04),
        interiorMaterial,
      );

      port.position.set(x, CASE.power.y, bezelPlane - 0.04);
      ioPorts.add(port);
    }

    for (const x of [CASE.power.x - 4.4, CASE.power.x - 5.18]) {
      const jack = new THREE.Mesh(
        new THREE.CylinderGeometry(0.14, 0.14, 0.22, 12),
        interiorMaterial,
      );

      jack.rotation.x = Math.PI / 2;
      jack.position.set(x, CASE.power.y, bezelPlane - 0.04);
      ioPorts.add(jack);
    }

    caseGroup.add(ioPorts);

    /* The four screws that hold a front panel on, at the panel's own corners.
     *
     *  Nothing here is a control and nothing here is lit on its own account: they are
     *  there because a case front with no fasteners is a *drawing* of a case front,
     *  and the eye checks for them the way it checks for a door handle. Three lines of
     *  geometry each, and they cost less attention than the bevel they sit inside. */
    for (const x of [-1, 1]) {
      for (const y of [-1, 1]) {
        const screwHead = new THREE.Mesh(
          new THREE.CylinderGeometry(0.15, 0.17, 0.07, 10),
          bezelMaterial,
        );

        screwHead.rotation.x = Math.PI / 2;
        screwHead.position.set(
          x * (CASE.bezel.d / 2 - 0.34),
          y * (CASE.bezel.h / 2 - 0.36),
          bezelPlane + 0.02,
        );
        caseGroup.add(screwHead);
      }
    }

    /* Two feet. A case that meets the desk on its own bottom edge looks pasted onto
     *  the wood; a case standing on two small rubber pads looks like it is standing
     *  there, and the shadow it casts is the difference. Placed at the front and back
     *  corners rather than centred, because that is where a chassis has feet. */
    const footMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(0x0a0b0e),
      roughness: 0.95,
      metalness: 0.02,
    });

    const feet = new THREE.Group();

    for (const x of [-1, 1]) {
      for (const z of [-1, 1]) {
        const foot = new THREE.Mesh(
          new RoundedBoxGeometry(1.5, 0.42, 1.9, 2, 0.16),
          footMaterial,
        );

        foot.position.set(
          x * (CASE.chassis.w / 2 - 1.1),
          -CASE.chassis.h / 2 - 0.18,
          z * (CASE.chassis.d / 2 - 1.6),
        );
        feet.add(foot);
      }
    }

    caseGroup.add(feet);

    /* The activity dots on the front panel.
     *
     *  Not an outline: the brief is small points of red that come on with the machine —
     *  the same little lights a window shows when it opens, dropped onto the case as
     *  indicator LEDs. `MeshBasicMaterial`, because an LED is a source and not a
     *  surface; a lit material would need a light of its own colour to look lit, which
     *  is the very thing these stand in for. Their opacity is the state: dark with the
     *  machine off, lit while it runs, so the case answers the switch without a label.
     *
     *  A row on the blank strip between the intake and the panel's bottom edge — the
     *  one part of the face that is otherwise empty, so the dots read as indicators
     *  rather than as decoration laid over the grille. */
    const ledMaterial = new THREE.MeshBasicMaterial({
      color: initialAccent.clone(),
      transparent: true,
      depthWrite: false,
      opacity: 0,
    });

    const LED = { count: 4, r: 0.17, gap: 0.9, y: -8.6, z: bezelPlane + 0.05 };

    for (let index = 0; index < LED.count; index += 1) {
      const dot = new THREE.Mesh(new THREE.CircleGeometry(LED.r, 20), ledMaterial);

      dot.position.set((index - (LED.count - 1) / 2) * LED.gap, LED.y, LED.z);
      caseGroup.add(dot);
    }

    /* The case's one printed mark: the dragon, on the blank lower-right of the bezel
     *  where a real front panel carries its badge and nothing else competes with it.
     *
     *  A canvas texture, drawn once from the same path the DOM mark uses and tinted by
     *  the material's colour, so the theme swap repaints it with the rest of the lamps
     *  rather than leaving a dark-theme red dragon on a cream case. White in the canvas
     *  and accent on the material is what makes that a one-line repaint. Unlit and thin
     *  on the panel, because a badge is printed ink, not a light. */
    const badgeCanvas = document.createElement("canvas");

    badgeCanvas.width = 128;
    badgeCanvas.height = 128;

    const badgeContext = badgeCanvas.getContext("2d");

    if (badgeContext) {
      badgeContext.scale(128 / 24, 128 / 24);
      badgeContext.fillStyle = "#ffffff";
      badgeContext.fill(new Path2D(KALI_PATH));
    }

    const badgeTexture = new THREE.CanvasTexture(badgeCanvas);

    badgeTexture.colorSpace = THREE.SRGBColorSpace;

    const badgeMaterial = new THREE.MeshBasicMaterial({
      color: initialAccent.clone(),
      map: badgeTexture,
      transparent: true,
      depthWrite: false,
    });

    const badge = new THREE.Mesh(new THREE.PlaneGeometry(1.25, 1.25), badgeMaterial);

    badge.position.set(4.3, -8.85, bezelPlane + 0.025);
    caseGroup.add(badge);

    const fanHotspot = addHotspot("fan", fanTarget, null, TRAVEL.fan);

    addHotspot("power", powerCap, powerRingMaterial, TRAVEL.power);
    addHotspot("drive", driveCap, driveLedMaterial, TRAVEL.drive);

    // --- Lights -----------------------------------------------------------------------
    scene.add(new THREE.AmbientLight(0xffffff, 0.46));

    /* The same key light the monitor has, from the same direction, and that is not a
     *  detail: the two machines stand in one room, lit by one window. If the tower's
     *  key came from anywhere else, the raked shafts in `room.css` would be lying
     *  about where the light in this room is coming from. */
    const keyLight = new THREE.DirectionalLight(0xffffff, 2.05);

    keyLight.position.set(-9, 11, 15);
    scene.add(keyLight);

    /* The rim comes from behind-left rather than behind-right as it does on the
     *  monitor, and the reason is the yaw. The monitor faces the reader square on, so
     *  its shadowed edge is its right one. The tower is turned away from the reader
     *  by `FACING`, which puts its right edge out of sight and presents the edge it
     *  would otherwise lose against the wall. Same light in the room, different edge
     *  of the object doing the separating. */
    const rimLight = new THREE.DirectionalLight(initialAccent.clone(), 0.75);

    rimLight.position.set(-14, 5, -7);
    scene.add(rimLight);

    /* Inside the case. This is the light that makes the glass worth having: without
     *  it the panel is a tint over a dark void and the interior geometry is spent.
     *  Warm rather than accent-coloured, because in a real case the LEDs are the
     *  accent and the light bouncing off the board is not. */
    const inside = new THREE.PointLight(0xfff2df, 0, 22, 2);

    inside.position.set(-2, 1, 2);
    caseGroup.add(inside);

    /* The little colour the activity dots spill. Dots that are merely bright read as
     *  paint; dots with a tint of their own on the panel around them read as lit. Kept
     *  weak and close so the row colours the lower edge of the case rather than
     *  flooding the desk red. */
    const ledLight = new THREE.PointLight(initialAccent.clone(), 0, 14, 2);

    ledLight.position.set(0, LED.y + 1.4, bezelPlane + 2.2);
    caseGroup.add(ledLight);

    materialsRef.current = {
      chassis: chassisMaterial,
      bezel: bezelMaterial,
      mesh: meshMaterial,
      ram: ramMaterial,
      fan: fanMaterial,
      glass: glassMaterial,
      ring: powerRingMaterial,
      glows: glowMaterials,
      led: ledMaterial,
      storage: storageLedMaterial,
      badge: badgeMaterial,
      ledLight,
      rim: rimLight,
      inside,
    };

    // --- Fit ------------------------------------------------------------------------------
    /* Measured on the whole case, in world space, with the yaw already baked in.
     *
     *  Both halves of that sentence are load-bearing, and the second one was the bug
     *  this comment exists to prevent repeating.
     *
     *  `setFromObject` walks `matrixWorld`, and `matrixWorld` is only ever refreshed by
     *  a render — so measuring before the first frame measured the case *unturned*: an
     *  11-unit-wide box instead of a 15.4-unit silhouette. The fit then believed the
     *  case was 11 units wide and framed it as such, and a 20-unit-deep box rotated
     *  even 14 degrees does not fit inside an 11-unit frame. The case was drawn a
     *  third wider than its canvas, the edges were cropped, and both small controls —
     *  which live at the far side of the front bezel, where the yaw pushes them —
     *  fell outside the frustum entirely. Not merely unclickable: not on screen. The
     *  fan survived because it sits on the case's centre line. Hence the explicit
     *  `updateMatrixWorld` below rather than a hope that something else refreshed it.
     *
     *  Measured on `caseGroup` and not `root`, because `caseGroup` holds the machine
     *  and `root` will hold nothing but the yaw. */
    root.updateMatrixWorld(true);

    /* The shell, by name.
     *
     *  `setFromObject(caseGroup)` would also have measured the three invisible hit
     *  targets and the pads, and a hit target is a disc of the size the *pointer* needs
     *  rather than the size the *object* is — so the camera would frame the aimability
     *  of this case instead of the case. The four parts below are the case's outside:
     *  the chassis, the front panel, the glass, and the feet — the last of which stand
     *  below the chassis, so leaving them out would measure a case floating over its
     *  own shadow and clip them at the desk line. Everything else is either inside
     *  those or standing proud of them by less than the margin. */
    const bounds = new THREE.Box3();

    for (const part of [chassis, bezel, glass, feet]) bounds.expandByObject(part);

    const size = bounds.getSize(new THREE.Vector3());

    bounds.getCenter(caseGroup.position).negate();

    const fit = (width: number, height: number) => {
      /* The base's front-bottom corners, in this fit's own coordinates. Allocated
       * fresh rather than reused: `localToWorld` and `project` both mutate their
       * argument, so a corner vector carried between fits is the previous fit's NDC
       * value by the time the next one transforms it — and the reported base —
       * which is exactly the corruption that used to send the desk a tower four
       * hundred pixels up in the air and the case-to-monitor cable to nowhere.
       * Two vectors per resize is noise against the scene build it sits next to. */
      const cornerLeft = new THREE.Vector3(
        -CASE.chassis.w / 2,
        -CASE.chassis.h / 2,
        CASE.chassis.d / 2,
      );

      const cornerRight = new THREE.Vector3(
        CASE.chassis.w / 2,
        -CASE.chassis.h / 2,
        CASE.chassis.d / 2,
      );

      const baseLeft = new THREE.Vector2();
      const baseRight = new THREE.Vector2();

      const aspect = width / Math.max(height, 1);
      const tangent = Math.tan(((camera.fov * Math.PI) / 180) / 2);

      /* Fit the *projected* box, at the depth that projects largest.
       *
       *  A box 22 units tall and 20 deep does not project as a 22-unit rectangle, and
       *  this is the second time that has cost the case its size. The corners nearest
       *  the camera — the front face, the one carrying every control on it — spread
       *  further from the centre than the box's own half-height, so fitting `size.y`
       *  framed the case's middle and let the two faces at its ends fall off the canvas:
       *  a 22-unit box drawn 27 units tall, the fan a third of the way out of frame and
       *  the power ring gone entirely.
       *
       *  The correction is additive, and that is the whole of it. If the near face is
       *  half a depth in front of the origin and the frustum there has to be exactly the
       *  case's height, then `(d − depth/2) · 2 · tan(fov/2) = height`, which solves to
       *  `d = depth/2 + height / (2 tan)`. An earlier attempt multiplied by the ratio
       *  instead, which is the same statement written with `camera.position.z` on both
       *  sides — a value that is still the *previous* fit's when the first one runs, so
       *  the factor was 1 exactly when it was needed. */
      const halfDepth = size.z / 2;

      const distanceForHeight = halfDepth + size.y / 2 / tangent;
      const distanceForWidth = halfDepth + size.x / 2 / tangent / aspect;

      // Max, not min: that is what guarantees the case is never cropped on either
      // axis, however lopsided its box is.
      camera.position.set(
        0,
        0,
        Math.max(distanceForHeight, distanceForWidth) * FIT_MARGIN,
      );

      camera.aspect = aspect;
      camera.near = Math.max(0.1, camera.position.z - size.z * 2);
      camera.far = camera.position.z + size.z * 4 + 20;
      camera.updateProjectionMatrix();

      /* The base's projection below reads the camera's world matrix, and `project` does
       *  not refresh it — only a render does, and this runs before the first one. Without
       *  this the case reports its base through the camera it had on the previous refit,
       *  which for the very first refit is the origin. */
      camera.updateMatrixWorld();
      renderer.setSize(width, height);

      /* Pads, in the one place that knows the scale this lane resolved to.
       *
       *  From the camera rather than from `size.y`: what a pad has to hit is the case's
       *  *on-screen* size, and `size.y` measured the case before `FIT_MARGIN` and before
       *  whichever of the two distances won, so it is the case's size and not its
       *  projected size. The frustum's own height at the case's depth is
       *  `2 · z · tan(fov/2)` world units over `height` pixels, and that is exactly the
       *  number a target has to be divided by. Divided by two again for a radius: the
       *  pads are discs and plates, and 18px of *radius* would be a 36px target, which
       *  is the number the guideline is actually about.
       *
       *  Measured at the origin's depth, where the pads are not: they sit on the front
       *  panel, half the case's depth nearer the camera, which magnifies them by the
       *  same ratio the perspective magnifies the panel — about a fifth at the widths
       *  this desk is drawn at, so an 18px pad lands at 21. The error is in the
       *  direction of being easier to hit, which is the only direction worth being
       *  wrong in here, and sizing it off the near face instead would mean the pads
       *  change shape every time the case's depth changed. */
      const pixelsPerUnit = height / (2 * camera.position.z * tangent);

      const padRadius = HIT.padPixels / 2 / pixelsPerUnit;

      powerPad.scale.setScalar(padRadius);
      drivePad.scale.set(padRadius * 2, padRadius * 2, 1);

      /* Where the case meets the desk, in the same viewport pixels the station draws its
       * cables in.
       *
       *  The two ends of the chassis's own front-bottom edge, taken in `caseGroup`'s
       *  coordinates and pushed through `localToWorld` — which is what accounts for the
       *  recentring the fit above applied and for the yaw, neither of which this scene
       *  ever sees as a number. Read after `updateMatrixWorld`, or the projection would
       *  be of the case as it was authored rather than as it is drawn, and the desk would
       *  be built a third of a case too far to the left.
       *
       *  `width` and `height` here are the canvas box's own size, so the device pixel ratio
       *  is nowhere in this and the answer is in CSS pixels. */
      const host = canvasHost.getBoundingClientRect();

      for (const [corner, sign] of [
        [cornerLeft, -1],
        [cornerRight, 1],
      ] as const) {
        caseGroup.localToWorld(corner);
        corner.project(camera);

        (sign < 0 ? baseLeft : baseRight).set(
          host.left + (corner.x * 0.5 + 0.5) * width,
          host.top + (0.5 - corner.y * 0.5) * height,
        );
      }

      onBaseRef.current({
        left: { x: baseLeft.x, y: baseLeft.y },
        right: { x: baseRight.x, y: baseRight.y },
      });
    };

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];

      if (!entry) return;

      const { width, height } = entry.contentRect;

      if (width > 0 && height > 0) fit(Math.round(width), Math.round(height));
    });

    observer.observe(canvasHost);

    // --- Hit testing -----------------------------------------------------------------------
    /* Raycasting against the *hit layer*, not the canvas.
     *
     *  The canvas is `pointer-events: none` — it is a picture of a case, and a picture
     *  of a case should not swallow the clicks aimed at the desk around it. The hit
     *  layer is a transparent sibling covering the same box, which is what the
     *  browser actually hit-tests and therefore what can carry a cursor: a canvas the
     *  pointer never reaches cannot change the cursor anything draws.
     *
     *  Listening on the hit layer rather than on `window` is what keeps the desk
     *  honest. A window-level listener would raycast on every mouse move across the
     *  whole station, sixty times a second, to find out that the pointer is nowhere
     *  near a case. */
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    /* Only these. The grille's rings and spokes are deliberately absent: they are
     *  decorative geometry in front of the hit disc, and a ray stopped at the nearest
     *  of nine rings would make the grille's own silhouette part of the button. */
    const targets: THREE.Object3D[] = [
      powerPad,
      powerRing,
      powerCap,
      drivePad,
      driveCap,
      driveLed,
      fanTarget,
    ];

    let hoveredAction: TowerAction | null = null;

    const actionFor = (object: THREE.Object3D | undefined): TowerAction | null => {
      if (!object) return null;

      /* By the cap that travels on a press — power, drive, and the fan's invisible hit
       * disc all carry one. The lamp meshes are deliberately not searched for here:
       * a hotspot holds its lamp as a *material*, and a material is not an object a
       * ray can return. `actionForMesh` matches those two meshes by identity instead. */
      return hotspots.find((spot) => spot.cap === object)?.action ?? null;
    };

    /* The glow meshes are not in `hotspots` as objects — a hotspot holds the
     *  *material* — so the two visible meshes that are pure lamps are matched by
     *  identity here rather than searched for by geometry. Two entries, written out,
     *  is cheaper and clearer than tagging userData and walking a parent chain. */
    const actionForMesh = (object: THREE.Object3D): TowerAction | null => {
      /* The pads carry no lamp and no cap, so they get no identity here — they are
       *  matched by geometry in `fit`, which sizes them and tags them in one pass. */
      if (object === powerPad) return "power";

      if (object === drivePad) return "drive";

      if (object === powerRing) return "power";

      if (object === driveLed) return "drive";

      return actionFor(object);
    };

    const findAction = (event: PointerEvent): TowerAction | null => {
      const box = hitHost.getBoundingClientRect();

      if (box.width <= 0 || box.height <= 0) return null;

      pointer.x = ((event.clientX - box.left) / box.width) * 2 - 1;
      pointer.y = -((event.clientY - box.top) / box.height) * 2 + 1;

      raycaster.setFromCamera(pointer, camera);

      return actionForMesh(raycaster.intersectObjects(targets, false)[0]?.object);
    };

    /* One edge for both consumers: the scene's own lit level and the rail's row.
     *
     *  Gated on a change, because this runs on every `pointermove` over the lane and
     *  the rail is React — an ungated report would re-render the whole desk sixty times
     *  a second to say `power` over and over. The hover state is not per-frame data;
     *  it is two values, and it changes when the pointer crosses a boundary. */
    const reportHover = (action: TowerAction | null) => {
      if (action === hoveredAction) return;

      hoveredAction = action;
      onHoverRef.current(action);
    };

    const onPointerMove = (event: PointerEvent) => {
      reportHover(findAction(event));

      // `pointer` over a control and `default` over the case's own body. Not
      // `pointer` everywhere: a desk whose whole silhouette reports itself clickable
      // is a desk where the three things that answer have stopped meaning anything.
      hitHost.style.cursor = hoveredAction === null ? "default" : "pointer";
    };

    const onPointerLeave = () => {
      reportHover(null);
      hitHost.style.cursor = "default";
    };

    const onPointerDown = (event: PointerEvent) => {
      /* Only the primary button. A right-click that opened the file manager would be
       *  a context menu that also changed the machine, and there is no gesture on
       *  this desk that means two things at once. */
      if (event.button !== 0) return;

      const action = findAction(event);

      if (action === null) return;

      const hotspot = hotspots.find((spot) => spot.action === action);

      if (hotspot) hotspot.flash = 1;

      onActionRef.current(action);
    };

    const onMotionChange = (event: MediaQueryListEvent) => {
      idleEnabled = !event.matches;
    };

    hitHost.addEventListener("pointermove", onPointerMove);
    hitHost.addEventListener("pointerdown", onPointerDown);
    hitHost.addEventListener("pointerleave", onPointerLeave);
    reducedMotion.addEventListener("change", onMotionChange);

    // --- Loop -------------------------------------------------------------------------------
    let power = poweredRef.current ? 1 : 0;
    let fanAngle = 0;
    let elapsed = 0;
    let raf = 0;

    /* Disk-activity level, 0..1, driven by edges rather than state: the boot itself, a
     *  folder opening or closing on the glass, and every press on a control. It decays
     *  back to rest, so the machine blinks when it is *doing* something and sits still
     *  when it is not — which is the difference between an activity light and a lamp. */
    let previousPower = poweredRef.current ? 1 : 0;
    let previousFilesOpen = filesOpenRef.current;
    let activityLevel = 0;

    const clock = new THREE.Clock();

    const frame = () => {
      const delta = Math.min(clock.getDelta(), 0.05);

      power += ((poweredRef.current ? 1 : 0) - power) * Math.min(1, delta * 7);

      elapsed += delta;

      /* Activity edges, read off the live refs. Powering on is the loud burst, powering
       * off a quieter one; opening *or* closing the folder each touch the light. */
      const machinedPowered = poweredRef.current ? 1 : 0;

      if (machinedPowered !== previousPower) {
        previousPower = machinedPowered;
        activityLevel = Math.max(activityLevel, machinedPowered ? 1 : 0.7);
      }

      if (filesOpenRef.current !== previousFilesOpen) {
        previousFilesOpen = filesOpenRef.current;
        activityLevel = Math.max(activityLevel, 0.65);
      }

      /* Fan speed ramps rather than steps, for the same reason the monitor's backlight
       *  does: a fan that changes speed instantly reads as a variable being set, and
       *  one that eases into it reads as a machine that has been asked to do something
       *  and is doing it.
       *
       *  Under reduced motion the fans keep turning, at a constant slow rate. Stopping
       *  them would be the literal reading of the preference and the wrong one: the
       *  spinning fan is the only feedback the grille has, so a still fan means the
       *  one control that is not a switch appears to do nothing. The bob below is the
       *  motion that goes instead. */
      const step = FAN_STEPS[Math.min(fanStepRef.current, FAN_STEPS.length - 1)];

      const targetSpeed = idleEnabled
        ? poweredRef.current
          ? step
          : FAN_IDLE
        : FAN_IDLE;

      fanAngle += targetSpeed * delta;

      intakeFan.rotation.z = fanAngle;
      rearFan.rotation.z = -fanAngle * 0.82;
      coolerFan.rotation.z = -fanAngle * 0.6;

      inside.intensity = power * 5.2;

      /* The front activity dots, the storage LED inside, and the little light they
       *  spill. Lit with the machine, dark without it, and slowly breathing while motion
       *  is allowed so a running case reads as alive rather than as a still of one.
       *
       *  On top of that breath rides the activity level: a control press, a folder open,
       *  a boot. While it is up the steady glow is replaced by a fast flicker, which is
       *  what a storage LED does under load and the one thing a constant lamp never
       *  does. The two are mixed by the activity level, so the flicker fades in and out
       *  instead of switching on. Under reduced motion the flicker is dropped and the
       *  dots hold their steady level — activity still lifts them, because that is
       *  state feedback rather than decoration. */
      let activityPoke = 0;

      for (const hotspot of hotspots) {
        if (hotspot.flash > 0) activityPoke = Math.max(activityPoke, hotspot.flash * 0.9);

        if (hotspot.action !== "fan" && pressedRef.current === hotspot.action) {
          activityPoke = Math.max(activityPoke, 0.4);
        }
      }

      activityLevel = Math.max(0, Math.min(1, activityLevel + activityPoke) - delta * 1.1);

      const ledPulse = idleEnabled ? 0.86 + Math.sin(elapsed * 2.2) * 0.1 : 0.9;
      const ledBlink = idleEnabled ? 0.45 + Math.sin(elapsed * 88) * 0.55 : ledPulse;

      const ledLit = ledPulse + (ledBlink - ledPulse) * Math.min(1, activityLevel * 2.4);

      ledMaterial.opacity = power * ledLit;
      ledLight.intensity = power * ledLit * 2.2;
      storageLedMaterial.opacity = power * ledLit;

      // The interior brightens with the fan step, which is the one honest thing the
      // step does besides spin: more airflow means more load means more light.
      /* The interior is lit by the warm lamp above it, not by the accent. These are the
       *  accent's own emissives, and they are what turned a running machine into a red
       *  machine: enough to read as powered, not enough to colour the parts in there. */
      ramMaterial.emissiveIntensity = power * (0.09 + fanStepRef.current * 0.08);
      fanMaterial.emissiveIntensity = power * (0.035 + fanStepRef.current * 0.05);

      // --- Hotspots ------------------------------------------------------------------------
      const legendHover = hoveredRef.current;
      const legendPress = pressedRef.current;

      for (const hotspot of hotspots) {
        const lit = hoveredAction === hotspot.action || legendHover === hotspot.action;

        hotspot.hover += ((lit ? 1 : 0) - hotspot.hover) * Math.min(1, delta * HOVER_EASE);

        if (hotspot.flash > 0) {
          hotspot.flash = Math.max(0, hotspot.flash - delta * PRESS_EASE * 2);
        }

        const down = hotspot.flash > 0 || legendPress === hotspot.action;

        hotspot.press += ((down ? 1 : 0) - hotspot.press) * Math.min(1, delta * PRESS_EASE);

        // Travel on the cap, along the case's own −Z, so a press reads as a switch
        // going in rather than as the whole face moving.
        hotspot.cap.position.z = hotspot.rest - hotspot.press * hotspot.travel;

        if (!hotspot.glow) continue;

        /* A lamp's resting level is the state and its lit level is that plus a lift.
         *
         *  Power rests *dim* rather than dark when the machine is asleep: a hard dark
         *  ring reads as a dead component, and the standby LED on the monitor already
         *  teaches that a machine keeps one light on while it sleeps. The eject is
         *  darker still, because an optical bay's LED is genuinely near-off when
         *  nothing is mounted.
         *
         *  The lit levels are far below what they were, and that is the whole of the
         *  "the red is ugly" fix. At full strength this accent is a saturated #AB1111
         *  painted onto a 20px ring in the middle of a graphite case: the brightest
         *  thing on the desk and the only saturated colour in it, which is what made a
         *  switched-on machine look like it was shouting. A real power LED is a
         *  *diffuser* — light spread through plastic, arriving pale and even — so it
         *  now peaks a little over half strength, and the ring's own colour is mixed
         *  toward the interior lamp's warm white (see the theme effect). Powered, the
         *  case reads as having a light on in it rather than as having a red one. */
        const resting =
          hotspot.action === "power"
            ? 0.22 + power * 0.52
            : filesOpenRef.current
              ? 0.95
              : 0.06;

        hotspot.glow.opacity = Math.min(1, resting + hotspot.hover * 0.3);
      }

      /* The grille's only feedback is its own light: it has nothing to travel, and a
       *  press on an invisible hit disc is only meaningful as a glow on the wire in
       *  front of it. The lift is read straight off the hotspot the loop just lerped,
       *  which is why the fan hotspot is held in a variable rather than found again. */
      meshMaterial.emissiveIntensity =
        fanHotspot.hover * 0.34 + fanHotspot.press * 0.42 + power * fanStepRef.current * 0.03;

      renderer.render(scene, camera);

      raf = requestAnimationFrame(frame);
    };

    raf = requestAnimationFrame(frame);

    // --- Teardown -----------------------------------------------------------------------------
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();

      hitHost.removeEventListener("pointermove", onPointerMove);
      hitHost.removeEventListener("pointerdown", onPointerDown);
      hitHost.removeEventListener("pointerleave", onPointerLeave);
      reducedMotion.removeEventListener("change", onMotionChange);

      scene.environment = null;
      envTexture.dispose();
      badgeTexture.dispose();
      room.dispose();
      pmrem.dispose();

      /* Traverse the root, not the scene: `root` is already detached, and traversing
       *  the scene would miss the case for the same reason it would walk an
       *  environment that is already gone.
       *
       *  The hit discs are in there too. They are transparent rather than invisible,
       *  which means their material was really allocated and really does need
       *  disposing — treating "you cannot see it" as "it cost nothing" is the one
       *  assumption a GL context cannot survive being unmounted twice. */
      root.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;

        object.geometry.dispose();

        const { material } = object;

        if (Array.isArray(material)) material.forEach((entry) => entry.dispose());
        else material.dispose();
      });

      renderer.dispose();
      canvas.remove();
      materialsRef.current = null;
    };
  }, []);

  // Theme swap.
  //
  //  Repaints the existing materials instead of rebuilding the scene. Rebuilding
  //  would tear down and recreate the GL context on every toggle, which flashes and
  //  re-runs PMREM — a visible stutter for what is a handful of colour assignments.
  //
  //  This also writes `accentRef`, which is how the render loop gets the current accent
  //  without allocating a `THREE.Color` per glow per frame. Painting the glows here
  //  rather than in the loop is what keeps that loop's per-frame work a multiply.
  useEffect(() => {
    const accent = new THREE.Color(palettes[theme].accent);

    accentRef.current.copy(accent);

    const materials = materialsRef.current;

    if (!materials) return;

    const hardware = HARDWARE[theme];

    materials.chassis.color.set(hardware.body);
    materials.bezel.color.set(hardware.panel);
    materials.mesh.color.set(hardware.mesh);
    materials.glass.color.copy(accent).multiplyScalar(0.4);

    /* The parts that are *made of* the accent rather than merely lit by it.
     *
     *  Repainting the shell is the obvious half and was the only half that existed, so a
     *  theme toggle left a dark-theme red RAM bank glowing inside a cream case — the
     *  one thing on the desk that could only have been drawn by two scenes disagreeing.
     *  The RAM's body is a darkened accent and its light is the accent itself; the fan
     *  housings are dark grey in both themes and lit by it; the grille in front of them
     *  is the accent, emissive, at whatever the loop last set its intensity to. */
    materials.ram.color.copy(accent).multiplyScalar(0.55);
    materials.ram.emissive.copy(accent);
    materials.fan.emissive.copy(accent);
    materials.mesh.emissive.copy(accent);

    /* The interior lamp. It is the light the RAM is read against, and it is a warm
     * tungsten white in both themes on purpose — a case lit by its own accent would
     * turn the whole interior the colour of the power ring and flatten every part in
     * it into one hue. */
    materials.inside.color.set(0xfff2df);

    for (const glow of materials.glows) glow.color.copy(accent);

    /* The front activity dots and their spill, which are the accent rather than merely
     *  lit by it — the same as the RAM and the grille, and repainted here so a theme
     *  swap does not leave dark-theme red dots glowing on a cream case. */
    materials.led.color.copy(accent);
    materials.ledLight.color.copy(accent);
    materials.storage.color.copy(accent);
    materials.badge.color.copy(accent);

    /* The ring last, and not the accent.
     *
     *  Every other lamp on this desk is the accent at a low strength, which is what a
     *  red case looks like. The power button is different because it is the one control
     *  the reader is asked to look at and the one they press: at full accent it is a hard
     *  red ring, and no amount of lowering its opacity fixes a hue that was never a
     *  light. Mixed toward the interior lamp's tungsten white it becomes what a power
     *  button is — a warm, pale, backlit ring that belongs to the case it sits on. */
    materials.ring.color.copy(accent).lerp(new THREE.Color(0xffd9b0), 0.44);

    materials.rim.color.copy(accent);
  }, [theme]);

  return (
    <div className="tower">
      {/* The picture of the case. `pointer-events: none`, because a picture should not
          swallow the clicks aimed at the desk beside it. */}
      <div className="tower__canvas" ref={canvasHostRef} />

      {/* What the browser actually hit-tests, and therefore what can carry the cursor.
          Transparent, and a sibling of the canvas rather than its parent: the canvas is
          the render surface and this is the control, and conflating them is how a
          canvas ends up with a click handler and an `aria-hidden` in the same breath. */}
      <div className="tower__hit" ref={hitHostRef} aria-hidden="true" />
    </div>
  );
}
