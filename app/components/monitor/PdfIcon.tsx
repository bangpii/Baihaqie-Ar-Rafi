interface PdfIconProps {
  className?: string;
}

export const PdfIcon = ({ className }: PdfIconProps) => (
  <svg aria-hidden="true" className={className} fill="none" focusable="false" viewBox="0 0 24 18">
    <path
      d="M3.4 1.4h8.1l4.9 4.9v9.3a1.3 1.3 0 0 1-1.3 1.3H3.4A1.3 1.3 0 0 1 2.1 15.6V2.7a1.3 1.3 0 0 1 1.3-1.3z"
      fill="#f4f2ef"
      stroke="currentColor"
      strokeLinejoin="round"
      strokeWidth="1.4"
    />

    <path d="M11.3 1.7v4.8h4.9" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.4" />

    <rect fill="#e2352b" height="5.6" rx="1" width="10.4" x="4.7" y="10.2" />

    <text
      fill="#fff"
      fontFamily="var(--font-geist-sans), Arial, sans-serif"
      fontSize="3.7"
      fontWeight="700"
      letterSpacing="0.15"
      textAnchor="middle"
      x="9.9"
      y="14.4"
    >
      PDF
    </text>
  </svg>
);

export default PdfIcon;

