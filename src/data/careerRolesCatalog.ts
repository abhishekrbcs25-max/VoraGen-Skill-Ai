import type { CareerRole, RoleSkillRequirement } from '../types';

interface DomainTemplate {
  domain: string;
  salaryRange: string;
  demandGrowth: string;
  baseSkills: RoleSkillRequirement[];
  titles: string[];
}

const DOMAIN_TEMPLATES: DomainTemplate[] = [
  {
    domain: 'Web & Cloud Engineering',
    salaryRange: '$95,000 – $175,000',
    demandGrowth: '+25% YoY Demand',
    baseSkills: [
      { name: 'JavaScript', targetLevel: 85, weight: 5, category: 'Frontend' },
      { name: 'TypeScript', targetLevel: 82, weight: 4, category: 'Frontend' },
      { name: 'React', targetLevel: 82, weight: 5, category: 'Frontend' },
      { name: 'Node.js', targetLevel: 78, weight: 4, category: 'Backend' },
      { name: 'SQL', targetLevel: 75, weight: 3, category: 'Backend' },
      { name: 'HTML/CSS', targetLevel: 75, weight: 3, category: 'Frontend' },
    ],
    titles: [
      'Frontend Engineer (React & Design Systems)',
      'Backend API Architect (Node.js & PostgreSQL)',
      'Next.js & Edge Web Developer',
      'Staff UI Performance Engineer',
      'GraphQL Federation Architect',
      'Web Accessibility (WCAG) Specialist',
      'Micro-Frontend Platform Engineer',
      'Real-Time WebSocket Applications Engineer',
      'E-Commerce Storefront Engineer',
      'SaaS Multi-Tenant Full Stack Engineer',
      'Serverless Web Developer',
      'Developer Portal & Docs Engineer',
      'Progressive Web App (PWA) Architect',
      'Browser Extension & SDK Engineer',
      'Canvas & WebGL Visualization Developer',
      'Design Technologist (HTML/CSS/React)',
      'CMS & Headless Commerce Architect',
    ],
  },
  {
    domain: 'Artificial Intelligence & ML',
    salaryRange: '$130,000 – $225,000',
    demandGrowth: '+44% YoY Demand',
    baseSkills: [
      { name: 'Python', targetLevel: 90, weight: 5, category: 'Data & AI' },
      { name: 'Machine Learning', targetLevel: 86, weight: 5, category: 'Data & AI' },
      { name: 'PyTorch', targetLevel: 82, weight: 4, category: 'Data & AI' },
      { name: 'LLM & Agent Systems', targetLevel: 85, weight: 5, category: 'Data & AI' },
      { name: 'SQL', targetLevel: 74, weight: 3, category: 'Backend' },
    ],
    titles: [
      'Generative AI & Prompt Systems Engineer',
      'LLM Fine-Tuning & RLHF Specialist',
      'RAG & Vector Search Architect',
      'Computer Vision Engineer',
      'Natural Language Processing (NLP) Scientist',
      'MLOps & Model Serving Engineer',
      'Applied Deep Learning Researcher',
      'Speech & Multimodal AI Engineer',
      'Recommendation Systems Engineer',
      'AI Evaluation & Safety Alignment Engineer',
      'Edge AI & Quantized Inference Engineer',
      'Autonomous Agent Orchestration Architect',
      'AI Search & Ranking Engineer',
      'Conversational AI Platform Lead',
      'Document Intelligence & OCR Specialist',
      'Synthetic Data Generation Engineer',
      'Fraud & Anomaly Detection ML Engineer',
    ],
  },
  {
    domain: 'Infrastructure, DevOps & SRE',
    salaryRange: '$118,000 – $195,000',
    demandGrowth: '+32% YoY Demand',
    baseSkills: [
      { name: 'Linux & Networking', targetLevel: 86, weight: 5, category: 'Cloud & DevOps' },
      { name: 'Docker & Kubernetes', targetLevel: 86, weight: 5, category: 'Cloud & DevOps' },
      { name: 'Git & CI/CD', targetLevel: 84, weight: 4, category: 'Cloud & DevOps' },
      { name: 'Python', targetLevel: 74, weight: 3, category: 'Backend' },
      { name: 'Cloud Security', targetLevel: 78, weight: 3, category: 'Security' },
    ],
    titles: [
      'Site Reliability Engineer (SRE)',
      'Kubernetes Platform Administrator',
      'AWS Solutions Architect',
      'Google Cloud (GCP) Infrastructure Engineer',
      'Microsoft Azure Cloud Architect',
      'Terraform & Infrastructure-as-Code Lead',
      'CI/CD Release Automation Engineer',
      'Observability & OpenTelemetry Engineer',
      'Distributed Systems Reliability Architect',
      'FinOps & Cloud Cost Optimization Specialist',
      'Multi-Cloud Networking Engineer',
      'Chaos Engineering & Resilience Specialist',
      'Internal Developer Platform (IDP) Engineer',
      'Linux Kernel & Systems Administrator',
      'Container Runtime & Service Mesh Engineer',
      'Disaster Recovery & High Availability Architect',
    ],
  },
  {
    domain: 'Data Science & Analytics',
    salaryRange: '$105,000 – $178,000',
    demandGrowth: '+29% YoY Demand',
    baseSkills: [
      { name: 'SQL', targetLevel: 90, weight: 5, category: 'Backend' },
      { name: 'Python', targetLevel: 85, weight: 5, category: 'Data & AI' },
      { name: 'Machine Learning', targetLevel: 78, weight: 4, category: 'Data & AI' },
      { name: 'TypeScript', targetLevel: 65, weight: 2, category: 'Frontend' },
    ],
    titles: [
      'Data Engineer (ETL & Spark/dbt)',
      'Analytics Engineer (dbt & Snowflake)',
      'Business Intelligence (BI) Architect',
      'Product Data Scientist (Experimentation)',
      'Streaming Data & Kafka Pipeline Engineer',
      'Data Warehouse & Lakehouse Architect',
      'Marketing Mix & Attribution Analyst',
      'Pricing & Revenue Optimization Scientist',
      'Supply Chain & Demand Forecasting Analyst',
      'Geospatial Data Scientist',
      'Data Governance & Quality Lead',
      'Real-Time Telemetry & Clickstream Analyst',
      'People & Workforce Analytics Specialist',
      'Customer Retention & Churn Scientist',
      'Decision Intelligence Engineer',
      'Database Reliability Engineer (PostgreSQL)',
    ],
  },
  {
    domain: 'Cybersecurity & Risk',
    salaryRange: '$112,000 – $192,000',
    demandGrowth: '+36% YoY Demand',
    baseSkills: [
      { name: 'OWASP & AppSec', targetLevel: 86, weight: 5, category: 'Security' },
      { name: 'Cloud Security', targetLevel: 86, weight: 5, category: 'Security' },
      { name: 'Linux & Networking', targetLevel: 84, weight: 5, category: 'Cloud & DevOps' },
      { name: 'Python', targetLevel: 75, weight: 3, category: 'Backend' },
      { name: 'SQL', targetLevel: 70, weight: 2, category: 'Backend' },
    ],
    titles: [
      'Application Security (AppSec) Architect',
      'Cloud Security Posture Engineer',
      'Penetration Tester & Red Team Operator',
      'SOC Incident Response Lead',
      'Identity & Access Management (IAM) Architect',
      'Zero-Trust Network Security Engineer',
      'DevSecOps Pipeline Specialist',
      'Threat Intelligence & Hunting Analyst',
      'Vulnerability Management Engineer',
      'AI Security & Red-Teaming Specialist',
      'Cryptography & PKI Infrastructure Engineer',
      'Kubernetes & Container Security Engineer',
      'API Security & OAuth2 Architect',
      'Compliance & ISO 27001/SOC2 Auditor',
      'Digital Forensics & Malware Analyst',
      'Product Privacy & Data Protection Engineer',
    ],
  },
  {
    domain: 'Mobile & Cross-Platform',
    salaryRange: '$102,000 – $172,000',
    demandGrowth: '+22% YoY Demand',
    baseSkills: [
      { name: 'TypeScript', targetLevel: 84, weight: 5, category: 'Frontend' },
      { name: 'JavaScript', targetLevel: 84, weight: 4, category: 'Frontend' },
      { name: 'React', targetLevel: 82, weight: 5, category: 'Frontend' },
      { name: 'Node.js', targetLevel: 72, weight: 3, category: 'Backend' },
      { name: 'SQL', targetLevel: 70, weight: 2, category: 'Backend' },
    ],
    titles: [
      'iOS Engineer (Swift & SwiftUI)',
      'Android Engineer (Kotlin & Jetpack Compose)',
      'React Native Mobile Architect',
      'Flutter Cross-Platform Developer',
      'Mobile Performance & Memory Specialist',
      'Mobile Security & Biometric Auth Engineer',
      'Offline-First Sync & SQLite Mobile Engineer',
      'Mobile CI/CD & Release Automation Lead',
      'Wearable & WatchOS Companion Developer',
      'AR/VR Spatial Mobile Developer',
      'Mobile Payments & Wallet SDK Engineer',
      'In-App Streaming & Media Player Engineer',
      'Automotive & CarPlay Interface Engineer',
      'Mobile Accessibility Specialist',
    ],
  },
  {
    domain: 'Systems, Embedded & IoT',
    salaryRange: '$115,000 – $188,000',
    demandGrowth: '+23% YoY Demand',
    baseSkills: [
      { name: 'Linux & Networking', targetLevel: 88, weight: 5, category: 'Cloud & DevOps' },
      { name: 'Python', targetLevel: 78, weight: 4, category: 'Backend' },
      { name: 'Git & CI/CD', targetLevel: 76, weight: 3, category: 'Cloud & DevOps' },
      { name: 'Cloud Security', targetLevel: 76, weight: 3, category: 'Security' },
      { name: 'SQL', targetLevel: 68, weight: 2, category: 'Backend' },
    ],
    titles: [
      'Embedded Firmware Engineer (C/C++/RTOS)',
      'Rust Systems Programming Engineer',
      'IoT Edge Connectivity & MQTT Architect',
      'Linux Device Driver Engineer',
      'High-Performance Compiler & LLVM Engineer',
      'Distributed Storage Engine Developer',
      'Virtualization & Hypervisor Engineer',
      'Real-Time Operating Systems (RTOS) Lead',
      'Smart Grid & Industrial Telemetry Engineer',
      'Network Protocol & eBPF Kernel Engineer',
      'Satellite & Aerospace Flight Software Engineer',
      'Audio DSP & Codec Systems Engineer',
      'Memory Allocator & Runtime Engine Developer',
      'Hardware-in-the-Loop Simulation Engineer',
    ],
  },
  {
    domain: 'QA, Testing & SDET',
    salaryRange: '$88,000 – $152,000',
    demandGrowth: '+20% YoY Demand',
    baseSkills: [
      { name: 'JavaScript', targetLevel: 80, weight: 4, category: 'Frontend' },
      { name: 'TypeScript', targetLevel: 78, weight: 4, category: 'Frontend' },
      { name: 'Python', targetLevel: 78, weight: 4, category: 'Backend' },
      { name: 'Git & CI/CD', targetLevel: 82, weight: 5, category: 'Cloud & DevOps' },
      { name: 'SQL', targetLevel: 75, weight: 3, category: 'Backend' },
    ],
    titles: [
      'Software Development Engineer in Test (SDET)',
      'Playwright & E2E Test Automation Architect',
      'Performance & Load Testing Engineer (k6/JMeter)',
      'API Contract & Integration Test Specialist',
      'AI Test Generation & Quality Strategist',
      'Mobile Device Farm Automation Engineer',
      'Accessibility QA & Screen-Reader Auditor',
      'Security Fuzzing & Static Analysis Engineer',
      'Release Quality Gate & Canary Verification Lead',
      'Chaos & Fault-Injection Test Engineer',
      'Embedded Hardware QA Validation Engineer',
      'Game Engine QA & Telemetry Analyst',
    ],
  },
  {
    domain: 'Product, UX & Design Engineering',
    salaryRange: '$98,000 – $172,000',
    demandGrowth: '+24% YoY Demand',
    baseSkills: [
      { name: 'HTML/CSS', targetLevel: 88, weight: 5, category: 'Frontend' },
      { name: 'React', targetLevel: 82, weight: 5, category: 'Frontend' },
      { name: 'TypeScript', targetLevel: 78, weight: 4, category: 'Frontend' },
      { name: 'JavaScript', targetLevel: 80, weight: 4, category: 'Frontend' },
      { name: 'SQL', targetLevel: 65, weight: 2, category: 'Backend' },
    ],
    titles: [
      'Technical Product Manager (AI & Platform)',
      'UX Engineer & Interactive Prototyper',
      'Design Systems Lead',
      'Growth Product Manager (Experimentation)',
      'Developer Experience (DevEx) Product Lead',
      'Product Operations & Telemetry Strategist',
      'Motion UI & Micro-Interaction Designer',
      'Information Architecture & Search UX Lead',
      'Enterprise Workflow UX Researcher',
      'Product Analytics & Funnel Optimization Lead',
      'B2B SaaS Onboarding & Activation PM',
      'Platform API Product Manager',
      'Conversation & Voice UI Designer',
      'Human-AI Interaction Designer',
    ],
  },
  {
    domain: 'FinTech, Quant & Trading',
    salaryRange: '$135,000 – $250,000',
    demandGrowth: '+27% YoY Demand',
    baseSkills: [
      { name: 'Python', targetLevel: 88, weight: 5, category: 'Data & AI' },
      { name: 'SQL', targetLevel: 86, weight: 5, category: 'Backend' },
      { name: 'Machine Learning', targetLevel: 82, weight: 4, category: 'Data & AI' },
      { name: 'OWASP & AppSec', targetLevel: 80, weight: 4, category: 'Security' },
      { name: 'Node.js', targetLevel: 74, weight: 3, category: 'Backend' },
    ],
    titles: [
      'Quantitative Software Engineer',
      'Algorithmic Trading Systems Developer',
      'Core Banking & Double-Entry Ledger Architect',
      'Payment Gateway & Clearing Systems Engineer',
      'Credit Risk & Underwriting ML Scientist',
      'Real-Time Fraud Scoring Platform Engineer',
      'Open Banking & ISO 20022 API Architect',
      'Low-Latency Market Data Feed Engineer',
      'Treasury & Liquidity Analytics Engineer',
      'RegTech & AML Compliance Automation Lead',
      'WealthTech Robo-Advisory Platform Engineer',
      'Insurance Actuarial Modeling Engineer',
      'Cross-Border FX Settlement Architect',
      'PCI-DSS Security & Tokenization Engineer',
    ],
  },
  {
    domain: 'Blockchain & Web3',
    salaryRange: '$120,000 – $210,000',
    demandGrowth: '+22% YoY Demand',
    baseSkills: [
      { name: 'TypeScript', targetLevel: 84, weight: 4, category: 'Frontend' },
      { name: 'Node.js', targetLevel: 80, weight: 4, category: 'Backend' },
      { name: 'OWASP & AppSec', targetLevel: 86, weight: 5, category: 'Security' },
      { name: 'React', targetLevel: 78, weight: 3, category: 'Frontend' },
      { name: 'Linux & Networking', targetLevel: 78, weight: 3, category: 'Cloud & DevOps' },
    ],
    titles: [
      'Smart Contract Security Auditor',
      'Solidity & EVM Protocol Engineer',
      'Zero-Knowledge (ZK) Cryptography Engineer',
      'Layer-2 Rollup & Consensus Engineer',
      'DeFi Protocol & Liquidity Engineer',
      'Blockchain Indexer & Subgraph Architect',
      'Wallet & MPC Custody Security Engineer',
      'Decentralized Identity (DID) Architect',
      'Web3 Full Stack dApp Engineer',
      'Cross-Chain Bridge & Oracle Security Lead',
      'Tokenomics & Mechanism Design Analyst',
      'Validator Node Infrastructure Operator',
    ],
  },
  {
    domain: 'Robotics, Autonomous & Edge',
    salaryRange: '$125,000 – $215,000',
    demandGrowth: '+33% YoY Demand',
    baseSkills: [
      { name: 'Python', targetLevel: 88, weight: 5, category: 'Data & AI' },
      { name: 'PyTorch', targetLevel: 84, weight: 5, category: 'Data & AI' },
      { name: 'Machine Learning', targetLevel: 84, weight: 4, category: 'Data & AI' },
      { name: 'Linux & Networking', targetLevel: 82, weight: 4, category: 'Cloud & DevOps' },
    ],
    titles: [
      'Robotics Software Engineer (ROS2)',
      'Autonomous Perception & LiDAR Fusion Engineer',
      'SLAM & Localization Systems Engineer',
      'Motion Planning & Control Engineer',
      'Drone Fleet Autonomy Architect',
      'Warehouse Automation & AGV Systems Engineer',
      'Sim-to-Real Digital Twin Engineer',
      'Computer Vision Quality Inspection Engineer',
      'Human-Robot Collaboration Safety Engineer',
      'Autonomous Marine & Rover Navigation Lead',
      'Mechatronics Simulation & Kinematics Developer',
      'Teleoperation & Low-Latency Video Engineer',
    ],
  },
  {
    domain: 'HealthTech, Bio & Scientific Computing',
    salaryRange: '$110,000 – $188,000',
    demandGrowth: '+30% YoY Demand',
    baseSkills: [
      { name: 'Python', targetLevel: 86, weight: 5, category: 'Data & AI' },
      { name: 'Machine Learning', targetLevel: 82, weight: 4, category: 'Data & AI' },
      { name: 'SQL', targetLevel: 80, weight: 4, category: 'Backend' },
      { name: 'Cloud Security', targetLevel: 80, weight: 4, category: 'Security' },
    ],
    titles: [
      'Bioinformatics & Genomic Pipeline Engineer',
      'Clinical AI & Medical Imaging Scientist',
      'HL7 FHIR & Healthcare Interoperability Engineer',
      'Computational Drug Discovery ML Engineer',
      'HIPAA Cloud Security & Compliance Architect',
      'Telemedicine & Remote Diagnostics Engineer',
      'Wearable Biosignal Analytics Developer',
      'Electronic Health Record (EHR) Platform Engineer',
      'Climate & Weather Modeling Data Scientist',
      'Scientific Visualization & Simulation Developer',
      'Molecular Dynamics High-Performance Computing Lead',
      'Public Health Epidemiology Modeling Analyst',
    ],
  },
  {
    domain: 'Enterprise Platforms, SAP & CRM',
    salaryRange: '$96,000 – $168,000',
    demandGrowth: '+19% YoY Demand',
    baseSkills: [
      { name: 'SQL', targetLevel: 84, weight: 5, category: 'Backend' },
      { name: 'JavaScript', targetLevel: 78, weight: 4, category: 'Frontend' },
      { name: 'Node.js', targetLevel: 76, weight: 4, category: 'Backend' },
      { name: 'Git & CI/CD', targetLevel: 74, weight: 3, category: 'Cloud & DevOps' },
      { name: 'Cloud Security', targetLevel: 75, weight: 3, category: 'Security' },
    ],
    titles: [
      'Salesforce Technical Architect',
      'SAP S/4HANA Integration & BTP Developer',
      'ServiceNow Workflow Automation Architect',
      'Enterprise ERP Data Migration Lead',
      'Workday & HRIS Integration Engineer',
      'Identity SSO & SAML/OIDC Enterprise Architect',
      'Low-Code / Enterprise Automation Architect',
      'Microsoft Dynamics 365 Solutions Engineer',
      'B2B EDI & Supply Chain Integration Specialist',
      'Customer Data Platform (CDP) Architect',
      'Enterprise Search & Knowledge Graph Engineer',
      'Solutions Engineering & Pre-Sales Architect',
      'Technical Customer Success Architect',
      'Cloud FinOps & Licensing Governance Analyst',
    ],
  },
];

