import { useEffect } from 'react';
import { Mail, ShieldCheck, User, X } from 'lucide-react';

interface SupportModalProps {
  open: boolean;
  onClose: () => void;
}

export function SupportModal({ open, onClose }: SupportModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="support-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs"
    >
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 dark:border-[#1E3A5F]/70 bg-white dark:bg-[#0A1628] p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              id="support-dialog-title"
              className="font-display text-xl font-bold text-[#0B2545] dark:text-white"
            >
              Help & Platform Support
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              Direct engineering contact and hackathon evaluation support.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close support dialog"
            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-5 rounded-xl border border-slate-200 dark:border-[#1E3A5F]/60 bg-[#F4F7FB] dark:bg-[#05070B] p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#0B2545]/10 dark:bg-[#1D4ED8]/20 flex items-center justify-center text-[#0B2545] dark:text-amber-400">
              <User className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Platform Support & Inquiries</p>
              <p className="text-base font-semibold text-[#0B2545] dark:text-white">
                Vora Generation Network
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 pt-2 border-t border-slate-200 dark:border-white/10">
            <a
              href="mailto:voragenerationnetwork@gmail.com"
              className="flex items-center gap-2.5 rounded-lg border border-slate-200 dark:border-[#1E3A5F]/60 bg-white dark:bg-[#0A1628] px-3 py-2.5 text-sm text-[#0B2545] dark:text-slate-200 hover:border-[#0B2545] dark:hover:border-amber-400 transition-colors"
            >
              <Mail className="w-4 h-4 text-[#0B2545] dark:text-amber-400 shrink-0" />
              <span className="truncate">voragenerationnetwork@gmail.com</span>
            </a>
          </div>
        </div>

        <div className="mt-4 space-y-2 text-xs text-slate-600 dark:text-slate-400">
          <p className="flex items-center gap-1.5 font-medium text-[#0B2545] dark:text-slate-200">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            Quick Walkthrough for Learners & Evaluators
          </p>
          <p>
            1. Open <strong>Skill Analysis</strong> to run the Multi-Agent diagnostic or score below 60% on a quiz to see live adaptive remedial recalibration.
          </p>
          <p>
            2. Switch goals in <strong>Career Matching</strong> to watch your missing skills and roadmap recalculate instantaneously.
          </p>
          <p>
            3. Explore <strong>AI Mentor</strong> for AI Staff Teachers & interactive AI Video Lessons, <strong>Code Arena</strong> (50,000+ programs), <strong>Voragen Games</strong> (6 skill games), and <strong>Global Jobs</strong> (20,000+ employers).
          </p>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-lg text-sm font-semibold bg-[#0B2545] text-white hover:bg-[#13315C] dark:bg-[#1D4ED8] dark:hover:bg-[#2563EB] transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
