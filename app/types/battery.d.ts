interface BatteryManager extends EventTarget {
  /** 0 to 1. */
  readonly level: number;
  readonly charging: boolean;
  /** Seconds until full, or Infinity while not charging. Unused here, declared so the
   *  interface matches the API rather than a subset of what happens to be read. */
  readonly chargingTime: number;
  /** Seconds until empty, or Infinity while charging. */
  readonly dischargingTime: number;
  readonly type: string;
}

interface Navigator {
  /** Absent in some embedded webviews even where the rest of the platform has it, so
   *  every call site treats it as optional. */
  readonly getBattery?: () => Promise<BatteryManager>;
}

