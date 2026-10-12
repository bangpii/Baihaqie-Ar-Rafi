export const cvDocumentIds = ["resume", "certificate", "transcript"] as const;

export type CvDocumentId = (typeof cvDocumentIds)[number];

export interface CvDocument {
  id: CvDocumentId;
  /** The filename shown in the folder, exactly as it is on disk. */
  fileName: string;
  /** Where the reader's browser fetches it from. */
  src: string;
}

export const cvDocuments: readonly CvDocument[] = [
  { id: "resume", fileName: "Baihaqie Ar Rafi.pdf", src: "https://res.cloudinary.com/dgpa9j5ua/image/upload/bangpi-profile/cv/resume.pdf" },
  { id: "certificate", fileName: "Sertifikat.pdf", src: "https://res.cloudinary.com/dgpa9j5ua/image/upload/bangpi-profile/cv/certificate.pdf" },
  { id: "transcript", fileName: "TranskipNilai.pdf", src: "https://res.cloudinary.com/dgpa9j5ua/image/upload/bangpi-profile/cv/transcript.pdf" },
];

