import { messages, type Language } from "@/app/lib/i18n";

/** The account this machine belongs to.
 *
 *  The prompt, `whoami`, the home directory and the sudo gag all read from these
 *  constants, so the session cannot contradict itself the way a prompt string pasted
 *  into each command would. The account name and the display name are deliberately
 *  separate: a Linux login is one word in lower case, while the prompt is somewhere a
 *  person's name belongs. */
export const USERNAME = "baihaqiearrafi";

export const DISPLAY_NAME = "Baihaqie Ar Rafi";

export const HOSTNAME = "LINUX";

export const HOME = `/home/${USERNAME}`;

/* --- The prompt --------------------------------------------------------------- */

/** The title bar above the input line. */
export const PROMPT_TITLE = `[${DISPLAY_NAME}@${HOSTNAME}]-[~]`;

/* The box-drawing lives here rather than in the component so the two prompt rows are
 * guaranteed to be written by the same hand: the top row and the bottom row are one
 * ornament, and splitting them across two files is how they drift apart. */
export const PROMPT_TOP = " ┌─╼";

export const PROMPT_BOTTOM = " └────╼ ❯❯❯ ";

/** What the session opens with.
 *
 *  A figlet banner is the one piece of the screen that is allowed to be enormous, and
 *  it is what makes the machine look switched on rather than merely rendered. The
 *  glyphs are block characters, so it survives at any font size without an image to
 *  load and without the letter-spacing a web font would need. */
export const BANNER = [
  "▄▄▄▄▄▄                                  ▄▄▄▄▄▄       ██        ██    ",
  " ██▀▀▀▀██                                ██▀▀▀▀█▄     ▀▀        ▀▀    ",
  " ██    ██   ▄█████▄  ██▄████▄   ▄███▄██  ██    ██   ████      ████    ",
  " ███████    ▀ ▄▄▄██  ██▀   ██  ██▀  ▀██  ██████▀      ██        ██    ",
  " ██    ██  ▄██▀▀▀██  ██    ██  ██    ██  ██           ██        ██    ",
  " ██▄▄▄▄██  ██▄▄▄███  ██    ██  ▀██▄▄███  ██        ▄▄▄██▄▄▄  ▄▄▄██▄▄▄ ",
  " ▀▀▀▀▀▀▀    ▀▀▀▀ ▀▀  ▀▀    ▀▀   ▄▀▀▀ ██  ▀▀        ▀▀▀▀▀▀▀▀  ▀▀▀▀▀▀▀▀ ",
  "                                ▀████▀▀                                ",
] as const;

/** One visual row inside the monitor's terminal.
 *
 *  The kinds exist because a command should be echoed as it was typed, its output
 *  has already "arrived" by the time the line is shown, and an error is neither:
 *  it is the one row the eye should land on hardest. Deciding that here rather
 *  than in the component keeps the component a pure renderer and leaves this file
 *  as the one place the machine is described. */
export type ShellLine =
  | { kind: "command"; text: string }
  | { kind: "output"; text: string }
  | { kind: "muted"; text: string }
  | { kind: "error"; text: string }
  | { kind: "gap" }
  | { kind: "banner" }
  | { kind: "fetch"; logo: readonly string[]; info: readonly (readonly [string, string])[] };

/** A command that does more than print: it asks the machine to go down.
 *
 *  Returned rather than performed, because this file has no idea a monitor exists —
 *  it is the machine's vocabulary, not its power supply. The station runs the action
 *  once the message has had a beat to land. */
export type PowerAction = "reboot" | "shutdown";

export type ShellResponse =
  | { kind: "lines"; lines: readonly ShellLine[] }
  | { kind: "clear" }
  | { kind: "action"; action: PowerAction; lines: readonly ShellLine[] };

/** Width of the widest label, so a value column starts at one x for every row
 *  instead of drifting line by line. Monospace does not rescue ragged columns on
 *  its own; the alignment has to come from the data. */
const columnWidth = (labels: readonly string[]): number =>
  labels.reduce((widest, label) => Math.max(widest, label.length), 0);

/** Pad to `width` columns. The terminal renders in a monospace face, so a column
 *  count is also a pixel count. */
const pad = (text: string, width: number): string =>
  text + " ".repeat(Math.max(0, width - text.length));

