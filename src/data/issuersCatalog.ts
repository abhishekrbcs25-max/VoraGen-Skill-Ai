export interface CertIssuerInfo {
  id: string;
  name: string;
  shortName: string;
  category: 'Cloud & Hyperscaler' | 'AI & Data' | 'Developer & Security' | 'University & MOOC';
  verifyBaseUrl: string;
  primaryColor: string;
  accentColor: string;
  keywords: string[];
}

export const CERT_ISSUERS_CATALOG: CertIssuerInfo[] = [
  {
    id: 'google',
    name: 'Google / Google Cloud',
    shortName: 'Google',
    category: 'Cloud & Hyperscaler',
    verifyBaseUrl: 'https://www.credential.net/',
    primaryColor: '#4285F4',
    accentColor: '#34A853',
    keywords: ['google', 'gcp', 'cloud', 'android', 'tensorflow', 'coursera google'],
  },
  {
    id: 'aws',
    name: 'Amazon Web Services (AWS)',
    shortName: 'AWS',
    category: 'Cloud & Hyperscaler',
    verifyBaseUrl: 'https://aws.amazon.com/verification',
    primaryColor: '#FF9900',
    accentColor: '#232F3E',
    keywords: ['aws', 'amazon', 'solutions architect', 'cloud practitioner', 'devops'],
  },
  {
    id: 'microsoft',
    name: 'Microsoft',
    shortName: 'Microsoft',
    category: 'Cloud & Hyperscaler',
    verifyBaseUrl: 'https://learn.microsoft.com/en-us/users/',
    primaryColor: '#00A4EF',
    accentColor: '#7FBA00',
    keywords: ['microsoft', 'azure', 'power bi', 'dotnet', 'github'],
  },
  {
    id: 'meta',
    name: 'Meta',
    shortName: 'Meta',
    category: 'Developer & Security',
    verifyBaseUrl: 'https://www.coursera.org/verify/',
    primaryColor: '#0866FF',
    accentColor: '#00C2FF',
    keywords: ['meta', 'facebook', 'react', 'frontend', 'backend'],
  },
  {
    id: 'ibm',
    name: 'IBM',
    shortName: 'IBM',
    category: 'AI & Data',
    verifyBaseUrl: 'https://www.credly.com/org/ibm',
    primaryColor: '#0F62FE',
    accentColor: '#161616',
    keywords: ['ibm', 'data science', 'watson', 'ai engineering'],
  },
  {
    id: 'nvidia',
    name: 'NVIDIA Deep Learning Institute',
    shortName: 'NVIDIA',
    category: 'AI & Data',
    verifyBaseUrl: 'https://courses.nvidia.com/certificates/',
    primaryColor: '#76B900',
    accentColor: '#1A1A1A',
    keywords: ['nvidia', 'cuda', 'gpu', 'deep learning', 'dli'],
  },
  {
    id: 'oracle',
    name: 'Oracle University',
    shortName: 'Oracle',
    category: 'Cloud & Hyperscaler',
    verifyBaseUrl: 'https://education.oracle.com/',
    primaryColor: '#F80000',
    accentColor: '#312D2A',
    keywords: ['oracle', 'java', 'oci', 'database', 'sql'],
  },
  {
    id: 'cisco',
    name: 'Cisco Networking Academy',
    shortName: 'Cisco',
    category: 'Developer & Security',
    verifyBaseUrl: 'https://www.credly.com/org/cisco',
    primaryColor: '#049FD9',
    accentColor: '#005073',
    keywords: ['cisco', 'ccna', 'ccnp', 'networking', 'cyberops'],
  },
  {
    id: 'cncf',
    name: 'CNCF / Linux Foundation',
    shortName: 'CNCF',
    category: 'Cloud & Hyperscaler',
    verifyBaseUrl: 'https://training.linuxfoundation.org/certification/verify/',
    primaryColor: '#326CE5',
    accentColor: '#0B2545',
    keywords: ['cncf', 'kubernetes', 'cka', 'ckad', 'linux foundation'],
  },
  {
    id: 'comptia',
    name: 'CompTIA',
    shortName: 'CompTIA',
    category: 'Developer & Security',
    verifyBaseUrl: 'https://www.certmetrics.com/comptia/public/verification.aspx',
    primaryColor: '#C8202F',
    accentColor: '#1E293B',
    keywords: ['comptia', 'security+', 'network+', 'a+', 'cysa+'],
  },
  {
    id: 'redhat',
    name: 'Red Hat',
    shortName: 'Red Hat',
    category: 'Developer & Security',
    verifyBaseUrl: 'https://rhtapps.redhat.com/verify',
    primaryColor: '#EE0000',
    accentColor: '#151515',
    keywords: ['red hat', 'rhcsa', 'rhce', 'openshift', 'linux'],
  },
  {
    id: 'databricks',
    name: 'Databricks',
    shortName: 'Databricks',
    category: 'AI & Data',
    verifyBaseUrl: 'https://credentials.databricks.com/',
    primaryColor: '#FF3621',
    accentColor: '#1B3139',
    keywords: ['databricks', 'spark', 'lakehouse', 'data engineer'],
  },
  {
    id: 'snowflake',
    name: 'Snowflake',
    shortName: 'Snowflake',
    category: 'AI & Data',
    verifyBaseUrl: 'https://achieve.snowflake.com/',
    primaryColor: '#29B5E8',
    accentColor: '#11567F',
    keywords: ['snowflake', 'snowpro', 'data cloud', 'warehouse'],
  },
  {
    id: 'mongodb',
    name: 'MongoDB University',
    shortName: 'MongoDB',
    category: 'Developer & Security',
    verifyBaseUrl: 'https://learn.mongodb.com/',
    primaryColor: '#00ED64',
    accentColor: '#001E2B',
    keywords: ['mongodb', 'nosql', 'atlas', 'database'],
  },
  {
    id: 'github',
    name: 'GitHub',
    shortName: 'GitHub',
    category: 'Developer & Security',
    verifyBaseUrl: 'https://examregistration.github.com/',
    primaryColor: '#24292F',
    accentColor: '#57606A',
    keywords: ['github', 'actions', 'copilot', 'git', 'foundations'],
  },
  {
    id: 'salesforce',
    name: 'Salesforce Trailhead',
    shortName: 'Salesforce',
    category: 'Cloud & Hyperscaler',
    verifyBaseUrl: 'https://trailhead.salesforce.com/credentials/verification',
    primaryColor: '#00A1E0',
    accentColor: '#032D60',
    keywords: ['salesforce', 'trailhead', 'crm', 'apex'],
  },
  {
    id: 'deeplearningai',
    name: 'DeepLearning.AI',
    shortName: 'DeepLearning.AI',
    category: 'AI & Data',
    verifyBaseUrl: 'https://www.coursera.org/verify/',
    primaryColor: '#FF6B6B',
    accentColor: '#1A202C',
    keywords: ['deeplearning', 'andrew ng', 'llm', 'machine learning', 'ai'],
  },
  {
    id: 'coursera',
    name: 'Coursera',
    shortName: 'Coursera',
    category: 'University & MOOC',
    verifyBaseUrl: 'https://www.coursera.org/verify/',
    primaryColor: '#0056D2',
    accentColor: '#0F172A',
    keywords: ['coursera', 'mooc', 'specialization', 'certificate'],
  },
  {
    id: 'edx',
    name: 'edX / HarvardX / MITx',
    shortName: 'edX',
    category: 'University & MOOC',
    verifyBaseUrl: 'https://courses.edx.org/certificates/',
    primaryColor: '#D23228',
    accentColor: '#00262B',
    keywords: ['edx', 'harvard', 'mit', 'cs50', 'university'],
  },
  {
    id: 'stanford',
    name: 'Stanford Online',
    shortName: 'Stanford',
    category: 'University & MOOC',
    verifyBaseUrl: 'https://online.stanford.edu/',
    primaryColor: '#8C1515',
    accentColor: '#2E2D29',
    keywords: ['stanford', 'machine learning', 'cs229', 'university'],
  },
  {
    id: 'mitxpro',
    name: 'MIT xPRO',
    shortName: 'MIT xPRO',
    category: 'University & MOOC',
    verifyBaseUrl: 'https://xpro.mit.edu/',
    primaryColor: '#A31F34',
    accentColor: '#1F2937',
    keywords: ['mit', 'xpro', 'architecture', 'quantum', 'systems'],
  },
  {
    id: 'hackerrank',
    name: 'HackerRank',
    shortName: 'HackerRank',
    category: 'Developer & Security',
    verifyBaseUrl: 'https://www.hackerrank.com/certificates/',
    primaryColor: '#00EA64',
    accentColor: '#0E141E',
    keywords: ['hackerrank', 'algorithms', 'sql', 'python', 'problem solving'],
  },
  {
    id: 'freecodecamp',
    name: 'freeCodeCamp',
    shortName: 'freeCodeCamp',
    category: 'University & MOOC',
    verifyBaseUrl: 'https://www.freecodecamp.org/certification/',
    primaryColor: '#0A0A23',
    accentColor: '#3B3B4F',
    keywords: ['freecodecamp', 'responsive', 'javascript', 'fullstack'],
  },
  {
    id: 'udemy',
    name: 'Udemy',
    shortName: 'Udemy',
    category: 'University & MOOC',
    verifyBaseUrl: 'https://www.udemy.com/certificate/',
    primaryColor: '#A435F0',
    accentColor: '#1C1D1F',
    keywords: ['udemy', 'bootcamp', 'course'],
  },
];

export function findIssuerByNameOrId(issuerName?: string, issuerLogoId?: string): CertIssuerInfo | null {
  if (issuerLogoId) {
    const byId = CERT_ISSUERS_CATALOG.find((i) => i.id === issuerLogoId);
    if (byId) return byId;
  }
  const q = (issuerName || '').trim().toLowerCase();
  if (!q) return null;
  const exact = CERT_ISSUERS_CATALOG.find(
    (i) => i.name.toLowerCase() === q || i.shortName.toLowerCase() === q,
  );
  if (exact) return exact;
  return (
    CERT_ISSUERS_CATALOG.find(
      (i) =>
        q.includes(i.shortName.toLowerCase()) ||
        i.name.toLowerCase().includes(q) ||
        i.keywords.some((k) => q.includes(k)),
    ) ?? null
  );
}

export function searchIssuers(query: string): CertIssuerInfo[] {
  const q = query.trim().toLowerCase();
  if (!q) return CERT_ISSUERS_CATALOG;
  return CERT_ISSUERS_CATALOG.filter(
    (item) =>
      item.name.toLowerCase().includes(q) ||
      item.shortName.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q) ||
      item.keywords.some((kw) => kw.includes(q)),
  );
}
