import { findIssuerByNameOrId } from '../data/issuersCatalog';

interface IssuerLogoProps {
  issuerName?: string;
  issuerLogoId?: string;
  size?: 'sm' | 'md' | 'lg';
}

const SIZE_CLASSES: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'w-6 h-6',
  md: 'w-8 h-8',
  lg: 'w-10 h-10',
};

function renderBrandSvg(id: string, monogram: string) {
  switch (id) {
    case 'google':
      return (
        <svg viewBox="0 0 24 24" className="w-4/5 h-4/5" aria-hidden="true">
          <path fill="#4285F4" d="M21.8 12.2c0-.7-.1-1.4-.2-2H12v3.9h5.5c-.2 1.2-.9 2.3-2 3v2.5h3.2c1.9-1.7 3.1-4.3 3.1-7.4z" />
          <path fill="#34A853" d="M12 22c2.7 0 5-.9 6.7-2.4l-3.2-2.5c-.9.6-2.1 1-3.5 1-2.7 0-5-1.8-5.8-4.3H2.9v2.6C4.6 19.8 8.1 22 12 22z" />
          <path fill="#FBBC05" d="M6.2 13.8c-.2-.6-.3-1.2-.3-1.8s.1-1.2.3-1.8V7.6H2.9C2.3 8.9 2 10.4 2 12s.3 3.1.9 4.4l3.3-2.6z" />
          <path fill="#EA4335" d="M12 5.9c1.5 0 2.8.5 3.8 1.5l2.8-2.8C16.9 2.9 14.7 2 12 2 8.1 2 4.6 4.2 2.9 7.6l3.3 2.6C7 7.7 9.3 5.9 12 5.9z" />
        </svg>
      );
    case 'aws':
      return (
        <svg viewBox="0 0 24 24" className="w-4/5 h-4/5" aria-hidden="true">
          <text x="12" y="12" textAnchor="middle" fill="#FFFFFF" fontSize="8" fontWeight="900" fontFamily="sans-serif">AWS</text>
          <path d="M5 15.5c4.2 3.2 9.8 3.2 14 0" fill="none" stroke="#FF9900" strokeWidth="2.1" strokeLinecap="round" />
          <path d="M17.2 14.4l2.2 1.1-1.1 2.2" fill="none" stroke="#FF9900" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'microsoft':
      return (
        <svg viewBox="0 0 24 24" className="w-4/5 h-4/5" aria-hidden="true">
          <rect x="3" y="3" width="8.2" height="8.2" fill="#F25022" />
          <rect x="12.8" y="3" width="8.2" height="8.2" fill="#7FBA00" />
          <rect x="3" y="12.8" width="8.2" height="8.2" fill="#00A4EF" />
          <rect x="12.8" y="12.8" width="8.2" height="8.2" fill="#FFB900" />
        </svg>
      );
    case 'meta':
      return (
        <svg viewBox="0 0 24 24" className="w-4/5 h-4/5" aria-hidden="true">
          <path
            d="M4.2 15.6c0-4.1 2.2-7.2 4.3-7.2 1.8 0 2.9 1.9 3.5 3.2.6-1.3 1.7-3.2 3.5-3.2 2.1 0 4.3 3.1 4.3 7.2 0 1.8-.9 2.8-2.2 2.8-1.4 0-2.5-1.2-3.9-3.5l-1.7-2.8-1.7 2.8c-1.4 2.3-2.5 3.5-3.9 3.5-1.3 0-2.2-1-2.2-2.8z"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'ibm':
      return (
        <svg viewBox="0 0 24 24" className="w-4/5 h-4/5" aria-hidden="true">
          <text x="12" y="14.5" textAnchor="middle" fill="#FFFFFF" fontSize="8.5" fontWeight="900" letterSpacing="1" fontFamily="monospace">IBM</text>
          <line x1="3" y1="8.5" x2="21" y2="8.5" stroke="#0F62FE" strokeWidth="0.9" />
          <line x1="3" y1="11.5" x2="21" y2="11.5" stroke="#0F62FE" strokeWidth="0.9" />
          <line x1="3" y1="14.5" x2="21" y2="14.5" stroke="#0F62FE" strokeWidth="0.9" />
        </svg>
      );
    case 'nvidia':
      return (
        <svg viewBox="0 0 24 24" className="w-4/5 h-4/5" aria-hidden="true">
          <path d="M4 12c2.5-4 6.5-5.5 10.5-4.5 2.8.7 4.7 2.4 5.5 4.5-1.4 3.1-4.8 5-8.5 5-3.1 0-5.4-1.7-6.3-3.5 1.1-1.9 3.6-3.1 6.3-2.7 2 .3 3.4 1.5 3.8 2.8" fill="none" stroke="#FFFFFF" strokeWidth="2.1" strokeLinecap="round" />
        </svg>
      );
    case 'oracle':
      return (
        <svg viewBox="0 0 24 24" className="w-4/5 h-4/5" aria-hidden="true">
          <rect x="3" y="8" width="18" height="8" rx="4" fill="none" stroke="#FFFFFF" strokeWidth="2.4" />
        </svg>
      );
    case 'cisco':
      return (
        <svg viewBox="0 0 24 24" className="w-4/5 h-4/5" aria-hidden="true">
          <line x1="4" y1="10" x2="4" y2="15" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
          <line x1="8" y1="7" x2="8" y2="15" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
          <line x1="12" y1="5" x2="12" y2="17" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
          <line x1="16" y1="7" x2="16" y2="15" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
          <line x1="20" y1="10" x2="20" y2="15" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case 'cncf':
      return (
        <svg viewBox="0 0 24 24" className="w-4/5 h-4/5" aria-hidden="true">
          <polygon points="12,3 20,8 20,16 12,21 4,16 4,8" fill="none" stroke="#FFFFFF" strokeWidth="1.9" />
          <circle cx="12" cy="12" r="3.2" fill="none" stroke="#FFFFFF" strokeWidth="1.8" />
          <line x1="12" y1="3" x2="12" y2="8.8" stroke="#FFFFFF" strokeWidth="1.5" />
          <line x1="12" y1="15.2" x2="12" y2="21" stroke="#FFFFFF" strokeWidth="1.5" />
        </svg>
      );
    case 'mongodb':
      return (
        <svg viewBox="0 0 24 24" className="w-4/5 h-4/5" aria-hidden="true">
          <path d="M12 3c2.8 3.2 4.2 6.8 4.2 9.8 0 3.1-1.9 5.5-4.2 6.8-2.3-1.3-4.2-3.7-4.2-6.8C7.8 9.8 9.2 6.2 12 3z" fill="#00ED64" />
          <line x1="12" y1="10" x2="12" y2="21" stroke="#001E2B" strokeWidth="1.4" />
        </svg>
      );
    case 'github':
      return (
        <svg viewBox="0 0 24 24" className="w-4/5 h-4/5" aria-hidden="true">
          <path
            fill="#FFFFFF"
            d="M12 2.5a9.5 9.5 0 0 0-3 18.5c.5.1.7-.2.7-.5v-1.7c-2.7.6-3.3-1.2-3.3-1.2-.4-1.1-1.1-1.4-1.1-1.4-.9-.6.1-.6.1-.6 1 .1 1.5 1 1.5 1 .9 1.5 2.4 1.1 3 .8.1-.6.3-1.1.6-1.3-2.2-.2-4.5-1.1-4.5-4.8 0-1.1.4-2 1-2.7-.1-.2-.4-1.2.1-2.6 0 0 .8-.3 2.7 1a9.2 9.2 0 0 1 5 0c1.9-1.3 2.7-1 2.7-1 .5 1.4.2 2.4.1 2.6.6.7 1 1.6 1 2.7 0 3.7-2.3 4.6-4.5 4.8.4.3.7.9.7 1.9v2.8c0 .3.2.6.7.5A9.5 9.5 0 0 0 12 2.5z"
          />
        </svg>
      );
    case 'snowflake':
      return (
        <svg viewBox="0 0 24 24" className="w-4/5 h-4/5" aria-hidden="true">
          <line x1="12" y1="3" x2="12" y2="21" stroke="#FFFFFF" strokeWidth="1.9" strokeLinecap="round" />
          <line x1="4.2" y1="7.5" x2="19.8" y2="16.5" stroke="#FFFFFF" strokeWidth="1.9" strokeLinecap="round" />
          <line x1="19.8" y1="7.5" x2="4.2" y2="16.5" stroke="#FFFFFF" strokeWidth="1.9" strokeLinecap="round" />
          <circle cx="12" cy="12" r="2.2" fill="#29B5E8" stroke="#FFFFFF" strokeWidth="1.5" />
        </svg>
      );
    case 'databricks':
      return (
        <svg viewBox="0 0 24 24" className="w-4/5 h-4/5" aria-hidden="true">
          <polygon points="12,4 20,8 12,12 4,8" fill="none" stroke="#FFFFFF" strokeWidth="1.8" strokeLinejoin="round" />
          <polyline points="4,12 12,16 20,12" fill="none" stroke="#FFFFFF" strokeWidth="1.8" strokeLinejoin="round" />
          <polyline points="4,16 12,20 20,16" fill="none" stroke="#FFFFFF" strokeWidth="1.8" strokeLinejoin="round" />
        </svg>
      );
    case 'redhat':
      return (
        <svg viewBox="0 0 24 24" className="w-4/5 h-4/5" aria-hidden="true">
          <path d="M5 14c1-4 4-6 7-6s6 2 7 6" fill="#FFFFFF" opacity="0.92" />
          <ellipse cx="12" cy="15" rx="9" ry="2.6" fill="#FFFFFF" />
        </svg>
      );
    case 'salesforce':
      return (
        <svg viewBox="0 0 24 24" className="w-4/5 h-4/5" aria-hidden="true">
          <path d="M7.5 17.5h9.5a3.5 3.5 0 0 0 .4-6.98 4.8 4.8 0 0 0-9.1-1.2A3.8 3.8 0 0 0 7.5 17.5z" fill="#FFFFFF" />
        </svg>
      );
    case 'deeplearningai':
      return (
        <svg viewBox="0 0 24 24" className="w-4/5 h-4/5" aria-hidden="true">
          <circle cx="6" cy="7" r="2.2" fill="#FFFFFF" />
          <circle cx="6" cy="17" r="2.2" fill="#FFFFFF" />
          <circle cx="18" cy="12" r="2.5" fill="#F59E0B" />
          <line x1="8" y1="7.5" x2="16" y2="11.5" stroke="#FFFFFF" strokeWidth="1.6" />
          <line x1="8" y1="16.5" x2="16" y2="12.5" stroke="#FFFFFF" strokeWidth="1.6" />
        </svg>
      );
    case 'coursera':
      return (
        <svg viewBox="0 0 24 24" className="w-4/5 h-4/5" aria-hidden="true">
          <path d="M16.5 8.5A6 6 0 1 0 16.5 15.5" fill="none" stroke="#FFFFFF" strokeWidth="3.2" strokeLinecap="round" />
        </svg>
      );
    case 'hackerrank':
      return (
        <svg viewBox="0 0 24 24" className="w-4/5 h-4/5" aria-hidden="true">
          <text x="12" y="15.5" textAnchor="middle" fill="#FFFFFF" fontSize="11" fontWeight="900" fontFamily="monospace">H</text>
          <rect x="16" y="13" width="3" height="3" fill="#00EA64" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" className="w-4/5 h-4/5" aria-hidden="true">
          <text
            x="12"
            y="15.5"
            textAnchor="middle"
            fill="#FFFFFF"
            fontSize="9.5"
            fontWeight="800"
            fontFamily="sans-serif"
          >
            {monogram.slice(0, 3)}
          </text>
        </svg>
      );
  }
}

export function IssuerLogo({ issuerName, issuerLogoId, size = 'md' }: IssuerLogoProps) {
  const matched = findIssuerByNameOrId(issuerName, issuerLogoId);
  const bg = matched?.accentColor || matched?.primaryColor || '#0B2545';
  const ring = matched?.primaryColor || '#D97706';
  const monogram =
    (matched?.shortName || issuerName || 'VG')
      .trim()
      .split(/\s+/)
      .map((w) => w[0]?.toUpperCase() || '')
      .join('')
      .slice(0, 3) || 'VG';

  return (
    <span
      className={`${SIZE_CLASSES[size]} inline-flex items-center justify-center rounded-lg border shadow-xs shrink-0 overflow-hidden`}
      style={{ backgroundColor: bg, borderColor: `${ring}55` }}
      title={matched?.name || issuerName || 'Credential Issuer'}
      aria-hidden="true"
    >
      {renderBrandSvg(matched?.id || 'custom', monogram)}
    </span>
  );
}
