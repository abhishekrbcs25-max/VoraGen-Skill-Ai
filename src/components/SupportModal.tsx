import { Mail, Phone, ShieldCheck, User, X } from 'lucide-react';

interface SupportModalProps {
  open: boolean;
  onClose: () => void;
}

export function SupportModal({ open, onClose }: SupportModalProps) {
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="support-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
    >
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 dark:border-white/15 bg-white dark:bg-[#0E131F] p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              id="support-dialog-title"
              className="font-display text-xl font-bold text-slate-900 dark:text-white"
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

        <div className="mt-5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#141B2D] p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-600/10 dark:bg-blue-500/15 flex items-center justify-center text-red-700 dark:text-blue-400">
              <User className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Platform Lead & Support</p>
              <p className="text-base font-semibold text-slate-900 dark:text-white">Abhishek R</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200 dark:border-white/10">
            <a
              href="mailto:abhishekr.bcs25@gmail.com"
              className="flex items-center gap-2.5 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0E131F] px-3 py-2.5 text-sm text-slate-800 dark:text-slate-200 hover:border-red-500 dark:hover:border-blue-400 transition-colors"
            >
              <Mail className="w-4 h-4 text-red-600 dark:text-pink-400 shrink-0" />
              <span className="truncate">abhishekr.bcs25@gmail.com</span>
            </a>

            <a
              href="tel:9745169331"
              className="flex items-center gap-2.5 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0E131F] px-3 py-2.5 text-sm font-mono tabular-nums text-slate-800 dark:text-slate-200 hover:border-emerald-600 dark:hover:border-amber-400 transition-colors"
            >
              <Phone className="w-4 h-4 text-emerald-600 dark:text-amber-400 shrink-0" />
              <span>9745169331</span>
            </a>
          </div>
        </div>

        <div className="mt-4 space-y-2 text-xs text-slate-600 dark:text-slate-400">
          <p className="flex items-center gap-1.5 font-medium text-slate-800 dark:text-slate-200">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-blue-400" />
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
            className="px-5 py-2 rounded-lg text-sm font-semibold bg-red-600 text-white hover:bg-red-700 dark:bg-blue-600 dark:hover:bg-blue-500 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
