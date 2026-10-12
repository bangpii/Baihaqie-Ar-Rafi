export interface KeyLegendProps {
  keys: readonly { caps: readonly string[]; action: string }[];
  /** Whether the machine is up. Drives the dimming described above. */
  powered: boolean;
  /** Read by a screen reader; the visible caps are decorative to it. */
  label: string;
}

export function KeyLegend({ keys, powered, label }: KeyLegendProps) {
  return (
    <ul className="key-legend" aria-label={label}>
      {keys.map((key) => {
        /* Every row but the first is a command-line key, so it is the first row that
         *  stays lit. Derived from the position rather than from a flag on the copy,
         *  because the only key that works in both states is the power key and that is
         *  by construction the one at the top of the legend. */
        const needsPower = key.caps[0] !== "esc";

        return (
          <li
            className="key-legend__row"
            data-dim={powered || !needsPower ? undefined : "true"}
            key={key.caps.join("-")}
          >
            <span className="key-legend__caps" aria-hidden="true">
              {key.caps.map((cap) => (
                <span className="key-legend__cap" key={cap}>
                  {cap}
                </span>
              ))}
            </span>

            <span className="key-legend__action">{key.action}</span>
          </li>
        );
      })}
    </ul>
  );
}
