import { useMemo, useState } from 'react';
import {
  Award,
  CheckCircle2,
  Download,
  ExternalLink,
  Printer,
  QrCode,
  Search,
  Share2,
  ShieldCheck,
} from 'lucide-react';
import { ACHIEVEMENT_BADGES_CATALOG } from '../data/projectsCatalog';
import {
  buildCertificateVerificationId,
  computeEarnedBadges,
  generateDeterministicQrMatrix,
} from '../utils/platformEngines';
import { sanitizeExternalUrl } from '../utils/validation';
import { IssuerLogo } from './IssuerLogo';
import type { Certification, UserProfile } from '../types';

interface CertificationsPassportViewProps {
  profile: UserProfile;
  readinessPct: number;
  sessionToken?: string;
  onUpdateProfile: (next: UserProfile) => void;
  onRequireAuth: (reason: string) => boolean;
}

export function CertificationsPassportView({
  profile,
  readinessPct,
  sessionToken,
  onUpdateProfile,
  onRequireAuth,
}: CertificationsPassportViewProps) {
  const [selectedCert, setSelectedCert] = useState<Certification | null>(
    profile.certifications[0] || null,
  );
  const [verifyInput, setVerifyInput] = useState('VG-CERT-PY-2026');
  const [verifyResult, setVerifyResult] = useState<{
    verified: boolean;
    message: string;
  } | null>(null);
  const [shareStatus, setShareStatus] = useState<string | null>(null);

  const earnedBadges = useMemo(
    () => computeEarnedBadges(profile, readinessPct),
    [profile, readinessPct],
  );
  const earnedBadgeIds = new Set(earnedBadges.map((b) => b.id));

  const handleIssueCredential = (
    category: 'Course' | 'Skill Assessment' | 'Internship' | 'Project' | 'Training',
    title: string,
    issuer = 'Vora Generation Network',
  ) => {
    if (!onRequireAuth('generate verifiable certificates')) return;
    const certId = `VG-${category.slice(0, 3).toUpperCase()}-${Date.now().toString().slice(-5)}`;
    const newCert: Certification = {
      id: `cert-${Date.now()}`,
      title: `${title} (${category} Certificate)`,
      issuer,
      issuerLogoId: 'voragen',
      year: String(new Date().getFullYear()),
      credentialId: certId,
    };
    onUpdateProfile({
      ...profile,
      certifications: [newCert, ...profile.certifications],
    });
    setSelectedCert(newCert);
    setVerifyInput(certId);

    fetch('/api/certificates/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(sessionToken ? { 'x-voragen-token': sessionToken } : {}),
      },
      body: JSON.stringify({
        certId,
        holderName: profile.name,
        title: newCert.title,
        issuer,
        category,
        issuedYear: newCert.year,
      }),
    }).catch(() => {});
  };

  const handleVerifyLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = verifyInput.trim().toUpperCase();
    if (!id) return;

    const localCert = profile.certifications.find(
      (c) =>
        buildCertificateVerificationId(c, profile.name).toUpperCase() === id ||
        (c.credentialId || '').toUpperCase() === id,
    );
    if (localCert) {
      setVerifyResult({
        verified: true,
        message: `Verified Authentic · Holder: ${profile.name || 'Account Owner'} · "${localCert.title}" issued by ${localCert.issuer} (${localCert.year}).`,
      });
      return;
    }

    try {
      const res = await fetch(`/api/certificates/verify?id=${encodeURIComponent(id)}`);
      const data = (await res.json()) as {
        verified?: boolean;
        record?: { holderName: string; title: string; issuer: string; issuedYear: string };
        error?: string;
      };
      if (res.ok && data.verified && data.record) {
        setVerifyResult({
          verified: true,
          message: `Verified Authentic · Holder: ${data.record.holderName} · "${data.record.title}" issued by ${data.record.issuer} (${data.record.issuedYear}).`,
        });
      } else {
        setVerifyResult({
          verified: false,
          message: data.error || `No certificate record matched ID "${id}".`,
        });
      }
    } catch {
      setVerifyResult({
        verified: false,
        message: 'Verification lookup failed cleanly. Check ID format (e.g., VG-CERT-PY-2026).',
      });
    }
  };

  const handleDownloadCertificateHtml = (cert: Certification) => {
    const certId = buildCertificateVerificationId(cert, profile.name);
    const holder = profile.name || 'Verified Learner';
    const doc = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8" /><title>${cert.title}</title></head>
<body style="font-family: Georgia, serif; padding: 48px; border: 8px solid #0B2545; max-width: 780px; margin: 24px auto; color: #0B2545;">
  <p style="font-size: 12px; letter-spacing: 2px; text-transform: uppercase; color: #059669;">Vora Generation Network · Verified Credential</p>
  <h1 style="margin: 12px 0 8px;">Certificate of Achievement</h1>
  <p>Presented to</p>
  <h2 style="font-size: 28px; margin: 4px 0 16px;">${holder}</h2>
  <p>For successfully fulfilling all benchmark criteria for:</p>
  <h3>${cert.title}</h3>
  <p>Issued by <strong>${cert.issuer}</strong> · Year ${cert.year}${cert.expiryDate ? ` · Valid through ${cert.expiryDate}` : ''}</p>
  <p style="font-family: monospace; margin-top: 24px;">Credential Verification ID: ${certId}</p>
</body></html>`;
    const blob = new Blob([doc], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${certId.toLowerCase()}-certificate.html`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadPortfolioArchive = () => {
    const payload = {
      passportOwner: profile.name || 'Guest Learner',
      headline: profile.headline,
      readinessPct,
      verifiedSkills: profile.skills.filter((s) => s.verified),
      certifications: profile.certifications,
      badges: earnedBadges,
      projects: profile.projects,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `voragen-skill-passport-${(profile.name || 'learner').toLowerCase().replace(/\s+/g, '-')}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const activeCert = selectedCert || profile.certifications[0] || null;
  const activeCertId = activeCert
    ? buildCertificateVerificationId(activeCert, profile.name)
    : 'VG-CERT-PY-2026';
  const qrMatrix = useMemo(() => generateDeterministicQrMatrix(activeCertId, 15), [activeCertId]);
  const linkedinShareUrl = sanitizeExternalUrl(
    `https://www.linkedin.com/profile/add?startTask=CERTIFICATION_NAME&name=${encodeURIComponent(
      activeCert?.title || 'VoraGen Verified Skill',
    )}&certId=${encodeURIComponent(activeCertId)}`,
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-white/10 pb-5">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-950 dark:text-white">
            Certifications, Badges & Digital Skill Passport
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Course, Assessment, Internship, Project & Training credentials with QR verification, printable PDFs, and achievement milestones.
          </p>
        </div>

        <button
          type="button"
          onClick={handleDownloadPortfolioArchive}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 whitespace-nowrap"
        >
          <Download className="w-4 h-4" />
          <span>Download Achievement Portfolio</span>
        </button>
      </div>

      {/* Quick Issue Controls + Online QR Verification */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <section className="lg:col-span-7 rounded-2xl border border-slate-200 dark:border-[#1E3A5F]/60 bg-white dark:bg-[#0A1628] p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-lg font-bold text-[#0B2545] dark:text-white">
              My Verified Certificates ({profile.certifications.length})
            </h2>
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  ['Course', 'Full Stack Engineering'],
                  ['Skill Assessment', 'Technical Readiness Benchmark'],
                  ['Internship', 'Industry Engineering Cohort'],
                  ['Training', 'Cloud & Security Intensive'],
                ] as const
              ).map(([cat, title]) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => handleIssueCredential(cat, title)}
                  className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-[#F4F7FB] dark:bg-[#05070B] border border-slate-200 dark:border-[#1E3A5F]/70 text-[#0B2545] dark:text-amber-300 hover:border-[#0B2545] dark:hover:border-amber-400"
                >
                  + Issue {cat}
                </button>
              ))}
            </div>
          </div>

          {profile.certifications.length === 0 ? (
            <div className="rounded-xl bg-[#F4F7FB] dark:bg-[#05070B] p-6 text-center text-xs text-slate-500 dark:text-slate-400">
              No certificates yet. Complete a course lesson, pass a Skill Analysis quiz, or click an issue button above to mint a QR-verified credential.
            </div>
          ) : (
            <div className="space-y-2.5">
              {profile.certifications.map((cert) => {
                const cId = buildCertificateVerificationId(cert, profile.name);
                const isSelected = activeCert?.id === cert.id;
                return (
                  <button
                    key={cert.id}
                    type="button"
                    onClick={() => setSelectedCert(cert)}
                    className={`w-full text-left rounded-xl border p-3.5 flex items-center justify-between gap-3 transition-colors ${
                      isSelected
                        ? 'border-[#0B2545] dark:border-amber-400 bg-[#F4F7FB] dark:bg-[#0F213E]'
                        : 'border-slate-200 dark:border-[#1E3A5F]/60 bg-white dark:bg-[#05070B]'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <IssuerLogo issuerName={cert.issuer} issuerLogoId={cert.issuerLogoId} size="md" />
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-[#0B2545] dark:text-white truncate">{cert.title}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                          {cert.issuer} · {cert.year} · ID: <span className="font-mono">{cId}</span>
                          {cert.expiryDate ? ` · Expires ${cert.expiryDate}` : ''}
                        </p>
                      </div>
                    </div>
                    <QrCode className="w-4 h-4 text-emerald-600 dark:text-amber-400 shrink-0" />
                  </button>
                );
              })}
            </div>
          )}

          {/* Online Certificate Verification Form */}
          <form onSubmit={handleVerifyLookup} className="border-t border-slate-200 dark:border-white/10 pt-4 space-y-2">
            <label
              htmlFor="cert-verify-lookup"
              className="block text-xs font-semibold text-[#0B2545] dark:text-white"
            >
              Online Certificate Verification Registry
            </label>
            <div className="flex gap-2">
              <input
                id="cert-verify-lookup"
                type="text"
                value={verifyInput}
                onChange={(e) => setVerifyInput(e.target.value)}
                placeholder="Enter Certificate ID (e.g. VG-CERT-PY-2026)"
                className="flex-1 rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] px-3 py-2 text-xs font-mono text-slate-900 dark:text-white"
              />
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-[#0B2545] text-white dark:bg-[#1D4ED8] whitespace-nowrap"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Verify ID</span>
              </button>
            </div>
            {verifyResult && (
              <p
                className={`text-xs font-medium ${
                  verifyResult.verified
                    ? 'text-emerald-700 dark:text-emerald-300'
                    : 'text-amber-700 dark:text-amber-400'
                }`}
              >
                {verifyResult.message}
              </p>
            )}
          </form>
        </section>

        {/* Printable QR Certificate Preview Card */}
        <section className="lg:col-span-5 rounded-2xl border border-[#0B2545]/30 dark:border-amber-400/40 bg-[#F4F7FB] dark:bg-[#05070B] p-6 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-emerald-700 dark:text-amber-400">
              Official Digital Skill Passport Certificate
            </span>
            <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
              {activeCertId}
            </span>
          </div>

          <div className="rounded-xl bg-white dark:bg-[#0A1628] border border-slate-200 dark:border-[#1E3A5F]/70 p-5 space-y-3">
            <p className="text-[11px] font-semibold tracking-wider uppercase text-emerald-700 dark:text-amber-400">
              Vora Generation Network · Verified Credential
            </p>
            <h3 className="font-display text-lg font-bold text-[#0B2545] dark:text-white">
              {activeCert?.title || 'VoraGen Career Readiness Benchmark'}
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Awarded to <strong>{profile.name || 'Verified Learner'}</strong> · Issued by{' '}
              {activeCert?.issuer || 'Vora Generation Network'} ({activeCert?.year || '2026'})
            </p>

            <div className="flex items-center justify-between gap-4 pt-2 border-t border-slate-200 dark:border-white/10">
              <div className="text-[11px] text-slate-500 dark:text-slate-400 space-y-1">
                <p>Readiness Score: <strong className="font-mono tabular-nums text-[#0B2545] dark:text-white">{readinessPct}%</strong></p>
                <p>Verified Skills: <strong className="font-mono tabular-nums">{profile.skills.filter((s) => s.verified).length}</strong></p>
                <p>Scan QR or verify online with ID above.</p>
              </div>

              <svg
                width="76"
                height="76"
                viewBox="0 0 15 15"
                role="img"
                aria-label={`QR verification code for ${activeCertId}`}
                className="bg-white p-1 rounded-md border border-slate-200 shrink-0"
              >
                {qrMatrix.map((row, rIdx) =>
                  row.map((filled, cIdx) =>
                    filled ? (
                      <rect
                        key={`${rIdx}-${cIdx}`}
                        x={cIdx}
                        y={rIdx}
                        width="1"
                        height="1"
                        fill="#0B2545"
                      />
                    ) : null,
                  ),
                )}
              </svg>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {activeCert && (
              <button
                type="button"
                onClick={() => handleDownloadCertificateHtml(activeCert)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-[#0B2545] text-white dark:bg-[#1D4ED8]"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Certificate</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border border-slate-300 dark:border-[#1E3A5F]/70 text-[#0B2545] dark:text-white"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print PDF</span>
            </button>
            {linkedinShareUrl && (
              <a
                href={linkedinShareUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border border-emerald-500/50 text-emerald-700 dark:text-emerald-300"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Share to LinkedIn</span>
              </a>
            )}
            <button
              type="button"
              onClick={() => setShareStatus(`Passport verification link copied for ID ${activeCertId}.`)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border border-amber-500/45 text-amber-800 dark:text-amber-300"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share Passport</span>
            </button>
          </div>
          {shareStatus && (
            <p className="text-xs font-medium text-emerald-700 dark:text-amber-300">{shareStatus}</p>
          )}
        </section>
      </div>

      {/* Achievement Badges & Milestones */}
      <section className="rounded-2xl border border-slate-200 dark:border-[#1E3A5F]/60 bg-white dark:bg-[#0A1628] p-6 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            <h2 className="font-display text-lg font-bold text-[#0B2545] dark:text-white">
              Digital Achievement Badges & Learning Milestones ({earnedBadges.length}/{ACHIEVEMENT_BADGES_CATALOG.length})
            </h2>
          </div>
          <span className="font-mono text-xs tabular-nums text-emerald-700 dark:text-amber-400">
            Total XP Earned: {profile.streakPoints} pts
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {ACHIEVEMENT_BADGES_CATALOG.map((badge) => {
            const unlocked = earnedBadgeIds.has(badge.id);
            return (
              <div
                key={badge.id}
                className={`rounded-xl border p-4 space-y-1.5 ${
                  unlocked
                    ? 'border-emerald-500/45 bg-emerald-50/50 dark:bg-emerald-500/10'
                    : 'border-slate-200 dark:border-[#1E3A5F]/60 bg-[#F4F7FB] dark:bg-[#05070B] opacity-75'
                }`}
              >
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-semibold text-emerald-700 dark:text-amber-400">
                    {badge.category} Badge
                  </span>
                  <span className="font-mono tabular-nums">+{badge.xpReward} XP</span>
                </div>
                <h3 className="text-sm font-bold text-[#0B2545] dark:text-white flex items-center gap-1.5">
                  {unlocked ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  ) : (
                    <ShieldCheck className="w-4 h-4 text-slate-400 shrink-0" />
                  )}
                  <span>{badge.title}</span>
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300">{badge.criteria}</p>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
