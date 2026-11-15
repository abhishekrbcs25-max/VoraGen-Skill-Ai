interface LogoProps {
  className?: string;
}

export function Logo({ className = 'w-9 h-9' }: LogoProps) {
  return (
    <img
      src="/assets/aistudio/VORAGEN_SKILL_Navy_Logo_51a393e3.png"
      alt="VoraGen Skill AI logo"
      referrerPolicy="no-referrer"
      className={`object-cover rounded-lg border border-[#0B2545]/25 dark:border-amber-400/40 bg-[#07152B] shadow-xs ${className}`}
    />
  );
}
