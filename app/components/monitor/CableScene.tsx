"use client";

import { useEffect, useRef, type RefObject } from "react";
import * as THREE from "three";

import type { DeskAnchors } from "./DeskScene";

/** The cable's own numbers. World units are pixels here, so `radius` is its width on
 *  screen: 18px across, a sleeve rather than a wire — the difference between a cable you
 *  would notice on a desk and one you would not. */
const CABLE = {
  radius: 9,
  tubular: 96,
  radial: 20,
  /** The slack, in pixels, as a single hanging sag.
   *
   *  Both control points drop from the straight line between the ends, so the run bows
   *  down in the middle the way a chain hung between two hooks does. The number is the
   *  drop of each *control*; a cubic sits about three-quarters of that below the chord at
   *  its lowest, which is what lines it up with the desk rather than through it. A run
   *  under about forty reads as taut; past eighty it loops like a skipping rope. */
  sag: 54,
  sagMaxRatio: 0.32,
  /** Where the two control points sit along the run, as fractions from each end. Pulled
   *  in tight, because controls near the ends are what make the bow wide and the ends
   *  hang steeply — the profile of a cable, not of a rainbow. The drop side is the
   *  shorter of the two, so the low point sits nearer the case it falls from. */
  pullFrom: 0.24,
  pullTo: 0.36,
  /** A rubber jacket, not chrome: almost no metalness, a broad clearcoat sheen. The clear
   *  coat is what makes it a pipe rather than a matte cord — a thin glossy skin over a dull
   *  body, which is exactly how a PVC cable jacket reads under a room light. */
  color: 0x181a20,
  roughness: 0.55,
  metalness: 0.04,
  clearcoat: 0.7,
  clearcoatRoughness: 0.3,
  envIntensity: 0.85,
  /** The red braid that sleeves the jacket.
   *
   *  A woven cover is a second, slightly fatter tube wearing a net texture, so the black
   *  jacket shows through the holes and the whole run reads as a sleeved cable rather than
   *  a red one. `gap` is how far that tube stands off the jacket — enough to hide where
   *  the two surfaces would otherwise z-fight, small enough to stay a sleeve. `cell` is one
   *  diamond of the net in screen pixels, and it is what keeps the weave the same size at
   *  every window: the repeat is set from the run's own length and girth each build, not
   *  baked in. */
  sleeveGap: 1,
  braidCell: 14,
  /** How the loose end is hidden inside the case.
   *
   *  The towers report their foot where the base meets the desk, which is a hair right of
   *  the case's own silhouette — start a tube there and a pixel of daylight shows between
   *  the cable and the machine. So the end is pushed back by a fraction of the base's
   *  width and lifted a little up the case. Because the case is drawn *over* this scene,
   *  the tucked end is simply covered and the run emerges from behind it, the way a
   *  plugged-in cable does. */
  tuckFrom: 0.17,
  exitRise: 10,
} as const;

export interface CableSceneProps {
  /** Where the machines say they are, in viewport pixels. Read on every frame so the
   *  cable follows a refit without this scene having to be told about one. */
  anchorsRef: RefObject<DeskAnchors>;
  /** Fires if WebGL is unavailable; the desk then runs without the cable. */
  onFailed: () => void;
}

