import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge class names, with later classes winning over earlier ones that set the
 *  same CSS property.
 *
 *  This exists so a component can accept styling from its parent without the
 *  parent having to know the component's internals. The keyboard and the
 *  terminal both take class overrides for exactly that reason: the station
 *  needs the keyboard to fill a viewport-sized row rather than sit at its
 *  intrinsic size, and plain `clsx` would let the component's own `scale-*`
 *  class win instead. */
export const cn = (...inputs: ClassValue[]): string => twMerge(clsx(inputs));
