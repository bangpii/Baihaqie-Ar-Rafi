import type { CvDocumentId } from "@/app/lib/documents";
import type { Language } from "@/app/lib/i18n";

export type SpecRow = readonly [label: string, value: string];

export type DesktopCopy = {
  wordmark: string;
  panel: {
    /** Read by a screen reader; the two visible strings are decorative to it. */
    clockLabel: string;
    folderLabel: string;
    /** The visible word on the folder launcher, next to the terminal's. */
    folder: string;
    /** The terminal launcher, the bar's second live control. */
    terminalLabel: string;
    /** The Kali mark is the bar's session menu: it opens the logout dialog, which is
     *  three actions rather than a list of applications. */
    logoLabel: string;
    logOut: string;
    restart: string;
    shutDown: string;
  };
  /** The window chrome both windows share: the two controls beside Close. Their labels
   *  are read aloud only — the bar draws glyphs — so they name the action, not the icon. */
  window: {
    minimize: string;
    maximize: string;
    restore: string;
  };
  /** The seconds before the desktop: announced rather than drawn, because the boot is
   *  the mark wiping into place and the name of the machine is the only word for it. */
  boot: {
    label: string;
  };
  /** The terminal window, opened from the panel rather than left on the glass. */
  terminal: {
    title: string;
    label: string;
    close: string;
  };
  /** The rule across the top of the desk. Its number is the section's, not the
   *  machine's: the desk is where the dive arrives, and the masthead is what tells
   *  the reader they have arrived somewhere rather than still be zooming. */
  masthead: {
    number: string;
    title: string;
    /** For the live magnification readout, which is written by the hero. */
    depthLabel: string;
    /** The little scale rule under the masthead. */
    scaleFrom: string;
    scaleTo: string;
  };
  specsTitle: string;
  helpTitle: string;
  /** Exactly two paragraphs. The right column is not a list. */
  help: readonly [string, string];
  /** A caption under the specification: one line set large, then a short paragraph.
   *
   *  A data table says what the machine has. This says what it is *for*, which is the
   *  thing a spec sheet cannot say and the reason a reader is still standing there. */
  caption: {
    lead: string;
    body: string;
  };
  /** The controls printed on the case, as captions for the real 3D buttons beside the
   *  monitor. `states` is what the control is doing now, indexed by its own value —
   *  which is why it is a list and not a pair of `on`/`off` strings: the fan has three
   *  speeds and wraps back round to the first, so a boolean here would be a lie. */
  tower: {
    title: string;
    controls: readonly {
      action: "power" | "drive" | "fan";
      cap: string;
      label: string;
      states: readonly string[];
    }[];
    note: string;
  };
  /** The commands the shell actually answers, so the reader knows what to type
   *  without having to run `help` to find out that `help` exists.
   *
   *  Kept as data rather than as markup because these are the same commands
   *  `terminal.ts` implements: a list written twice is a list that is wrong twice. */
  commands: {
    title: string;
    rows: readonly (readonly [command: string, note: string])[];
  };
  /** The keys on the keyboard that do something other than type a character. Drawn
   *  as caps rather than described, because "the up and down arrows walk the
   *  history" is a sentence and the cap is the thing. */
  keys: readonly {
    caps: readonly string[];
    action: string;
  }[];
  /** Read by a screen reader; the caps above it are decorative to one. */
  keysLabel: string;
  /** The file manager that opens *inside* the monitor, so its copy is written for
   *  somewhere the size of a projected screen. */
  files: {
    title: string;
    /** The root of the two folders. */
    homeLabel: string;
    back: string;
    close: string;
    /** The bin on the desktop: the third place the file manager can open, and the one
     *  that is a state rather than a folder, so it says what it is when it is empty. */
    trash: {
      name: string;
      empty: string;
      detail: string;
    };
    /** The two folders, and only two: the CV and the work. */
    folders: readonly [name: string, detail: string][];
    /** One line under each PDF in the CV folder, keyed by document. The filenames
     *  themselves come from `lib/documents`, since they are the same in both languages. */
    documents: Record<CvDocumentId, string>;
    /** Read aloud as the viewer window's name; the title bar shows the filename. */
    viewerLabel: string;
    /** The detail panel's action: opens the live site, in the site viewer. */
    viewWebsite: string;
    /** The detail panel's action for a deployment that has ended: opens the repository,
     *  drawn in the site viewer rather than framed, because GitHub will not be. */
    viewRepository: string;
    /** The one control on this desktop that deliberately leaves the monitor, because it
     *  leads to code the browser is already the right place for. */
    openOnGithub: string;
    /** Why a dead deployment is drawn as a card instead of a website. */
    repoNotice: string;
    /** Read aloud for the stack chips on the repository card. */
    languages: string;
    /** Read aloud as the site viewer window's name; the title bar shows the project. */
    siteViewerLabel: string;
  };
  specs: readonly SpecRow[];
};

