"use client";

import { useEffect, useRef, type ReactNode } from "react";

import { BANNER, PROMPT_BOTTOM, PROMPT_TITLE, PROMPT_TOP, type ShellLine } from "@/app/lib/terminal";

import "./shell.css";

interface ShellProps {
  /** The scrollback, oldest first. */
  lines: readonly ShellLine[];
  /** The line being typed, without the prompt. */
  input: string;
}

/** The two rows a command is echoed under, matching the live prompt exactly.
 *
 *  A committed command repeats the whole prompt rather than just the `❯❯❯`, which
 *  is how a zsh prompt with a title bar actually reads, and it means every command
 *  in the history is self-describing once you have scrolled away from the prompt.
 *
 *  The newline is written as an explicit escape because JSX collapses whitespace
 *  between elements — a literal line break here would silently render the two rows on
 *  one line and break the shape of the prompt. */
const Prompt = ({ children }: { children: ReactNode }) => (
  <>
    <span className="shell__title">
      {PROMPT_TOP}
      {PROMPT_TITLE}
    </span>
    {"\n"}
    <span className="shell__gutter">{PROMPT_BOTTOM}</span>
    {children}
  </>
);

const Fetch = ({ logo, info }: { logo: readonly string[]; info: readonly (readonly [string, string])[] }) => (
  <div className="shell__fetch">
    <pre className="shell__logo">{logo.join("\n")}</pre>
    <dl className="shell__facts">
      {info.map(([label, value]) => (
        <div className="shell__fact" key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  </div>
);

export const Shell = ({ lines, input }: ShellProps) => {
  const bodyRef = useRef<HTMLDivElement | null>(null);

  /* Follow the output.
   *
   *  The window is the only scrolling surface in the whole scene, so leaving it
   *  pinned to the bottom is the whole behaviour: a shell that does not follow its
   *  own output reads as frozen. `scrollTop` is assigned rather than scrolled into
   *  view, because scrolling a sentinel element would also try to scroll ancestors —
   *  and every ancestor here is the fixed, non-scrolling station. */
  useEffect(() => {
    const body = bodyRef.current;

    if (body !== null) body.scrollTop = body.scrollHeight;
  }, [lines, input]);

  return (
    <div className="shell">
      {/* An empty strip. Its only job is to give the session a top edge, and the Kali
          panel is that now — the station hides this when the panel is present. */}
      <div className="shell__bar" />

      <div className="shell__body" ref={bodyRef}>
        <pre className="shell__pre">
          {lines.map((line, index) => {
            const key = `${index}-${line.kind}`;

            if (line.kind === "banner") {
              return <span className="shell__banner" key={key}>{BANNER.join("\n")}</span>;
            }

            if (line.kind === "gap") return <span className="shell__gap" key={key} />;

            if (line.kind === "fetch") return <Fetch info={line.info} key={key} logo={line.logo} />;

            if (line.kind === "command") {
              return (
                <span className="shell__command" key={key}>
                  <Prompt>{line.text}</Prompt>
                </span>
              );
            }

            return (
              <span className={`shell__line shell__line--${line.kind}`} key={key}>
                {line.text}
              </span>
            );
          })}

          <span className="shell__command">
            <Prompt>
              {input}
              <span className="shell__caret" />
            </Prompt>
          </span>
        </pre>
      </div>
    </div>
  );
};

export default Shell;

