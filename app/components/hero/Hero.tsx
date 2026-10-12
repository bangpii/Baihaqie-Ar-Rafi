"use client";

import { SocialIcon } from "@/app/components/icons/SocialIcon";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import DitherVeil from "@/app/components/dither-veil/DitherVeil";
import PaperBackground from "@/app/components/paper-background/PaperBackground";
import LightRays from "@/app/components/light-rays/LightRays";
import { ThemeToggle } from "@/app/components/theme/ThemeToggle";
import { LanguageToggle } from "@/app/components/i18n/LanguageToggle";
import { MonitorReveal } from "@/app/components/monitor/MonitorReveal";
import { MonitorStation } from "@/app/components/monitor/MonitorStation";
import { MobileView } from "@/app/components/mobile/MobileView";
import { palettes, type Theme } from "@/app/lib/palettes";
import { messages, type Language } from "@/app/lib/i18n";
import gsap from "gsap";
import "./hero.css";

const subscribeSystemDark = (onStoreChange: () => void) => {
  const media = window.matchMedia("(prefers-color-scheme: dark)");

  media.addEventListener("change", onStoreChange);

  return () => {
    media.removeEventListener("change", onStoreChange);
  };
};

const getSystemDark = () =>
  window.matchMedia("(prefers-color-scheme: dark)").matches;

const getSystemDarkServer = () => false;

const subscribeIsMobile = (onStoreChange: () => void) => {
  const media = window.matchMedia("(max-width: 639px)");

  media.addEventListener("change", onStoreChange);

  return () => {
    media.removeEventListener("change", onStoreChange);
  };
};

const getIsMobile = () => window.matchMedia("(max-width: 639px)").matches;

const getIsMobileServer = () => false;

const DITHER_OPTIONS = {
  fit: "contain",
  pattern: "bayer",
  pixelSize: 3,
  levels: 2,
  palette: "duotone",
  contrast: 1.1,
  brightness: 0,
  revealRadius: 80,
  softness: 0.45,
  linger: 0.6,
  rim: 0,
  wander: false,
  clickBurst: true,
} as const;

const PAPER_OPTIONS = {
  /** Noise domain scale: how many fold patterns fit across the viewport. Lower
   *  than a "more texture" instinct suggests, because the crease ladder in
   *  PaperBackground is what sets the fold size - cranking this up is the fastest
   *  way to make the sheet read as crumpled felt instead of folded paper. */
  scale: 4.5,
  /** Normal strength, i.e. how deep the creases read. Deliberately only a little
   *  above the pre-five-family value: the extra crease families raise the total
   *  height amplitude on their own, so raising this much as well blows the
   *  relief out into shading. */
  strength: 0.075,
  /**
   * Dark paper sits on a much darker base, so the same slope produces roughly
   * half the luminance swing. It needs a deeper normal to read as crumpled.
   */
  strengthDark: 0.085,
  /** How much of the relief survives in the middle of the screen. */
  focus: 0.4,
  /** Paper fibre grain amplitude. */
  fiber: 0.026,
  /** Thin dark line painted into the crease walls. The crease colour is already
   *  near-black on the dark theme, so it needs a lighter hand there. */
  crease: 0.8,
  creaseDark: 0.5,
  /** Darkest the diffuse term is allowed to get, as a mix from crease colour to
   *  paper colour. Kept high on the light theme on purpose: with the crease accent
   *  drawing the actual lines, the facets no longer have to do that job by
   *  themselves, so the diffuse term can stay bright and the sheet reads as paper
   *  with creases in it rather than as a grey field with bright patches. Dark
   *  paper inverts the argument - its relief lives in the lit facets - so it keeps
   *  the low floor. */
  ambient: 0.55,
  ambientDark: 0.2,
  seed: 0,
} as const;

