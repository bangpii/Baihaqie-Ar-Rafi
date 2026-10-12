"use client";

/* GamingMouse — the mouse that sits to the left of the keyboard, in the well.
 *
 *  Drawn rather than modelled, for the same reason the keyboard is: this desk's
 *  peripherals are flat, hand-drawn objects standing in a room whose furniture is 3D,
 *  and a mouse with its own WebGL context would be a fourth scene spent on six
 *  centimetres of plastic. Everything here is CSS and one SVG, so it follows the theme
 *  and costs no context.
 *
 *  It is inert: `aria-hidden`, and `pointer-events: none` inherited from the keyboard
 *  row. It is a picture of a mouse on a desk, not a control, and the row it lives in
 *  reaches across the case's lane — a mouse that ate clicks meant for the ring under it
 *  would be the same bug the row's own `pointer-events` rule was written to stop.
 *
 *  Sized in `%` of the slab it is anchored to (`.station__keyboard-fit`), so it scales
 *  with the keyboard the station fits to the desk instead of drifting out of proportion
 *  at every window size. */

import { useEffect, useRef } from "react";
import "./mouse.css";

export function GamingMouse() {
  /* The underglow is the mouse waking up: it lights the mat while the cursor is
   *  moving and sinks back to dark the moment the desk goes still. Done by toggling a
   *  class on a ref rather than with state, because `pointermove` fires dozens of times
   *  a second and a React render per event would be a stutter for nothing. */
  const mouseRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = mouseRef.current;

    if (!node) return;

    let idle: ReturnType<typeof setTimeout> | undefined;

    const wake = () => {
      node.classList.add("is-awake");
      clearTimeout(idle);
      idle = setTimeout(() => node.classList.remove("is-awake"), 1300);
    };

    window.addEventListener("pointermove", wake, { passive: true });

    return () => {
      window.removeEventListener("pointermove", wake);
      clearTimeout(idle);
    };
  }, []);

  return (
    <div aria-hidden="true" className="station__keyboard-mouse">
      <div className="mouse" ref={mouseRef}>
        <span className="mouse__pad" />
        <span className="mouse__underglow" />

        <svg
          className="mouse__svg"
          viewBox="0 0 140 220"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="gm-shell" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#464b55" />
              <stop offset="0.42" stopColor="#2a2e36" />
              <stop offset="1" stopColor="#121419" />
            </linearGradient>

            <linearGradient id="gm-button" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="rgb(255 255 255 / 16%)" />
              <stop offset="1" stopColor="rgb(255 255 255 / 0%)" />
            </linearGradient>

            <radialGradient id="gm-hump" cx="0.5" cy="0.32" r="0.62">
              <stop offset="0" stopColor="rgb(255 255 255 / 14%)" />
              <stop offset="1" stopColor="rgb(255 255 255 / 0%)" />
            </radialGradient>

            <linearGradient id="gm-wheel" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#3a3f49" />
              <stop offset="1" stopColor="#0a0b0e" />
            </linearGradient>

            <filter
              id="gm-glow"
              x="-70%"
              y="-70%"
              width="240%"
              height="240%"
              colorInterpolationFilters="sRGB"
            >
              <feGaussianBlur result="blur" stdDeviation="2.2" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* The body: a near-symmetric shell, front at the top. */}
          <path
            className="mouse__body"
            d="M70 5 C97 5 122 26 127 66 C131 100 127 148 111 181 C101 201 86 214 70 214 C54 214 39 201 29 181 C13 148 9 100 13 66 C18 26 43 5 70 5 Z"
            fill="url(#gm-shell)"
          />

          {/* The raised button plate, and the hump that reads as a palm. */}
          <ellipse cx="70" cy="30" rx="44" ry="19" fill="url(#gm-hump)" />
          <path
            d="M70 6 C50 6 30 20 22 54 C19 66 24 72 34 73 L70 74 Z"
            fill="url(#gm-button)"
          />
          <path
            d="M70 6 C90 6 110 20 118 54 C121 66 116 72 106 73 L70 74 Z"
            fill="url(#gm-button)"
          />

          {/* Button seam: down the middle, then the break across the plate. */}
          <path
            className="mouse__seam"
            d="M70 8 L70 74"
            strokeLinecap="round"
          />
          <path
            className="mouse__seam"
            d="M18 71 Q70 86 122 71"
            strokeLinecap="round"
            fill="none"
          />

          {/* The scroll wheel, and the DPI key behind it. */}
          <rect
            x="63"
            y="39"
            width="14"
            height="28"
            rx="6.5"
            fill="url(#gm-wheel)"
            stroke="rgb(255 255 255 / 10%)"
            strokeWidth="1"
          />
          <rect
            className="mouse__rgb"
            x="66"
            y="44"
            width="8"
            height="18"
            rx="4"
            fill="var(--mouse-rgb)"
            filter="url(#gm-glow)"
          />

          <rect
            x="65"
            y="73"
            width="10"
            height="9"
            rx="2.5"
            fill="#191b20"
            stroke="rgb(255 255 255 / 8%)"
            strokeWidth="1"
          />

          {/* Thumb buttons along the left flank. */}
          <rect
            x="9"
            y="80"
            width="15"
            height="13"
            rx="4"
            fill="#20232a"
            stroke="rgb(255 255 255 / 9%)"
            strokeWidth="1"
          />
          <rect
            x="8"
            y="97"
            width="17"
            height="13"
            rx="4"
            fill="#20232a"
            stroke="rgb(255 255 255 / 9%)"
            strokeWidth="1"
          />

          {/* The light strips: the accent, running down both flanks. */}
          <path
            className="mouse__rgb mouse__strip"
            d="M19 58 Q11 108 26 158"
            fill="none"
          />
          <path
            className="mouse__rgb mouse__strip"
            d="M121 58 Q129 108 114 158"
            fill="none"
          />

          {/* The emblem in the palm: a lit lozenge, the one mark on the shell. */}
          <path
            className="mouse__rgb mouse__emblem"
            d="M70 116 L88 133 L70 150 L52 133 Z"
            fill="none"
          />
          <path
            className="mouse__rgb mouse__emblem-core"
            d="M70 123 L81 133 L70 143 L59 133 Z"
            fill="var(--mouse-rgb)"
          />

          {/* A whisper of grip texture under the palm. */}
          <g className="mouse__grip">
            <path d="M50 176 Q70 184 90 176" fill="none" />
            <path d="M55 186 Q70 193 85 186" fill="none" />
          </g>
        </svg>
      </div>
    </div>
  );
}