function slugifyRoleId(title: string, idx: number): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 44);
  return `${base}-${idx}`;
}

export const GENERATED_EXTENDED_CAREER_ROLES: CareerRole[] = (() => {
  const list: CareerRole[] = [];
  let counter = 10;
  for (const tpl of DOMAIN_TEMPLATES) {
    for (const title of tpl.titles) {
      counter += 1;
      const skillNames = tpl.baseSkills.map((s) => s.name).slice(0, 4).join(', ');
      list.push({
        id: slugifyRoleId(title, counter),
        title,
        domain: tpl.domain,
        salaryRange: tpl.salaryRange,
        demandGrowth: tpl.demandGrowth,
        summary: `Specialized ${tpl.domain} career track focused on ${title}, anchored in ${skillNames}.`,
        requiredSkills: tpl.baseSkills,
      });
    }
  }
  return list;
})();

export function searchCareerRoles(
  roles: CareerRole[],
  keyword: string,
  domainFilter = 'All',
): CareerRole[] {
  const q = keyword.trim().toLowerCase();
  const filteredByDomain =
    domainFilter && domainFilter.toLowerCase() !== 'all'
      ? roles.filter((r) => r.domain === domainFilter)
      : roles;

  if (!q) return filteredByDomain;

  const tokens = q.split(/\s+/).filter(Boolean);
  const scored: Array<{ role: CareerRole; score: number }> = [];

  for (const role of filteredByDomain) {
    const titleLower = role.title.toLowerCase();
    const domainLower = role.domain.toLowerCase();
    const summaryLower = role.summary.toLowerCase();
    const skillStr = role.requiredSkills.map((s) => s.name.toLowerCase()).join(' ');
    const combined = `${titleLower} ${domainLower} ${summaryLower} ${skillStr}`;

    if (!tokens.every((t) => combined.includes(t))) continue;

    let score = 0;
    if (titleLower === q) score += 120;
    else if (titleLower.startsWith(q)) score += 90;
    else if (titleLower.includes(q)) score += 60;
    if (domainLower.includes(q)) score += 30;
    if (skillStr.includes(q)) score += 25;
    if (summaryLower.includes(q)) score += 10;
    scored.push({ role, score });
  }

  scored.sort((a, b) => b.score - a.score || a.role.title.localeCompare(b.role.title));
  return scored.map((item) => item.role);
}
