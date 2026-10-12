export const projectIds = [
  "racik-kopi",
  "futsal-terminal",
  "klinik-mariana",
  "winner-yanti",
  "raharpa-shopp",
  "math-drive",
  "make-over",
  "jasa-hubb",
  "management-informatika",
  "donasi-yuk",
  "lms-smkn8",
  "londrex",
  "absensi-smkn8",
  "seru-seruan",
  "convert-pdf",
  "cerita-nusantara",
  "react-vault",
  "news-now",
] as const;

export type ProjectId = (typeof projectIds)[number];

export interface LocalizedText {
  id: string;
  en: string;
}

export interface Project {
  id: ProjectId;
  /** The website's name, shown under its screenshot and on the detail panel. */
  name: string;
  /** Where the browser fetches the screenshot from. */
  imageSrc: string;
  /** The repository, as a normal link — GitHub will not render inside a frame. */
  github: string;
  /** The live deployment, or null once hosting has ended. */
  url: string | null;
  /** The stack, shown as chips when the repository stands in for a dead deployment. */
  languages: readonly string[];
  /** What I did on it, where that is worth saying (a shared or partly-handled project). */
  role?: LocalizedText;
  description: LocalizedText;
}

export const projects: readonly Project[] = [
  {
    id: "racik-kopi",
    name: "Racik Kopi",
    imageSrc: "https://res.cloudinary.com/dgpa9j5ua/image/upload/f_auto,q_auto/bangpi-profile/projects/racik-kopi.png",
    github: "https://github.com/bangpii/RacikKopi",
    url: null,
    languages: ["PHP", "MySQL", "JavaScript"],
    description: {
      id: "Situs profil dan katalog menu kedai kopi, lengkap dengan panel admin untuk mengelola menu, konten, dan registrasi pelanggan. Dibangun dengan PHP native dan basis data MySQL di atas HTML, CSS, dan JavaScript.",
      en: "A coffee-shop profile and menu catalogue with an admin panel for managing the menu, content and customer registrations. Built with vanilla PHP and a MySQL database over HTML, CSS and JavaScript.",
    },
  },
  {
    id: "futsal-terminal",
    name: "Futsal Terminal",
    imageSrc: "https://res.cloudinary.com/dgpa9j5ua/image/upload/f_auto,q_auto/bangpi-profile/projects/futsal-terminal.jpg",
    github: "https://github.com/bangpii/Futsal",
    url: null,
    languages: ["PHP", "MySQL", "JavaScript"],
    description: {
      id: "Aplikasi pemesanan lapangan futsal dengan halaman publik dan panel admin untuk mengatur jadwal serta data pesanan. Ditulis dengan PHP native dan MySQL di atas HTML, CSS, dan JavaScript.",
      en: "A futsal court booking app with a public page and an admin panel for schedules and bookings. Written in vanilla PHP with MySQL over HTML, CSS and JavaScript.",
    },
  },
  {
    id: "klinik-mariana",
    name: "Klinik Mariana",
    imageSrc: "https://res.cloudinary.com/dgpa9j5ua/image/upload/f_auto,q_auto/bangpi-profile/projects/klinik-mariana.png",
    github: "https://github.com/bangpii/Klinik",
    url: null,
    languages: ["Node.js", "Express", "SQLite", "JavaScript"],
    description: {
      id: "Sistem informasi klinik dengan empat peran pengguna — admin, dokter, resepsionis, dan pasien. Antarmuka HTML/CSS/JS dilayani oleh server Express (Node.js) dengan basis data SQLite dan hashing kata sandi bcrypt.",
      en: "A clinic information system with four user roles — admin, doctor, receptionist and patient. An HTML/CSS/JS interface served by an Express (Node.js) backend with an SQLite database and bcrypt password hashing.",
    },
  },
  {
    id: "winner-yanti",
    name: "Winner & Yanti",
    imageSrc: "https://res.cloudinary.com/dgpa9j5ua/image/upload/f_auto,q_auto/bangpi-profile/projects/winner-yanti.png",
    github: "https://github.com/bangpii/pernikahan",
    url: "https://pernikahan-three.vercel.app",
    languages: ["HTML", "CSS", "JavaScript"],
    description: {
      id: "Undangan pernikahan digital satu halaman dengan hitung mundur acara, galeri, dan musik latar. Dibangun murni dengan HTML, CSS, dan JavaScript memakai pustaka SimplyCountdown.",
      en: "A single-page digital wedding invitation with an event countdown, gallery and background music. Built purely with HTML, CSS and JavaScript using the SimplyCountdown library.",
    },
  },
  {
    id: "raharpa-shopp",
    name: "RaharpaShopp",
    imageSrc: "https://res.cloudinary.com/dgpa9j5ua/image/upload/f_auto,q_auto/bangpi-profile/projects/raharpa-shopp.jpg",
    github: "https://github.com/bangpii/RaharpaShopp",
    url: "https://raharpa-shopp.vercel.app",
    languages: ["React", "Vite", "Tailwind CSS", "GSAP", "Chart.js", "Socket.IO"],
    description: {
      id: "Toko online (thrift) dengan keranjang, checkout, dan dasbor statistik penjualan. Dibangun dengan React + Vite dan Tailwind CSS, memakai GSAP untuk animasi, Chart.js untuk grafik, dan Socket.IO untuk data real-time.",
      en: "An online thrift store with a cart, checkout and a sales dashboard. Built with React + Vite and Tailwind CSS, using GSAP for animation, Chart.js for charts and Socket.IO for real-time updates.",
    },
  },
  {
    id: "math-drive",
    name: "MathDrive",
    imageSrc: "https://res.cloudinary.com/dgpa9j5ua/image/upload/f_auto,q_auto/bangpi-profile/projects/math-drive.png",
    github: "https://github.com/bangpii/MathDrive",
    url: "https://mathdrive.vercel.app",
    languages: ["HTML", "CSS", "JavaScript", "Tailwind CSS"],
    description: {
      id: "Permainan edukasi yang menggabungkan balapan mobil dengan soal matematika. Dibuat dengan HTML, CSS, dan JavaScript serta Tailwind CSS, dan di-deploy sebagai situs statis di Vercel.",
      en: "An educational game combining car racing with maths challenges. Made with HTML, CSS and JavaScript plus Tailwind CSS, and deployed as a static site on Vercel.",
    },
  },
  {
    id: "make-over",
    name: "MakeOver",
    imageSrc: "https://res.cloudinary.com/dgpa9j5ua/image/upload/f_auto,q_auto/bangpi-profile/projects/make-over.png",
    github: "https://github.com/bangpii/MakeOver",
    url: "https://make-over-one.vercel.app",
    languages: ["React", "Vite", "Tailwind CSS", "MediaPipe"],
    description: {
      id: "Aplikasi virtual try-on yang mendeteksi wajah lewat kamera untuk mencoba berbagai gaya riasan secara langsung. Dibangun dengan React + Vite dan Tailwind CSS, memakai MediaPipe Face Mesh untuk pelacakan wajah.",
      en: "A virtual try-on app that detects the face through the camera to preview makeup looks live. Built with React + Vite and Tailwind CSS, using MediaPipe Face Mesh for face tracking.",
    },
  },
  {
    id: "jasa-hubb",
    name: "JasaHubb",
    imageSrc: "https://res.cloudinary.com/dgpa9j5ua/image/upload/f_auto,q_auto/bangpi-profile/projects/jasa-hubb.png",
    github: "https://github.com/bangpii/JasaHub",
    url: "https://jasa-hub-tau.vercel.app",
    languages: ["React", "Vite", "Tailwind CSS", "Spline", "Chart.js"],
    description: {
      id: "Marketplace yang menghubungkan penyedia jasa dengan pelanggan, dengan landing page publik dan dasbor. Dibangun dengan React + Vite dan Tailwind CSS, memakai Spline untuk elemen 3D dan Chart.js untuk grafik.",
      en: "A marketplace connecting service providers with customers, with a public landing page and a dashboard. Built with React + Vite and Tailwind CSS, using Spline for 3D elements and Chart.js for charts.",
    },
  },
  {
    id: "management-informatika",
    name: "Management Informatika",
    imageSrc: "https://res.cloudinary.com/dgpa9j5ua/image/upload/f_auto,q_auto/bangpi-profile/projects/management-informatika.png",
    github: "https://github.com/bangpii/Loma",
    url: "https://loma-two.vercel.app",
    languages: ["React", "Three.js", "React Three Fiber", "Tailwind CSS", "Chart.js"],
    description: {
      id: "Situs profil himpunan mahasiswa Manajemen Informatika (HMPS MI) dengan elemen 3D interaktif. Dibangun dengan React dan Three.js lewat React Three Fiber di atas Tailwind CSS, memakai Chart.js untuk data serta Jotai untuk manajemen state.",
      en: "A student-association profile site for Information Management (HMPS MI) with interactive 3D elements. Built with React and Three.js via React Three Fiber over Tailwind CSS, using Chart.js for data and Jotai for state management.",
    },
  },
  {
    id: "donasi-yuk",
    name: "DonasiYuk",
    imageSrc: "https://res.cloudinary.com/dgpa9j5ua/image/upload/f_auto,q_auto/bangpi-profile/projects/donasi-yuk.png",
    github: "https://github.com/bangpii/DonasiYuk",
    url: "https://donasi-yuk.vercel.app",
    languages: ["React", "Vite", "Tailwind CSS", "Firebase", "Socket.IO", "Recharts"],
    description: {
      id: "Platform penggalangan dana dengan katalog kampanye, donasi, dan pembaruan real-time. Dibangun dengan React + Vite dan Tailwind CSS, memakai Firebase, Socket.IO, Recharts untuk grafik, serta Swiper dan AOS untuk animasi.",
      en: "A fundraising platform with campaign listings, donations and real-time updates. Built with React + Vite and Tailwind CSS, using Firebase, Socket.IO, Recharts for charts and Swiper/AOS for animation.",
    },
  },
  {
    id: "lms-smkn8",
    name: "LMS SMKN 8 Medan",
    imageSrc: "https://res.cloudinary.com/dgpa9j5ua/image/upload/f_auto,q_auto/bangpi-profile/projects/lms-smkn8.png",
    github: "https://github.com/mrsidabukke/lms_sekolah",
    url: "https://loginlms.smkn8medan.sch.id",
    languages: ["Laravel", "PHP", "MySQL", "REST API"],
    role: { id: "Backend Developer", en: "Backend Developer" },
    description: {
      id: "Sistem manajemen pembelajaran (LMS) untuk SMKN 8 Medan. Saya berkontribusi pada sisi backend — API, autentikasi, dan logika data — di atas Laravel dan MySQL.",
      en: "A learning management system (LMS) for SMKN 8 Medan. I worked on the backend — APIs, authentication and data logic — on top of Laravel and MySQL.",
    },
  },
  {
    id: "londrex",
    name: "Londrex",
    imageSrc: "https://res.cloudinary.com/dgpa9j5ua/image/upload/f_auto,q_auto/bangpi-profile/projects/londrex.png",
    github: "https://github.com/bangpii/Lodrex",
    url: null,
    languages: ["Laravel", "PHP", "Tailwind CSS", "Vite", "MySQL"],
    description: {
      id: "Aplikasi web full-stack berbasis Laravel 12 dengan pembaruan real-time lewat Laravel Reverb. Memakai Vite + Tailwind CSS untuk antarmuka, queue untuk pekerjaan latar, dan basis data MySQL.",
      en: "A full-stack Laravel 12 web application with real-time updates through Laravel Reverb. Uses Vite + Tailwind CSS for the interface, queues for background jobs and a MySQL database.",
    },
  },
  {
    id: "absensi-smkn8",
    name: "Absensi SMKN 8 Medan",
    imageSrc: "https://res.cloudinary.com/dgpa9j5ua/image/upload/f_auto,q_auto/bangpi-profile/projects/absensi-smkn8.png",
    github: "https://github.com/bangpii/WebsiteAbsensi",
    url: "https://adminabsensi.smkn8medan.sch.id",
    languages: ["Laravel", "MySQL", "Bootstrap", "JavaScript"],
    role: { id: "Full-Stack Developer", en: "Full-Stack Developer" },
    description: {
      id: "Sistem absensi sekolah untuk SMKN 8 Medan: absensi siswa berbasis lokasi, pengumuman, jadwal, dan manajemen data siswa. Dikerjakan full-stack dengan Laravel, MySQL, Bootstrap, dan JavaScript.",
      en: "A school attendance system for SMKN 8 Medan: location-based student attendance, announcements, schedules and student records. Built full-stack with Laravel, MySQL, Bootstrap and JavaScript.",
    },
  },
  {
    id: "seru-seruan",
    name: "Seru Seruan",
    imageSrc: "https://res.cloudinary.com/dgpa9j5ua/image/upload/f_auto,q_auto/bangpi-profile/projects/seru-seruan.png",
    github: "https://github.com/bangpii/Wisata",
    url: "https://wisata-smoky.vercel.app",
    languages: ["Node.js", "Express", "Sequelize", "MySQL", "Socket.IO", "React", "Vite", "Tailwind CSS"],
    description: {
      id: "Aplikasi pemesanan open-trip wisata dengan landing page pelanggan dan panel admin bertingkat. Backend memakai Node.js + Express, Sequelize, MySQL, Socket.IO (real-time), JWT, dan Cloudinary; frontend memakai React 19 + Vite, Tailwind CSS, Framer Motion, dan Recharts.",
      en: "An open-trip travel booking app with a customer landing page and a tiered admin panel. The backend uses Node.js + Express, Sequelize, MySQL, Socket.IO (real-time), JWT and Cloudinary; the frontend uses React 19 + Vite, Tailwind CSS, Framer Motion and Recharts.",
    },
  },
  {
    id: "convert-pdf",
    name: "Convert PDF",
    imageSrc: "https://res.cloudinary.com/dgpa9j5ua/image/upload/f_auto,q_auto/bangpi-profile/projects/convert-pdf.png",
    github: "https://github.com/bangpii/BangpiiPDF",
    url: "https://bangpii-pdf.vercel.app",
    languages: ["React", "Vite", "TypeScript", "Tailwind CSS"],
    description: {
      id: "Alat berbasis web untuk mengonversi berkas ke dan dari PDF. Dibangun dengan React + Vite, TypeScript, dan Tailwind CSS.",
      en: "A web tool for converting files to and from PDF. Built with React + Vite, TypeScript and Tailwind CSS.",
    },
  },
  {
    id: "cerita-nusantara",
    name: "Cerita Nusantara",
    imageSrc: "https://res.cloudinary.com/dgpa9j5ua/image/upload/f_auto,q_auto/bangpi-profile/projects/cerita-nusantara.png",
    github: "https://github.com/bangpii/BangpiiCerita",
    url: "https://bangpii-cerita.vercel.app",
    languages: ["React", "Vite", "TypeScript", "Tailwind CSS", "Framer Motion"],
    description: {
      id: "Platform cerita rakyat Nusantara dengan antarmuka yang halus dan animatif. Dibangun dengan React + Vite, TypeScript, dan Tailwind CSS, memakai Framer Motion untuk animasi.",
      en: "A platform for Indonesian folk tales with a smooth, animated interface. Built with React + Vite, TypeScript and Tailwind CSS, using Framer Motion for animation.",
    },
  },
  {
    id: "react-vault",
    name: "React Vault",
    imageSrc: "https://res.cloudinary.com/dgpa9j5ua/image/upload/f_auto,q_auto/bangpi-profile/projects/react-vault.png",
    github: "https://github.com/bangpii/ReactVault",
    url: "https://react-vault-sigma.vercel.app",
    languages: ["React", "TypeScript", "Vite", "Tailwind CSS", "React Router", "Motion"],
    description: {
      id: "Direktori kurasi ekosistem React — kumpulan library animasi, komponen, UI, dan tools pilihan dengan pencarian pintasan keyboard dan filter kategori. Dibangun dengan React 19 + TypeScript + Vite, Tailwind CSS, React Router, dan Motion.",
      en: "A curated directory of the React ecosystem — chosen animation, component, UI and developer tools with keyboard-shortcut search and category filters. Built with React 19 + TypeScript + Vite, Tailwind CSS, React Router and Motion.",
    },
  },
  {
    id: "news-now",
    name: "News Now",
    imageSrc: "https://res.cloudinary.com/dgpa9j5ua/image/upload/f_auto,q_auto/bangpi-profile/projects/news-now.png",
    github: "https://github.com/bangpii/BangPiiNews",
    url: "https://bang-pii-news.vercel.app",
    languages: ["Next.js", "React", "TypeScript", "Tailwind CSS"],
    description: {
      id: "Portal berita independen berbahasa Indonesia dengan beranda, kategori, halaman artikel, dan feed komunitas, lengkap dengan mode gelap/terang serta antarmuka bilingual. Dibangun dengan Next.js 16, React 19, TypeScript, dan Tailwind CSS v4.",
      en: "An independent Indonesian news portal with a home page, categories, article pages and a community feed, plus dark/light mode and a bilingual interface. Built with Next.js 16, React 19, TypeScript and Tailwind CSS v4.",
    },
  },
];