const RAY_OPTIONS = {
  raysOrigin: "top-center",
  raysSpeed: 0.6,
  /* Above 1 on the light theme, which looks wrong and is not. The exponent is
   * 1 / lightSpread, so this flattens the fan: at 0.7 the side margins sit at about
   * 14% of the centre's coverage and no single gain can serve both, while at 1.1 they
   * reach roughly half of it. The source is at the top centre, which is exactly where
   * the portrait covers it, so the margins are the only place this layer is visible
   * at all. Kept below ~0.6 on the dark theme, where there is headroom to spare and
   * a tighter fan reads as distinct shafts. */
  lightSpread: 1.1,
  lightSpreadDark: 0.62,
  rayLength: 1.6,
  pulsating: true,
  fadeDistance: 1.4,
  saturation: 0.3,
  followMouse: true,
  mouseInfluence: 0.08,
  noiseAmount: 0.1,
  distortion: 0.05,
  /**
   * The two themes need opposite things from this layer, because the layer is
   * additive and the pages are not.
   *
   * On the dark paper, additive is right: black has 20 levels of headroom to climb
   * out of, so white rays at a modest gain are unmistakably visible. Measured, they
   * lift the top of the frame by +20..30/255.
   *
   * On the cream paper the headroom is the other way: the sheet already sits at
   * 240, so `src + dst * (1 - a)` can add at most 15/255 however bright the rays
   * get, and the core simply clips to white. Measured, a glow layer strong enough to
   * matter still moved the margins by +1..3. Brightening cannot solve this, because
   * brightness is the one thing the light theme has no room for.
   *
   * So the light theme runs with glow off. Upstream's non-glow path multiplies the
   * ray colour by per-channel weights and desaturates it, which on a light page
   * lands as a soft grey wash - and that is the point. Real god rays on a pale
   * surface are legible mostly because of the shadow *between* the shafts, not the
   * highlight in them, and a wash reads against the untouched paper whether or not
   * there is any headroom left to brighten into. The gain is low because the whole
   * effect is now subtractive.
   */
  intensity: 0.18,
  intensityDark: 0.34,
  glow: false,
  glowDark: true,
} as const;

/** Desktop-only dive zoom, bound to the inputs the page otherwise ignores.
 *
 *  The hero fills the viewport and cannot scroll, so wheel and arrow keys used
 *  to be dead gestures here. They now drive scale instead: down/`s` dives in,
 *  up/`w` surfaces, and the floor stays at 1 so the zoom can only ever return
 *  to the view the user already had - it never shrinks past it.
 *
 *  The ceiling is high on purpose. The dithered portrait is full-bleed, so
 *  once scale passes a few the name and the four corners have left the frame
 *  and the screen is a single magnified patch of the portrait: a blank page
 *  whose colour is whatever happened to be under the centre. That is the
 *  intended end state, not something to fade out early. */
const ZOOM = {
  min: 1,
  /** Emptiness was measured, not guessed. Corners clear the frame between 1.1x
   *  and 4.1x; the script name is 83% of the viewport width so it stays
   *  full-bleed until about 8.4x; per-pixel detail energy then collapses (8x
   *  by 14x) and the screen is a smooth wash of ink against paper.
   *
   *  It keeps converging past that. Measured quadrant spread: 10.7 at 40x, a
   *  local bump to 22.3 at 60x while the visible patch is still straddling an
   *  ink edge, then back down - 7.2 at 100x and exactly 0.0 from 130x on, where
   *  the patch has shrunk far enough to sit inside one uniform region. 130 is
   *  the first value on that plateau, and 140x/160x/220x measure identically to
   *  it, so going higher would cost notches and buy nothing. */
  max: 130,
  /** Multiplicative, not additive - an additive step that could reach this
   *  ceiling would need roughly two hundred and eighty wheel notches, and a
   *  zoom that feels the same at 2x and at 30x has to scale with where it
   *  already is. A trackpad's smaller deltas take a fraction of one notch. */
  /** The step is not one number, because the dive is not worth watching for
   *  its whole length. Detail runs out around 14x - past that the screen is a
   *  smooth wash and every further notch only makes it smoother - so the step
   *  starts small, where the corners are leaving the frame and the name is
   *  still swelling, and widens to `coarse` by `fineUntil`. Measured against
   *  the old flat 1.28: 11 notches of visible motion became 17, and the whole
   *  dive to the flat field went from 20 notches to 22. The presses behave the
   *  same way, 8 becoming 11 for 14 in total. Both ends still land on the same
   *  screen; only where the notches are spent changed. */
  wheelFine: 1.06,
  wheelCoarse: 1.55,
  keyFine: 1.12,
  keyCoarse: 1.75,
  /** Scale by which the step has finished widening into `coarse`. */
  fineUntil: 30,
  /** Where the halftone gives way to plain ink. At 40x the screen is already a
   *  smooth wash, and past `sinkFrom` the Bayer threshold climbs above the
   *  brightest sample it will ever see, so the dots stop existing and the
   *  screen finishes as solid ink rather than a single random cell of the
   *  pattern - which at 130x is one cell across the whole viewport. The
   *  transition is spread over `sinkFrom`..`sinkTo` so it reads as the image
   *  running out of light, not as a layer switching off. */
  sinkFrom: 40,
  sinkTo: 110,
  /** Duration follows the log of the remaining distance, which is the distance
   *  the eye actually reads at zoom: linear steps would make one key press feel
   *  huge at 30x and invisible at 1x. */
  baseDuration: 0.18,
  durationPerStop: 0.32,
  maxDuration: 0.85,
} as const;

