/**
 * Identity content — source of truth: the résumé (public/Animesh_Sharma_Resume.pdf) (doc 9 §9.1: no fabrication).
 * Pure data: imported by both the runtime and the build-time static/SEO renderer.
 */

export interface ContactLink {
  readonly id: 'resume' | 'github' | 'linkedin' | 'email';
  readonly label: string;
  readonly href: string;
  readonly external: boolean;
  readonly description: string;
}

export const identity = {
  name: 'Animesh Sharma',
  monument: 'ANIMESH SHARMA',
  location: 'Mumbai, India',
  /** Three role lines (doc 11 §3: "top title → then three role lines"). Each is resume-derived. */
  roles: [
    'Full-Stack Developer',
    'Multi-Agent AI Systems · Backend · Linux',
    'B.Tech Computer Science · SAKEC, Mumbai',
  ],
  education: {
    school: 'Shah and Anchor Kutchhi Engineering College (SAKEC)',
    degree: 'B.Tech in Computer Science Engineering',
    expected: 'Expected July 2028',
    detail: 'Cumulative GPA 9.07/10 (Sem 3) · Pursuing Honors Degree in AI & Data Science',
  },
  experience: {
    role: 'Full Stack Developer — Independent Projects',
    period: '2023 – Present',
    summary: 'Building production-grade applications across frontend, backend, and deployment.',
  },
  /** Doc 5 §10 / doc 6 §2 — Scene 0 narrative. */
  boot: ['Every system begins with a single decision.', 'Mine was to build.'],
  /** Doc 2 §9 — Ending sentence. */
  ending: 'The next chapter is waiting to be built.',
  contacts: [
    {
      id: 'resume',
      label: 'Resume',
      href: '/Animesh_Sharma_Resume.pdf',
      external: true,
      description: 'Résumé (PDF)',
    },
    {
      id: 'github',
      label: 'GitHub',
      href: 'https://github.com/AnimeshhXD',
      external: true,
      description: 'github.com/AnimeshhXD',
    },
    {
      id: 'linkedin',
      label: 'LinkedIn',
      href: 'https://www.linkedin.com/in/animesh-animw',
      external: true,
      description: 'linkedin.com/in/animesh-animw',
    },
    {
      id: 'email',
      label: 'Email',
      href: 'mailto:animesh.sharma554@gmail.com',
      external: false,
      description: 'animesh.sharma554@gmail.com',
    },
  ] as readonly ContactLink[],
  hackathons:
    'Meta Scaler School (Workplace Ops Agent) · HPE Intel Hackathon (Personal Health Coach, Triage Assistant) · SIH 2025-26 · Meta IoT Hackathon · ByteCamp',
} as const;