export const desktopCopy: Record<Language, DesktopCopy> = {
  id: {
    wordmark: "Kali Linux",
    panel: {
      clockLabel: "Jam dan tanggal",
      folderLabel: "Buka folder Kali Linux",
      folder: "Folder",
      terminalLabel: "Buka terminal Kali Linux",
      logoLabel: "Menu keluar Kali Linux",
      logOut: "Keluar",
      restart: "Nyalakan ulang",
      shutDown: "Matikan",
    },
    window: {
      minimize: "Perkecil jendela",
      maximize: "Perbesar jendela",
      restore: "Kembalikan ukuran jendela",
    },
    boot: {
      label: "Menyalakan mesin",
    },
    terminal: {
      title: "Terminal — baihaqiearrafi@LINUX",
      label: "Terminal",
      close: "Tutup terminal",
    },
    specsTitle: "Spesifikasi",
    helpTitle: "Cara penggunaan",
    masthead: {
      number: "01",
      title: "Stasiun",
      depthLabel: "Kedalaman",
      scaleFrom: "1×",
      scaleTo: "130×",
    },
    help: [
      "Nyalakan mesin dari tombol daya pada casing, lalu ketik perintah di terminal yang menyala di monitor. Setiap perintah yang dipakai disimpan, dan panah atas dan bawah menelusurinya kembali.",
      "Semua tombol pada keyboard bisa diklik dan hasilnya sama dengan ditekan. Monitor ini bagian dari halaman, bukan program terpisah: roda mouse atau tombol w menarik kamera kembali ke halaman depan.",
    ],
    caption: {
      lead: "Meja kerja, bukan lampiran.",
      body: "Semua yang berdiri di sini bisa dipakai. Monitor di tengah adalah terminal yang bekerja sungguhan — ketik perintah, mesin menjawab. Casing di sebelah kiri adalah tempat mesin itu hidup: tombol dan kipasnya bukan gambar.",
    },
    tower: {
      title: "Kontrol casing",
      controls: [
        {
          action: "power",
          cap: "PWR",
          label: "daya",
          states: ["mati", "nyala"],
        },
        {
          action: "drive",
          cap: "DRV",
          label: "folder",
          states: ["tutup", "buka"],
        },
        {
          action: "fan",
          cap: "FAN",
          label: "kipas",
          states: ["pelan", "sedang", "cepat"],
        },
      ],
      note: "Klik langsung tombolnya pada casing. Daya menyalakan dan mematikan mesin, dan sakelar itu hanya ada di casing dan di dial keyboard; eject membuka folder di panel Kali.",
    },
    commands: {
      title: "Perintah",
      rows: [
        ["help", "daftar perintah ini"],
        ["neofetch", "ringkasan mesin"],
        ["whoami", "nama lengkap"],
        ["pwd", "direktori sekarang"],
        ["ls", "daftar berkas"],
        ["cat <berkas>", "isi berkas"],
        ["uname -a", "info kernel"],
        ["history", "riwayat perintah"],
        ["exit", "matikan monitor"],
      ],
    },
    keys: [
      { caps: ["return"], action: "jalankan perintah" },
      { caps: ["delete"], action: "hapus satu karakter" },
      { caps: ["↑", "↓"], action: "telusuri riwayat perintah" },
    ],
    keysLabel: "Tombol khusus dan fungsinya",
    files: {
      title: "Manajer Berkas",
      homeLabel: "Rumah",
      back: "Kembali",
      close: "Tutup",
      trash: {
        name: "Sampah",
        empty: "Sampah kosong",
        detail: "Berkas yang dihapus muncul di sini.",
      },
      folders: [
        ["CV", "Profil, pendidikan, dan pengalaman"],
        ["Project", "Karya dan proyek yang pernah dibuat"],
      ],
      documents: {
        resume: "Curriculum Vitae dan biodata",
        certificate: "Sertifikat pencapaian",
        transcript: "Transkrip nilai akademik",
      },
      viewerLabel: "Penampil dokumen",
      viewWebsite: "Lihat Website",
      viewRepository: "Lihat Repositori",
      openOnGithub: "Buka di GitHub",
      repoNotice:
        "Hosting situs ini sudah berakhir, dan GitHub tidak mengizinkan dirinya ditampilkan di dalam bingkai — jadi inilah repositorinya: tumpukan teknologi yang dipakai, dan satu tautan ke kode sumbernya.",
      languages: "Tumpukan teknologi",
      siteViewerLabel: "Penampil situs",
    },
    specs: [
      ["Processor", "AMD Ryzen 5 5625U"],
      ["Memory", "16 GB DDR4"],
      ["Storage", "512 GB NVMe SSD"],
      ["Graphics", "AMD Radeon Graphics"],
      ["Display", '15.6" FHD 1920 × 1080'],
      ["Sistem", "Kali Linux 2026.1"],
    ],
  },
  en: {
    wordmark: "Kali Linux",
    panel: {
      clockLabel: "Time and date",
      folderLabel: "Open the Kali Linux folder",
      folder: "Folder",
      terminalLabel: "Open the Kali Linux terminal",
      logoLabel: "Kali Linux session menu",
      logOut: "Log Out",
      restart: "Restart",
      shutDown: "Shut Down",
    },
    window: {
      minimize: "Minimize window",
      maximize: "Maximize window",
      restore: "Restore window",
    },
    boot: {
      label: "Starting the machine",
    },
    terminal: {
      title: "Terminal — baihaqiearrafi@LINUX",
      label: "Terminal",
      close: "Close the terminal",
    },
    specsTitle: "Specification",
    helpTitle: "How to use it",
    masthead: {
      number: "01",
      title: "Station",
      depthLabel: "Depth",
      scaleFrom: "1×",
      scaleTo: "130×",
    },
    help: [
      "Switch the machine on at the power button on the case, then type commands in the terminal on the glass. Every command you run is kept, and the up and down arrows walk back through them.",
      "Every key on the keyboard can be clicked and does exactly what pressing it would. The monitor is part of the page rather than a separate program: the wheel, or `w`, brings the camera back to the front.",
    ],
    caption: {
      lead: "A work desk, not an attachment.",
      body: "Everything standing here is real. The monitor in the middle is a working terminal — type a command and the machine answers. The case beside it is where the machine lives: its buttons and fans are not a picture of controls.",
    },
    tower: {
      title: "Case controls",
      controls: [
        {
          action: "power",
          cap: "PWR",
          label: "power",
          states: ["off", "on"],
        },
        {
          action: "drive",
          cap: "DRV",
          label: "drive",
          states: ["closed", "open"],
        },
        {
          action: "fan",
          cap: "FAN",
          label: "fan",
          states: ["quiet", "mid", "full"],
        },
      ],
      note: "Click them on the case itself. Power switches the machine on and off, and that switch lives only on the case and on the keyboard's dial; drive opens the folder on the Kali panel.",
    },
    commands: {
      title: "Commands",
      rows: [
        ["help", "list these commands"],
        ["neofetch", "machine summary"],
        ["whoami", "full name"],
        ["pwd", "current directory"],
        ["ls", "list files"],
        ["cat <file>", "read a file"],
        ["uname -a", "kernel info"],
        ["history", "command history"],
        ["exit", "power off the monitor"],
      ],
    },
    keys: [
      { caps: ["return"], action: "run the command" },
      { caps: ["delete"], action: "remove one character" },
      { caps: ["↑", "↓"], action: "walk the command history" },
    ],
    keysLabel: "The special keys and what they do",
    files: {
      title: "File Manager",
      homeLabel: "Home",
      back: "Back",
      close: "Close",
      trash: {
        name: "Trash",
        empty: "Trash is empty",
        detail: "Deleted files appear here.",
      },
      folders: [
        ["CV", "Profile, education, and experience"],
        ["Project", "Work and projects made so far"],
      ],
      documents: {
        resume: "Curriculum vitae and biodata",
        certificate: "Certificates of achievement",
        transcript: "Academic transcript",
      },
      viewerLabel: "Document viewer",
      viewWebsite: "View Website",
      viewRepository: "View Repository",
      openOnGithub: "Open on GitHub",
      repoNotice:
        "This site's hosting has ended, and GitHub does not allow itself to be framed — so here is the repository instead: the stack it was built with, and a link to its source code.",
      languages: "Technology stack",
      siteViewerLabel: "Site viewer",
    },
    specs: [
      ["Processor", "AMD Ryzen 5 5625U"],
      ["Memory", "16 GB DDR4"],
      ["Storage", "512 GB NVMe SSD"],
      ["Graphics", "AMD Radeon Graphics"],
      ["Display", '15.6" FHD 1920 × 1080'],
      ["System", "Kali Linux 2026.1"],
    ],
  },
};