/** One notch's worth of magnification at the scale currently reached: fine
 *  while there is still something to watch, coarse once the screen is only
 *  wash, interpolated on a log scale so the widening is even rather than
 *  front-loaded. */
const notchStep = (current: number, fine: number, coarse: number) => {
  const t = Math.min(
    1,
    Math.log(Math.max(current, ZOOM.min)) / Math.log(ZOOM.fineUntil),
  );

  return fine + (coarse - fine) * t;
};

/** How far the dive has run out of halftone, 0 at `sinkFrom` and 1 at
 *  `sinkTo`, on a log scale so it tracks how fast the zoom actually moves. */
const sinkFloorFor = (scale: number) =>
  Math.min(
    1,
    Math.max(
      0,
      (Math.log(Math.max(scale, 1)) - Math.log(ZOOM.sinkFrom)) /
        (Math.log(ZOOM.sinkTo) - Math.log(ZOOM.sinkFrom)),
    ),
  );

/** How far the desk has arrived, on the stretch of the dive *after* the sink.
 *
 *  Deliberately its own function rather than a continuation of `sinkFloorFor`:
 *  the halftone has to be completely gone by `sinkTo`, and the desk must not
 *  start opening until it is, or the monitor arrives on top of a screen that
 *  still has visible detail and the two fight for the same attention. Same log
 *  curve, so the reveal still tracks the speed of the zoom rather than the wheel
 *  notch count. */
const monitorRevealFor = (scale: number) => {
  const span =
    (Math.log(Math.max(scale, 1)) - Math.log(ZOOM.sinkTo)) /
    (Math.log(ZOOM.max) - Math.log(ZOOM.sinkTo));

  /* Eased at both ends. Linear progress makes an opening window look mechanical,
     because the speed jumps from nothing to something the instant it starts;
     easing puts the acceleration in the middle, where the eye reads it as weight.
     This is the same curve ScrollExpand used on its own progress. */
  const clamped = Math.min(1, Math.max(0, span));

  return clamped * clamped * (3 - 2 * clamped);
};

/** The desk's depth figure, in whole multiples of the front page.
 *
 *  Quantised, for two reasons. A figure that changed on every frame would be
 *  unreadable while the camera was moving, and pushing it through React would
 *  re-render the entire desk — both WebGL scenes included — on every tick of the
 *  zoom. And `×` wants a whole number: `1.04×` is noise dressed up as data.
 *
 *  Coarser the deeper it goes, because that is where magnification stops mattering
 *  and the gesture does; finer near 1×, where every notch is a visible jump. Twenty
 *  or so distinct figures across a full 1× to 130× dive, which is about one change
 *  per few notches. */
const depthFigureFor = (scale: number) => {
  const value = Math.max(1, Math.round(scale));

  if (value < 20) return value;

  return Math.round(value / 5) * 5;
};

