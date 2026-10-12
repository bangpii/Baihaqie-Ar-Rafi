import type { SocialIconName } from "@/app/components/icons/SocialIcon";

export const languages = ["id", "en"] as const;

export type Language = (typeof languages)[number];

export type Social = {
  label: string;
  href: string;
  /** Which glyph to draw beside the label. The label stays: at 16px a brand mark
   *  is not reliably distinguishable, and four abstract marks in a column give a
   *  screen reader nothing to announce. */
  icon: SocialIconName;
};

export type Messages = {
  name: string;
  rolesTitle: string;
  roles: readonly string[];
  skillsTitle: string;
  skills: readonly string[];
  connectTitle: string;
  /** Campus, set directly under the roles. It belongs there and not under
   *  `baseTitle`: that heading is explicitly geographic, and a university is a
   *  credential rather than an address. Roles state the professional standing,
   *  the campus states where it came from, so the two read as one block. */
  school: string;
  /** Availability line under the roles. One of the highest value-per-byte
   *  additions to a portfolio: it answers the only question a visitor actually
   *  arrived with. */
  status: string;
  socials: readonly Social[];
  baseTitle: string;
  address: string;
  bio: string;
  /** The mobile document's own copy. A phone gets a different page, not a
   *  reflowed desk, so its strings live together here rather than borrowing the
   *  corner blocks' headings. */
  mobile: {
    name: string;
    bio: string;
    projectsTitle: string;
    stackLabel: string;
    visit: string;
    source: string;
    footerNote: string;
  };
};

export type MessagesByLang = {
  id: Messages;
  en: Messages;
};

export const messages: MessagesByLang = {
  id: {
    name: "Baihaqie Ar Rafi, Amd.Kom",
    rolesTitle: "Profil",
    roles: ["Junior Web Developer", "Software Engginering", "Full Stack Developer"],
    skillsTitle: "Keahlian",
    skills: [
      "JavaScript",
      "TypeScript",
      "Python",
      "PHP",
      "C++",
      "Dart",
      "Next.js",
      "React",
      "Node Express",
      "Laravel",
      "Flutter",
      "MongoDB",
      "MySQL",
      "Firebase",
      "Nginx",
      "Git",
    ],
    connectTitle: "Kontak",
    school: "Politeknik Negeri Medan",
    status: "Tersedia untuk proyek",
    socials: [
      { label: "Email", href: "mailto:baihaqiearrafi6@gmail.com", icon: "mail" },
      { label: "Instagram", href: "https://www.instagram.com/bangpiiii/", icon: "instagram" },
      { label: "LinkedIn", href: "https://www.linkedin.com/in/baihaqie-arrafi-26311b2a8", icon: "linkedin" },
      { label: "GitHub", href: "https://github.com/bangpii", icon: "github" },
      { label: "WhatsApp", href: "https://wa.me/6281536313056", icon: "whatsapp" },
      { label: "Situs", href: "https://baihaqie-ar-rafi.vercel.app", icon: "web" },
    ],
    baseTitle: "Lokasi",
    address: "Jln. Kemiri Gg. Utama No. 8",
    bio: "Pengembang web yang fokus membangun antarmuka bersih, responsif, dan aplikasi full-stack dengan React, Next.js, dan Node.js.",
    mobile: {
      name: "BAIHAQIE AR RAFI",
      bio: "Saya lulusan D3 Manajemen Informatika Politeknik Negeri Medan yang berfokus pada pengembangan web, terutama menggunakan JavaScript, TypeScript, React.js, Next.js, dan Node.js. Saya memiliki pengalaman dalam pengembangan frontend dan backend, integrasi REST API, serta pengelolaan database. Saya senang mempelajari teknologi baru, menyelesaikan masalah, dan mengembangkan aplikasi yang bermanfaat.",
      projectsTitle: "Proyek",
      stackLabel: "Teknologi",
      visit: "Lihat Situs",
      source: "Kode",
      footerNote: "Dibangun dengan Next.js, React, dan Tailwind CSS.",
    },
  },
  en: {
    name: "Baihaqie Ar Rafi, Amd.Kom",
    rolesTitle: "Profile",
    roles: ["Junior Web Developer", "Software Engineering", "Full Stack Developer"],
    skillsTitle: "Stack",
    skills: [
      "JavaScript",
      "TypeScript",
      "Python",
      "PHP",
      "Java",
      "C++",
      "Dart",
      "Next.js",
      "React",
      "Node Express",
      "Laravel",
      "Flutter",
      "MongoDB",
      "MySQL",
      "Firebase",
      "Nginx",
      "Git",
    ],
    connectTitle: "Connect",
    school: "Politeknik Negeri Medan",
    status: "Available for work",
    socials: [
      { label: "Email", href: "mailto:baihaqiearrafi6@gmail.com", icon: "mail" },
      { label: "Instagram", href: "https://www.instagram.com/bangpiiii/", icon: "instagram" },
      { label: "LinkedIn", href: "https://www.linkedin.com/in/baihaqie-arrafi-26311b2a8", icon: "linkedin" },
      { label: "GitHub", href: "https://github.com/bangpii", icon: "github" },
      { label: "WhatsApp", href: "https://wa.me/6281536313056", icon: "whatsapp" },
      { label: "Website", href: "https://baihaqie-ar-rafi.vercel.app", icon: "web" },
    ],
    baseTitle: "Base",
    address: "Jln. Kemiri Gg. Utama No. 8",
    bio: "A web developer focused on building clean, responsive interfaces and full-stack applications with React, Next.js, and Node.js.",
    mobile: {
      name: "BAIHAQIE AR RAFI",
      bio: "I am a D3 graduate in Information Management from Politeknik Negeri Medan focusing on web development, mainly with JavaScript, TypeScript, React.js, Next.js and Node.js. I have experience in frontend and backend development, REST API integration and database management. I enjoy learning new technologies, solving problems and building useful applications.",
      projectsTitle: "Projects",
      stackLabel: "Stack",
      visit: "Visit Site",
      source: "Code",
      footerNote: "Built with Next.js, React and Tailwind CSS.",
    },
  },
};