# Voragen — Adaptive AI Career & Skill Intelligence Platform

Voragen is a full-stack AI-powered personalized learning and career readiness platform designed to eliminate one-size-fits-all education. It maps a learner's existing competencies, identifies exact role gaps, orchestrates four collaborating specialized AI agents, and adapts dynamically when career goals shift or assessments drop below mastery thresholds.

## Core Architecture & Multi-Agent AI Collaboration

1. **Skill Profiler Agent (Dr. Elena Vance)** — Evaluates existing skills, certifications, projects, and diagnostic quiz accuracy.
2. **Market Matcher Agent (Marcus Chen)** — Benchmarks current proficiency against weighted industry role matrices and calculates exact readiness percentages.
3. **Curriculum Architect Agent (Prof. Aria Kapoor)** — Builds personalized roadmaps and automatically injects remedial recovery labs whenever an assessment scores below 60%.
4. **Career Mentor & AI Video Studio** — Provides multi-turn mentorship and generates interactive, scene-by-scene AI Video Lessons with synchronized code walkthroughs and voice narration.

## Signature Modules

- **Left-Side Adaptive Workspace**: Clean left-sidebar navigation with **Light** (White, Crimson Red, Gold, Green), **Dark** (Obsidian Black, Electric Blue, Rose Pink, Gold), and **System** theme modes.
- **User Profile & Auth**: Register or sign in via Google, Microsoft, or Email, and manage skills, certifications, projects, and career goals.
- **Code Arena (50,000+ Programs)**: Indexed Easy (+10 pts), Medium (+25 pts), and Hard (+50 pts) challenges with live JavaScript test execution and streak tracking.
- **Voragen Games (6 Cognitive Games)**: Word Connect, Logic Sudoku, Zip Path, Word Finding, Spot the Difference (Architecture Audit), and Code Error Finder.
- **Global Jobs Directory (20,000+ Companies)**: Skill-matched global opportunities with corporate details, contact desks, and progress-tracked applications.

## Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Motion, Lucide Icons
- **Backend**: Express.js, `@google/genai` (`gemini-4-hydrogen`), Vite Middleware
- **Testing**: `node:test` + `tsx` unit suite (`src/utils/skillEngine.test.ts`)

## Local Browser Setup (Exact Design & Full-Stack Parity)

Run Voragen locally via the unified Express + Vite server so the dark/light themes, images, multi-agent AI APIs, and database endpoints render identically to the preview:

```bash
npm install
npm run dev
```

Then open **http://localhost:3000** in any browser (Chrome, Edge, Firefox, Safari).

For production builds locally:

```bash
npm run build
NODE_ENV=production npm start
```

Run unit tests and type/build checks:

```bash
npx --yes tsx --test src/utils/skillEngine.test.ts
npm run lint
npm run build
```

## Support & Maintainer

- **Abhishek R**
- Email: `abhishekr.bcs25@gmail.com`
- Phone: `9745169331`