export function Hero() {
  const systemDark = useSyncExternalStore(
    subscribeSystemDark,
    getSystemDark,
    getSystemDarkServer,
  );

  const isMobile = useSyncExternalStore(
    subscribeIsMobile,
    getIsMobile,
    getIsMobileServer,
  );

  const [darkOverride, setDarkOverride] = useState<boolean | null>(null);
  const [language, setLanguage] = useState<Language>("id");
  const [revealed, setRevealed] = useState(false);
  /** Whether the desk is mounted, and whether it is far enough open to take input.
   *  Both latch from the zoom and clear on the way back out, so diving up again
   *  returns to the hero exactly as it was found. */
  const [monitorLive, setMonitorLive] = useState(false);
  const [monitorActive, setMonitorActive] = useState(false);
  /** The desk's depth figure. The one piece of the zoom that crosses into React as a
   *  number rather than as a custom property, because it is text and text cannot be
   *  written from the animation frame. Quantised by `depthFigureFor` so it changes a
   *  couple of dozen times over a dive instead of sixty times a second. */
  const [depth, setDepth] = useState(1);

  const zoomRef = useRef<HTMLDivElement>(null);
  /** Scale the user has asked for, and the scale actually on screen. They differ
   *  for the whole tween, which is what lets a burst of input retarget one
   *  continuous glide instead of restarting an animation per event. */
  const zoomTarget = useRef<number>(ZOOM.min);
  const zoomCurrent = useRef<number>(ZOOM.min);
  const [sinkFloor, setSinkFloor] = useState(0);
  const sinkShown = useRef(-1);
  const depthShown = useRef(1);
  /** Latches for the desk, mirrored out of refs so the per-frame block above can
   *  stay a straight line of reads instead of comparing against state it cannot
   *  see without re-rendering. */
  const monitorLiveShown = useRef(false);
  const monitorOpenShown = useRef(false);
  /* Whether the station is using a dive key for the camera, rather than for a command.
   *
   *  This is the seam between two components that both want the same two keys. The
   *  station writes it; the camera reads it. Without it, giving the letters to the
   *  desk also took the camera away from the user at the exact moment they were
   *  looking at it, and there was no key left to dive back out with — a one-way trip.
   *
   *  A ref, not state: the keydown handler closes over the mount, and this has to be
   *  current the instant a key arrives. */
  const diveWanted = useRef(false);

  /* The case's power ring asks the camera to come in and show the machine it woke.
   *
   *  A ref to the *current* zoom, because `zoomTo` is rebuilt every time this effect
   *  re-runs — on reveal, on a viewport crossing into mobile — and a callback captured
   *  by the station would keep calling the camera of whichever mount it first saw. The
   *  ring is a physical switch on a piece of furniture; it has to work on the camera
   *  that is running now, not the one that ran before the window was resized. */
  const zoomInRef = useRef<(() => void) | null>(null);

  /** The same handle, pulling the camera back out. Bound to the session menu's Log Out,
   *  which asks to leave the desk the way the power ring asks to enter it — so the two
   *  ends of the dive are written side by side. */
  const zoomOutRef = useRef<(() => void) | null>(null);

  const enterTerminal = useCallback(() => {
    zoomInRef.current?.();
  }, []);

  const exitTerminal = useCallback(() => {
    zoomOutRef.current?.();
  }, []);

  const theme: Theme =
    darkOverride === null
      ? systemDark
        ? "dark"
        : "light"
      : darkOverride
        ? "dark"
        : "light";

  const fit = isMobile ? "cover" : DITHER_OPTIONS.fit;

  const t = messages[language];

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  }, [theme]);

  useEffect(() => {
    /* The reveal's value lives on the root, so it outlives the element that reads
     * it unless something takes it back off again. */
    return () => {
      document.documentElement.style.removeProperty("--monitor-reveal");
    };
  }, []);

  useEffect(() => {
    const node = zoomRef.current;

    // Desktop only, and only once the hero has been clicked. The reveal is the
    // introduction, and a dive that hijacks the wheel before the reveal has
    // happened means the first scroll of a fresh visit skips the intro and
    // lands on an empty screen instead of showing what there is to look at.
    if (!node || isMobile || !revealed) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    const zoomTo = (next: number) => {
      const to = Math.min(ZOOM.max, Math.max(ZOOM.min, next));

      if (to === zoomTarget.current) return;
      zoomTarget.current = to;

      const stops = Math.abs(Math.log(to / zoomCurrent.current));

      // Scale only. An opacity ramp was tried first and it read as the content
      // dissolving, which is the one thing this must not look like: everything
      // here leaves the frame by getting bigger, not by fading away.
      gsap.to(node, {
        scale: to,
        duration: reducedMotion.matches
          ? 0
          : Math.min(
              ZOOM.baseDuration + stops * ZOOM.durationPerStop,
              ZOOM.maxDuration,
            ),
        ease: "power3.out",
        overwrite: true,
        onUpdate: () => {
          const live = Number(gsap.getProperty(node, "scale"));

          zoomCurrent.current = live;

          // Quantized to 24 steps: the veil only needs to know roughly how dark
          // it is going, and one setState per frame would re-render the hero on
          // every wheel event.
          const next = Math.round(sinkFloorFor(live) * 24) / 24;

          if (next !== sinkShown.current) {
            sinkShown.current = next;
            setSinkFloor(next);
          }

          /* The masthead's figure, which is the only reason the zoom is in state at
           * all — see `depthFigureFor`. Kept out of `--monitor-reveal`'s custom
           * property because a custom property can only carry this desk's opacity,
           * and putting a number in a string that CSS has to parse back out is a
           * worse trade than one setState every few notches. */
          const figure = depthFigureFor(live);

          if (figure !== depthShown.current) {
            depthShown.current = figure;
            setDepth(figure);
          }

          /* The desk's arrival, written straight to a custom property on the root.
           * This is the whole reveal: a continuous dive costs one style write per
           * frame instead of a re-render per frame, and because the reveal's CSS is
           * a calc() off this number, the opening tracks the zoom exactly instead
           * of playing a fixed duration the user can outrun.
           *
           * Only the two latches cross into React, and only when they actually
           * change — the whole point of writing the value here rather than in state. */
          const arrival = monitorRevealFor(live);

          document.documentElement.style.setProperty(
            "--monitor-reveal",
            arrival.toFixed(4),
          );

          if (arrival > 0 && !monitorLiveShown.current) {
            monitorLiveShown.current = true;
            setMonitorLive(true);
          }

          if (arrival >= 1 && !monitorOpenShown.current) {
            monitorOpenShown.current = true;
            setMonitorActive(true);
          }

          /* Diving back out closes the desk and unmounts it, so the WebGL context
           * is released rather than left burning frames behind a clipped overlay. */
          if (arrival === 0 && (monitorLiveShown.current || monitorOpenShown.current)) {
            monitorLiveShown.current = false;
            monitorOpenShown.current = false;
            setMonitorLive(false);
            setMonitorActive(false);
          }
        },
      });
    };

    const onWheel = (event: WheelEvent) => {
      // Let Ctrl+wheel keep zooming the page itself rather than hijacking it.
      if (event.ctrlKey || event.metaKey) return;

      /* Over the monitor, the wheel is the machine's.
       *
       *  The screen is a working terminal and a working file manager, and both
       *  scroll. Once the pointer is on the glass — which is what it means to have
       *  walked into the monitor — a notch is a scroll for the window under it, not
       *  a camera move. The screen is only the middle slice of the desk, so moving
       *  the pointer off it, onto a rail or the keyboard, hands the wheel back to the
       *  zoom: one gesture for the machine, another for the room. */
      if (event.target instanceof Element && event.target.closest(".screen")) return;

      event.preventDefault();
      const notches = event.deltaY / 100;

      zoomTo(
        zoomTarget.current *
          notchStep(zoomTarget.current, ZOOM.wheelFine, ZOOM.wheelCoarse) **
            notches,
      );
    };

    /* The dive keys, and the one place they stop being the dive keys.
     *
     *  WASD is the right instinct for a camera, and it was what this used. It is
     *  also the first thing a shell user types, and the collision is not subtle:
     *  typing `whoami` fired three `w`-presses' worth of surfacing, the camera pulled
     *  back past the monitor, the desk unmounted, and the characters the user had just
     *  typed vanished with it. Two independent handlers on `window` both claiming a
     *  key is the actual bug; neither is wrong on its own.
     *
     *  So the arrows keep the camera, and the letters are given to the desk. */
    const onKeyDown = (event: KeyboardEvent) => {
      // Ctrl+W closes the tab and Cmd/Ctrl combos belong to the browser, so
      // only unmodified presses are ours.
      if (event.ctrlKey || event.metaKey || event.altKey) return;

      const key = event.key.toLowerCase();
      const dive = key === "arrowdown" || key === "s";
      const surface = key === "arrowup" || key === "w";

      if (!dive && !surface) return;

      event.preventDefault();

      /* The desk owns the letters while it is open, and the station has already said
       * whether it wants this key: it publishes `diveWanted` so the camera and the
       * shell agree about one keypress instead of each guessing.
       *
       *  Read from a ref rather than `revealed`: the zoom effect closes over whatever
       *  `revealed` was on mount, and the monitor opens some time after that, so the
       *  captured value would go stale and the letters would start driving the camera
       *  again. The ref is written by the same timeline that opens the desk. */
      if (monitorOpenShown.current && !diveWanted.current) return;

      const step = notchStep(zoomTarget.current, ZOOM.keyFine, ZOOM.keyCoarse);
      zoomTo(zoomTarget.current * (dive ? step : 1 / step));
    };

    /* What the ring on the case calls: all the way in.
     *
     *  Not one notch, which is what the `s` key does. The desk is only drawn between
     *  `ZOOM.sinkTo` and `ZOOM.max` (`monitorRevealFor`), so the button is pressed with
     *  the camera somewhere in that band and one notch is a move the reader cannot see —
     *  a power button that visibly does nothing. Going to the far end of the band is
     *  the whole gesture: the window finishes opening, the monitor is square in the
     *  frame, and the terminal it just woke is the thing filling it.
     *
     *  `zoomTo` returns early when the target has already been reached, so pressing the
     *  ring from the fully-dived position the wheel usually leaves you at is a no-op on
     *  the camera and everything still happens on the machine. */
    zoomInRef.current = () => {
      zoomTo(ZOOM.max);
    };

    /* Out to the floor, which is the resting front page. The wheel and `s` already do
       this; this handle only lets a button on the desk ask for the same move. */
    zoomOutRef.current = () => {
      zoomTo(ZOOM.min);
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKeyDown);
      zoomInRef.current = null;
      zoomOutRef.current = null;
      gsap.killTweensOf(node);
    };
  }, [isMobile, revealed]);

  const toggleTheme = () => {
    setDarkOverride((current) => !(current ?? systemDark));
  };

  const reveal = () => {
    if (!revealed) {
      setRevealed(true);
    }
  };

  const palette = palettes[theme];

  /* The phone gets a different document, not a reflowed desk. Every hook above
   *  still runs — rules of hooks — but the room is never rendered, so the paper
   *  shader and the three WebGL scenes are not built at all on the small screen.
   *  The desktop return below is untouched and remains the only thing a wide
   *  viewport ever sees. */
  if (isMobile) {
    return (
      <MobileView
        language={language}
        onLanguage={setLanguage}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
    );
  }

  return (
    <main className={`hero${revealed ? " is-revealed" : ""}`} onClick={reveal}>
      <div className="hero-zoom" ref={zoomRef}>
        {!isMobile && (
          <>
            <PaperBackground
              className="hero__paper"
              paperColor={palette.paperBase}
              creaseColor={palette.paperCrease}
              scale={PAPER_OPTIONS.scale}
              strength={
                theme === "dark"
                  ? PAPER_OPTIONS.strengthDark
                  : PAPER_OPTIONS.strength
              }
              focus={PAPER_OPTIONS.focus}
              fiber={PAPER_OPTIONS.fiber}
              crease={
                theme === "dark"
                  ? PAPER_OPTIONS.creaseDark
                  : PAPER_OPTIONS.crease
              }
              ambient={
                theme === "dark"
                  ? PAPER_OPTIONS.ambientDark
                  : PAPER_OPTIONS.ambient
              }
              seed={PAPER_OPTIONS.seed}
            />

            <LightRays
              className="hero__rays"
              raysColor={palette.ray}
              lightMode={palette.rayLightMode}
              raysOrigin={RAY_OPTIONS.raysOrigin}
              raysSpeed={RAY_OPTIONS.raysSpeed}
              lightSpread={
                theme === "dark"
                  ? RAY_OPTIONS.lightSpreadDark
                  : RAY_OPTIONS.lightSpread
              }
              rayLength={RAY_OPTIONS.rayLength}
              pulsating={RAY_OPTIONS.pulsating}
              fadeDistance={RAY_OPTIONS.fadeDistance}
              saturation={RAY_OPTIONS.saturation}
              followMouse={RAY_OPTIONS.followMouse}
              mouseInfluence={RAY_OPTIONS.mouseInfluence}
              noiseAmount={RAY_OPTIONS.noiseAmount}
              distortion={RAY_OPTIONS.distortion}
              intensity={
                theme === "dark"
                  ? RAY_OPTIONS.intensityDark
                  : RAY_OPTIONS.intensity
              }
              glow={theme === "dark" ? RAY_OPTIONS.glowDark : RAY_OPTIONS.glow}
            />
          </>
        )}

        <p className="hero-name">{t.name}</p>

        <DitherVeil
          className={isMobile ? "veil--mobile" : ""}
          src="/hero-veil.webp"
          fit={fit}
          pattern={DITHER_OPTIONS.pattern}
          pixelSize={DITHER_OPTIONS.pixelSize}
          levels={DITHER_OPTIONS.levels}
          palette={DITHER_OPTIONS.palette}
          inkColor={palette.ink}
          paperColor={palette.paper}
          backdrop={palette.backdrop}
          contrast={DITHER_OPTIONS.contrast}
          brightness={DITHER_OPTIONS.brightness}
          revealRadius={DITHER_OPTIONS.revealRadius}
          softness={DITHER_OPTIONS.softness}
          linger={DITHER_OPTIONS.linger}
          rimColor={palette.rim}
          rim={DITHER_OPTIONS.rim}
          sink={sinkFloor}
          wander={DITHER_OPTIONS.wander}
          clickBurst={DITHER_OPTIONS.clickBurst}
        />

        <p className="hero-hint">Touch For View</p>

        {!isMobile && (
          <div className="swiss-ui">
            <section className="corner corner--tl">
              <h2 className="corner-label">{t.rolesTitle}</h2>
              <ul className="corner-list">
                {t.roles.map((role) => (
                  <li key={role}>{role}</li>
                ))}
              </ul>

              <p className="corner-school">{t.school}</p>

              <p className="corner-status">
                <span className="corner-status__dot" aria-hidden="true" />
                {t.status}
              </p>
            </section>

            <section className="corner corner--tr">
              <h2 className="corner-label">{t.skillsTitle}</h2>
              <ul className="corner-grid">
                {t.skills.map((skill) => (
                  <li key={skill}>{skill}</li>
                ))}
              </ul>
            </section>

            <section className="corner corner--bl">
              <h2 className="corner-label">{t.connectTitle}</h2>
              <nav className="corner-socials" aria-label={t.connectTitle}>
                {t.socials.map((social) => (
                  <a
                    key={social.label}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <SocialIcon name={social.icon} />
                    {social.label}
                  </a>
                ))}
              </nav>
            </section>

            <div className="corner corner--br">
              <h2 className="corner-label">{t.baseTitle}</h2>
              <p className="corner-meta">{t.address}</p>

              <p className="corner-bio">{t.bio}</p>

              <div className="corner--br__toggles">
                <LanguageToggle language={language} onSelect={setLanguage} />
                <ThemeToggle theme={theme} onToggle={toggleTheme} />
              </div>
            </div>
          </div>
        )}

        {isMobile && <ThemeToggle theme={theme} onToggle={toggleTheme} />}
      </div>

      {/* The desk. Portalled to <body> and driven entirely by `--monitor-reveal`,
          which the dive writes on the root — see the zoom handler above. `active`
          only once the window is fully open, so a half-open desk never swallows a
          keystroke meant for the hero. */}
      <MonitorReveal live={monitorLive} active={monitorActive}>
        <MonitorStation
          language={language}
          theme={theme}
          active={monitorActive}
          depth={depth}
          diveWanted={diveWanted}
          onEnterTerminal={enterTerminal}
          onExitTerminal={exitTerminal}
        />
      </MonitorReveal>
    </main>
  );
}