export function CableScene({ anchorsRef, onFailed }: CableSceneProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const host = hostRef.current;

    if (!host) return;

    let renderer: THREE.WebGLRenderer;

    try {
      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        powerPreference: "low-power",
      });
    } catch {
      onFailed();

      return;
    }

    if (!renderer.getContext()) {
      onFailed();

      return;
    }

    renderer.setClearAlpha(0);

    const canvas = renderer.domElement;

    canvas.style.position = "absolute";
    canvas.style.inset = "0";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.display = "block";
    host.appendChild(canvas);

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 4000);

    camera.position.set(0, 0, 1000);
    camera.lookAt(0, 0, 0);

    /* One key from the upper left, the same corner the machines are lit from, so the
     *  highlight rides the cable's top edge; a cooler fill from below so the underside is
     *  a shade and not a void; and a little ambient so the black does not crush to nothing
     *  against the dark room. */
    const key = new THREE.DirectionalLight(0xffffff, 1.7);

    key.position.set(-0.45, 1, 0.85);
    scene.add(key);

    const fill = new THREE.DirectionalLight(0x9fb4ff, 0.4);

    fill.position.set(0.85, -0.55, 0.5);
    scene.add(fill);

    scene.add(new THREE.AmbientLight(0xffffff, 0.5));

    /* A tiny vertical-gradient environment, so the jacket reflects a bright ceiling above
     *  and a dark floor below. A tube lit only by point sources has one highlight; a tube
     *  with an environment has a bright crown and a shadowed belly that stay put as it
     *  curves, which is the difference between a lit cylinder and a photographed cable.
     *  Thirty-two pixels is plenty — it is a gradient, not a room. */
    const envCanvas = document.createElement("canvas");

    envCanvas.width = 32;
    envCanvas.height = 32;

    const envContext = envCanvas.getContext("2d");
    const environment = new THREE.CanvasTexture(envCanvas);

    if (envContext) {
      const gradient = envContext.createLinearGradient(0, 0, 0, 32);

      gradient.addColorStop(0, "#eef1f6");
      gradient.addColorStop(0.45, "#9aa1ad");
      gradient.addColorStop(0.56, "#454a54");
      gradient.addColorStop(1, "#0e1015");
      envContext.fillStyle = gradient;
      envContext.fillRect(0, 0, 32, 32);
      environment.mapping = THREE.EquirectangularReflectionMapping;
      environment.colorSpace = THREE.SRGBColorSpace;
      scene.environment = environment;
    }

    const material = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(CABLE.color),
      roughness: CABLE.roughness,
      metalness: CABLE.metalness,
      clearcoat: CABLE.clearcoat,
      clearcoatRoughness: CABLE.clearcoatRoughness,
      envMapIntensity: CABLE.envIntensity,
    });

    /* The braid, drawn once into a tile.
     *
     *  One diamond to the tile, as two corner-to-corner strands that meet at the edges —
     *  the whole of a woven net, and it tiles seamlessly for free because the strands run
     *  edge to edge. Each diagonal is three strokes deep rather than one: a dark bed, the
     *  red body, and an off-centre highlight, which is what makes a flat line read as a
     *  rounded strand of cord. The tile is left transparent between the strands, and the
     *  sleeve material cuts those holes away rather than blending them, so the jacket
     *  underneath shows through as the gaps of the weave. */
    const braidCanvas = document.createElement("canvas");

    braidCanvas.width = 128;
    braidCanvas.height = 128;

    const braidContext = braidCanvas.getContext("2d");
    const braid = new THREE.CanvasTexture(braidCanvas);

    if (braidContext) {
      braidContext.clearRect(0, 0, 128, 128);
      braidContext.lineCap = "round";

      const strands: Array<[number, number]> = [
        [0, 0],
        [128, 0],
      ];

      for (const [sx, sy] of strands) {
        const ex = 128 - sx;
        const ey = 128 - sy;

        for (const [width, color, dx, dy] of [
          [22, "#5c1614", 0, 0],
          [13, "#c4352c", 0, 0],
          [5, "#ff9086", -2, -2],
        ] as const) {
          braidContext.strokeStyle = color;
          braidContext.lineWidth = width;
          braidContext.beginPath();
          braidContext.moveTo(sx + dx, sy + dy);
          braidContext.lineTo(ex + dx, ey + dy);
          braidContext.stroke();
        }
      }

      braid.wrapS = THREE.RepeatWrapping;
      braid.wrapT = THREE.RepeatWrapping;
      braid.colorSpace = THREE.SRGBColorSpace;
      braid.anisotropy = renderer.capabilities.getMaxAnisotropy();
      /* No mipmaps, and that is deliberate: the sleeve cuts its holes with `alphaTest`,
       *  and a mip chain averages the strands' alpha with the gaps' as it minifies, so a
       *  fine weave fades to a ghost and then flickers as the run is refitted. Filtering
       *  the tile directly keeps the net opaque and steady instead. */
      braid.generateMipmaps = false;
      braid.minFilter = THREE.LinearFilter;
    }

    const sleeveMaterial = new THREE.MeshStandardMaterial({
      map: braid,
      alphaTest: 0.5,
      roughness: 0.42,
      metalness: 0.18,
      envMapIntensity: CABLE.envIntensity,
    });

    let cable: THREE.Group | null = null;
    /** The host's origin in the viewport, refreshed on resize: anchors are viewport px
     *  and the tube is drawn in the host's own box, so the difference is subtracted once
     *  per measurement instead of on every frame. */
    const origin = { left: 0, top: 0 };
    let size = { w: 1, h: 1 };

    const clearCable = () => {
      if (!cable) return;

      cable.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        object.geometry.dispose();
      });

      scene.remove(cable);
      cable = null;
    };

    const build = () => {
      const anchors = anchorsRef.current;
      const from = anchors.towerRight;
      const to = anchors.monitorNeck;

      clearCable();

      if (!from || !to) {
        renderer.render(scene, camera);

        return;
      }

      // Viewport pixels → the host's own pixels → centred world units, with y flipped
      // because the camera is y-up and the anchors are y-down.
      const localX = (x: number) => x - origin.left;
      const localY = (y: number) => y - origin.top;
      const worldX = (x: number) => localX(x) - size.w / 2;
      const worldY = (y: number) => size.h / 2 - localY(y);

      /* The end that meets the case is tucked back into it, so the case covers the seam
       *  and the cable reads as plugged in rather than floating a few pixels off it. */
      const baseLeft = anchors.towerLeft;
      const baseWidth = baseLeft ? from.x - baseLeft.x : 0;
      const startX = from.x - baseWidth * CABLE.tuckFrom;
      const startY = from.y - CABLE.exitRise;

      const x0 = worldX(startX);
      const y0 = worldY(startY);
      const x1 = worldX(to.x);
      const y1 = worldY(to.y);
      const dx = x1 - x0;
      const span = Math.abs(dx);
      const sag = Math.min(CABLE.sag, span * CABLE.sagMaxRatio);

      const p0 = new THREE.Vector3(x0, y0, 0);
      // Both controls drop from the chord, so the middle hangs; their tight pull is what
      // makes the ends leave the machines steeply and the bow wide.
      const p1 = new THREE.Vector3(x0 + dx * CABLE.pullFrom, y0 - sag, 0);
      const p2 = new THREE.Vector3(x1 - dx * CABLE.pullTo, y1 - sag, 0);
      const p3 = new THREE.Vector3(x1, y1, 0);
      const curve = new THREE.CubicBezierCurve3(p0, p1, p2, p3);

      /* The weave, sized to the run rather than to the desk: one cell to `braidCell`
       *  screen pixels along the length and around the girth, so the diamonds stay square
       *  and the same size whether the cable hangs deep or crosses a narrow gap. */
      const girth = 2 * Math.PI * (CABLE.radius + CABLE.sleeveGap);

      braid.repeat.set(
        Math.max(1, curve.getLength() / CABLE.braidCell),
        Math.max(1, girth / CABLE.braidCell),
      );

      const jacket = new THREE.Mesh(
        new THREE.TubeGeometry(curve, CABLE.tubular, CABLE.radius, CABLE.radial, false),
        material,
      );

      const sleeve = new THREE.Mesh(
        new THREE.TubeGeometry(
          curve,
          CABLE.tubular,
          CABLE.radius + CABLE.sleeveGap,
          CABLE.radial,
          false,
        ),
        sleeveMaterial,
      );

      cable = new THREE.Group();
      cable.add(jacket, sleeve);
      scene.add(cable);

      renderer.render(scene, camera);
    };

    const resize = () => {
      const rect = host.getBoundingClientRect();

      origin.left = rect.left;
      origin.top = rect.top;

      size = {
        w: Math.max(1, Math.round(rect.width)),
        h: Math.max(1, Math.round(rect.height)),
      };

      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(size.w, size.h, false);

      camera.left = -size.w / 2;
      camera.right = size.w / 2;
      camera.top = size.h / 2;
      camera.bottom = -size.h / 2;
      camera.updateProjectionMatrix();

      build();
    };

    const observer = new ResizeObserver(resize);

    observer.observe(host);

    /* A frame loop rather than events, because the anchors are written by the two machine
     * scenes at their own moments — a fit that lands just after this scene's own resize
     * would otherwise be missed. It re-builds only when a measured point has actually
     * moved, so the loop is a comparison most frames and a rebuild only on a refit. */
    let raf = 0;
    let lastKey = "";

    const frame = () => {
      const anchors = anchorsRef.current;
      const from = anchors.towerRight;
      const to = anchors.monitorNeck;
      const nextKey = `${from?.x},${from?.y},${to?.x},${to?.y},${size.w},${size.h},${origin.left},${origin.top}`;

      if (nextKey !== lastKey) {
        lastKey = nextKey;
        build();
      }

      raf = requestAnimationFrame(frame);
    };

    resize();
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      clearCable();
      material.dispose();
      sleeveMaterial.dispose();
      braid.dispose();
      environment.dispose();
      renderer.dispose();
      canvas.remove();
    };
  }, [anchorsRef, onFailed]);

  return <div ref={hostRef} className="station__cable-3d" aria-hidden="true" />;
}