/** Lay a list out as `perRow` aligned columns, `gap` spaces between them. */
const grid = (
  items: readonly string[],
  perRow: number,
  gap: number,
): readonly string[] => {
  const labelWidth = columnWidth(items);

  const rows: string[] = [];

  for (let start = 0; start < items.length; start += perRow) {
    const cell = (item: string) => pad(item, labelWidth) + " ".repeat(gap);

    rows.push(
      items
        .slice(start, start + perRow)
        .map(cell)
        .join("")
        .trimEnd(),
    );
  }

  return rows;
};

/** Lay label/value pairs out as aligned rows. */
const pairs = (rows: readonly { label: string; value: string }[]): readonly string[] => {
  const labelWidth = columnWidth(rows.map((row) => row.label));

  return rows.map((row) => `${pad(row.label, labelWidth)}  ${row.value}`);
};

/** Turn a social href into something worth reading in a terminal.
 *
 *  These are the real hrefs from the profile, so the schemes and hosts have to
 *  come off: a raw `mailto:` or `https://wa.me/` sitting in the middle of an
 *  aligned column reads as a mistake rather than as a contact detail. */
const contactValue = (href: string): string => {
  if (href.startsWith("mailto:")) return href.slice("mailto:".length);

  if (href.includes("wa.me/")) {
    const digits = href.slice(href.lastIndexOf("/") + 1);

    return `+${digits.slice(0, 2)} ${digits.slice(2, 5)}-${digits.slice(5, 9)}-${digits.slice(9)}`;
  }

  if (href.includes("instagram.com/") || href.includes("github.com/")) {
    return `@${href.split("/").filter(Boolean).pop() ?? href}`;
  }

  if (href.includes("linkedin.com/in/")) {
    return href.slice(href.indexOf("/in/") + 4);
  }

  return href.replace(/^https?:\/\//, "").replace(/\/$/, "");
};

/* --- The machine ------------------------------------------------------------- */

interface Machine {
  name: string;
  roles: readonly string[];
  skills: readonly string[];
  school: string;
  status: string;
  bio: string;
  address: string;
  socials: readonly { label: string; href: string }[];
  language: Language;
  indonesian: boolean;
}

const machine = (language: Language): Machine => {
  const t = messages[language];

  return {
    name: t.name,
    roles: t.roles,
    skills: t.skills,
    school: t.school,
    status: t.status,
    bio: t.bio,
    address: t.address,
    socials: t.socials,
    language,
    indonesian: language === "id",
  };
};

const out = (text: string): ShellLine => ({ kind: "output", text });

const muted = (text: string): ShellLine => ({ kind: "muted", text });

const gap = (): ShellLine => ({ kind: "gap" });

/** A laptop, drawn in block characters so it needs no image to load. */
const LOGO = [
  "    ▄▄▄▄▄▄▄▄▄▄▄▄",
  "  ▟███████████████▙",
  " ▐████▀▀     ▀▀████▌",
  " ▐███▌   >_       ███▌",
  " ▐███▌            ███▌",
  "  ▜███████████████▛",
  "    ▀▀▀▀▀▀▀▀▀▀▀▀",
] as const;

/** The files `ls` and `cat` can see. Small enough to be a literal, and it keeps
 *  the two commands agreeing with each other for free. */
const DIRECTORY = ["stack", "contact.json", "profile.txt", "readme.md", "notes.txt"] as const;

const readFile = (m: Machine, path: string): readonly ShellLine[] | null => {
  // `./profile.txt` and `profile.txt` are the same file, and a shell user types
  // both, so the leading `./` is normalised away rather than special-cased.
  const name = path.replace(/^\.\//, "");

  if (name === "profile.txt") {
    return [
      out(m.name),
      out(m.roles.join("  ·  ")),
      out(m.school),
      out(m.status),
      gap(),
      out(m.bio),
    ];
  }

  if (name === "contact.json") {
    return pairs(
      m.socials.map((social) => ({ label: social.label, value: contactValue(social.href) })),
    ).map(out);
  }

  if (name === "readme.md") {
    return [out(m.bio), gap(), out(`# ${PROMPT_TITLE}`)];
  }

  if (name === "notes.txt") {
    return m.indonesian
      ? [
          out("TODO:"),
          out("  · ganti username di app/lib/terminal.ts"),
          out("  · keyboard masih pakai skala turun"),
          out("  · cable pengenCkya lebih panjang"),
        ]
      : [
          out("TODO:"),
          out("  · change the username in app/lib/terminal.ts"),
          out("  · the keyboard still only scales down"),
          out("  · the cable could droop further"),
        ];
  }

  return null;
};

const isDirectory = (path: string): boolean => {
  const name = path.replace(/^\.\//, "");

  return name === "stack";
};

const neofetch = (m: Machine): ShellResponse => ({
  kind: "lines",
  lines: [
    {
      kind: "fetch",
      logo: LOGO,
      info: [
        [m.indonesian ? "Pengguna" : "User", `${USERNAME}@${HOSTNAME}`],
        ["OS", "BangpiiOS 1.0 (webgl)"],
        ["Shell", "bash 5.2"],
        ["Theme", m.indonesian ? "Gelap" : "Dark"],
        ["Role", m.roles[0] ?? "Developer"],
        ["Stack", m.skills.slice(0, 3).join(", ")],
        ["Uptime", "always awake"],
      ],
    },
  ],
});

/** Every command the machine answers to. */
const run = (
  input: string,
  args: readonly string[],
  m: Machine,
  history: readonly string[],
): ShellResponse => {
  const target = args[0];

  switch (input) {
    case "help":
      return {
        kind: "lines",
        lines: [
          muted("available commands:"),
          gap(),
          ...pairs([
            { label: "help", value: m.indonesian ? "daftar perintah ini" : "list these commands" },
            { label: "neofetch", value: m.indonesian ? "ringkasan mesin" : "machine summary" },
            { label: "whoami", value: m.indonesian ? "nama lengkap" : "full name" },
            { label: "pwd", value: m.indonesian ? "direktori sekarang" : "current directory" },
            { label: "ls", value: m.indonesian ? "daftar berkas" : "list files" },
            { label: "cat <berkas>", value: m.indonesian ? "isi berkas" : "read a file" },
            { label: "echo <teks>", value: m.indonesian ? "tulis ulang teks" : "print text" },
            { label: "date", value: m.indonesian ? "waktu sekarang" : "current time" },
            { label: "uname -a", value: m.indonesian ? "info kernel" : "kernel info" },
            { label: "history", value: m.indonesian ? "riwayat perintah" : "command history" },
            { label: "clear", value: m.indonesian ? "bersihkan layar" : "clear the screen" },
            { label: "reboot", value: m.indonesian ? "mulai ulang mesin" : "restart the machine" },
            { label: "shutdown", value: m.indonesian ? "matikan mesin" : "power the machine off" },
            { label: "exit", value: m.indonesian ? "matikan monitor" : "power off the monitor" },
          ]).map(out),
        ],
      };

    case "neofetch":
      return neofetch(m);

    case "whoami":
      return { kind: "lines", lines: [out(USERNAME)] };

    case "pwd":
      return { kind: "lines", lines: [out(HOME)] };

    case "ls": {
      if (target === undefined) {
        return { kind: "lines", lines: [out(DIRECTORY.join("  "))] };
      }

      if (target === "-la" || target === "-l" || target === "-a") {
        return {
          kind: "lines",
          lines: pairs([
            { label: "drwxr-xr-x", value: "stack" },
            { label: "-rw-r--r--", value: "contact.json" },
            { label: "-rw-r--r--", value: "profile.txt" },
            { label: "-rw-r--r--", value: "readme.md" },
            { label: "-rw-r--r--", value: "notes.txt" },
          ]).map(out),
        };
      }

      if (isDirectory(target)) {
        return { kind: "lines", lines: grid(m.skills, 3, 3).map(out) };
      }

      return { kind: "lines", lines: [out(DIRECTORY.join("  "))] };
    }

    case "cd": {
      if (target === undefined || target === "~" || target === HOME) {
        return { kind: "lines", lines: [out(HOME)] };
      }

      return {
        kind: "lines",
        lines: [{ kind: "error", text: `cd: ${target}: No such file or directory` }],
      };
    }

    case "cat": {
      if (target === undefined) {
        return { kind: "lines", lines: [{ kind: "error", text: "cat: missing operand" }] };
      }

      if (isDirectory(target)) {
        return {
          kind: "lines",
          lines: [{ kind: "error", text: `cat: ${target}: Is a directory` }],
        };
      }

      const file = readFile(m, target);

      if (file === null) {
        return {
          kind: "lines",
          lines: [{ kind: "error", text: `cat: ${target}: No such file or directory` }],
        };
      }

      return { kind: "lines", lines: file };
    }

    case "echo":
      return { kind: "lines", lines: [out(args.join(" "))] };

    case "date":
      return { kind: "lines", lines: [out(new Date().toString())] };

    case "uname":
      return {
        kind: "lines",
        lines: [
          out(
            args.includes("-a")
              ? `BangpiiOS ${HOSTNAME} 6.9.0-webgl #1 SMP PREEMPT_DYNAMIC`
              : "BangpiiOS",
          ),
        ],
      };

    case "history": {
      const numbered = history.map((command, index) => `${String(index + 1).padStart(4)}  ${command}`);

      return {
        kind: "lines",
        lines: numbered.length === 0
          ? [muted(m.indonesian ? "belum ada riwayat" : "no history yet")]
          : numbered.map(out),
      };
    }

    case "clear":
    case "cls":
      return { kind: "clear" };

    case "exit":
    case "logout":
    case "poweroff":
      return {
        kind: "lines",
        lines: [
          muted("logout"),
          out(
            m.indonesian
              ? "monitor belum mati — sakelarnya ada di casing"
              : "the monitor is still on — the switch is on the case",
          ),
        ],
      };

    case "sudo":
      return {
        kind: "lines",
        lines: [
          muted(`[sudo] password for ${USERNAME}:`),
          out(`${USERNAME} is not in the sudoers file. This incident will be reported.`),
        ],
      };

    case "reboot":
      return {
        kind: "action",
        action: "reboot",
        lines: [
          muted(
            m.indonesian
              ? "menyiarkan pesan ke semua pengguna…"
              : "broadcasting message to all users…",
          ),
          out(
            m.indonesian
              ? "Sistem akan dimulai ulang SEKARANG!"
              : "The system is going down for reboot NOW!",
          ),
        ],
      };

    case "shutdown":
      return {
        kind: "action",
        action: "shutdown",
        lines: [
          muted(
            m.indonesian
              ? "menyiarkan pesan ke semua pengguna…"
              : "broadcasting message to all users…",
          ),
          out(
            m.indonesian
              ? "Sistem akan dimatikan SEKARANG!"
              : "The system is going down for power-off NOW!",
          ),
        ],
      };

    case "man":
      return {
        kind: "lines",
        lines: target === undefined
          ? [{ kind: "error", text: "What manual page do you want?" }]
          : [{ kind: "error", text: `No manual entry for ${target}` }],
      };

    case "alias":
      return { kind: "lines", lines: [out("ll='ls -la'")] };

    case "uptime":
      return { kind: "lines", lines: [out(`up always,  1 user,  load average: 0.0, 0.0, 0.0`)] };

    default: {
      // Anything unrecognised gets bash's own wording, because a shell that invents
      // a friendlier error is the first thing that stops feeling like a shell.
      if (input.includes("/")) {
        return {
          kind: "lines",
          lines: [{ kind: "error", text: `bash: ${input}: No such file or directory` }],
        };
      }

      return {
        kind: "lines",
        lines: [{ kind: "error", text: `bash: ${input}: command not found` }],
      };
    }
  }
};

/** Parse a typed line and produce what the machine says back. */
export const runShellCommand = (
  line: string,
  language: Language,
  history: readonly string[] = [],
): ShellResponse => {
  const trimmed = line.trim();

  if (trimmed === "") return { kind: "lines", lines: [] };

  // Quoted arguments survive as one token, which is all the quoting these commands
  // need — `echo "two words"` should not print two arguments.
  const tokens = trimmed.match(/"[^"]*"|'[^']*'|\S+/g) ?? [];
  const input = (tokens[0] ?? "").toLowerCase();
  const args = tokens.slice(1).map((token) => token.replace(/^["']|["']$/g, ""));

  return run(input, args, machine(language), history);
};

/** The history the session opens with: the banner, then as much login chatter as it
 *  takes to look like a machine that was already running before anyone looked at it.
 *
 *  It is history, not chrome, so `clear` wipes it along with everything else — which
 *  is what a real screen does, and why the banner comes back when the monitor is
 *  powered off and on again rather than surviving as a permanent fixture. */
export const bootLines = (language: Language): readonly ShellLine[] => {
  const indonesian = language === "id";

  return [
    { kind: "banner" },
    { kind: "gap" },
    muted(`BangpiiOS 6.9.0-webgl  ${HOSTNAME}`),
    muted(
      indonesian
        ? `login: ${USERNAME} — ketik help untuk melihat perintah`
        : `login: ${USERNAME} — type help for the command list`,
    ),
    { kind: "gap" },
  ];
};
