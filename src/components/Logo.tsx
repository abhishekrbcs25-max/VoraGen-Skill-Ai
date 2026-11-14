interface LogoProps {
  className?: string;
}

export function Logo({ className = 'w-8 h-8' }: LogoProps) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Precision octagonal/rounded prism shield */}
      <rect
        x="2"
        y="2"
        width="36"
        height="36"
        rx="10"
        className="fill-red-600/10 stroke-red-600 dark:fill-blue-500/15 dark:stroke-blue-400"
        strokeWidth="1.75"
      />
      {/* Primary Voragen geometric V outer wings */}
      <path
        d="M10.5 12L20 28.5L29.5 12"
        className="stroke-red-600 dark:stroke-blue-400"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Inner neural chevron accent */}
      <path
        d="M15.2 12L20 20.5L24.8 12"
        className="stroke-emerald-600 dark:stroke-pink-400"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Apex trajectory spark */}
      <circle cx="20" cy="31.5" r="2.1" className="fill-amber-500 dark:fill-amber-400" />
    </svg>
  );
}
