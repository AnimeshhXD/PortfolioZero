/**
 * Project world content — doc 9 §9.2 content schema.
 * Source of truth: the résumé (public/Animesh_Sharma_Resume.pdf) + public GitHub repository metadata (links only).
 * Every string here is taken or condensed from those sources. Do not add claims that are not in them.
 */

export type ProjectId = 'lawlens' | 'triage' | 'workplace' | 'benefitbridge' | 'mavira' | 'healthcoach';

export interface ProjectLink {
  readonly kind: 'repo' | 'live' | 'site';
  readonly label: string;
  readonly href: string;
}

export interface ProjectSignal {
  /** A key figure, verbatim from the resume. */
  readonly value: string;
  /** What it measures, verbatim/condensed from the resume. */
  readonly label: string;
}

export interface ProjectContent {
  readonly id: ProjectId;
  /** Monument title, revealed only at climax (Law 27). */
  readonly monument: string;
  readonly name: string;
  /** Resume project header line. */
  readonly tagline: string;
  /** Resume one-line description. */
  readonly summary: string;
  readonly stack: readonly string[];
  /** Condensed resume bullets (2–4) used in the post-climax dossier. */
  readonly facts: readonly string[];
  /** Key metrics, only from the resume (doc 9 §9.2). */
  readonly signals: readonly ProjectSignal[];
  /** In-world vocabulary that worlds may render as signage (all resume-sourced). */
  readonly vocabulary: readonly string[];
  readonly links: readonly ProjectLink[];
  readonly emotionArc: readonly string[];
  /** Optional real screenshot (public/assets/screenshots/…). Procedural signage is used when absent. */
  readonly screenshot?: string;
}

export const projects: readonly ProjectContent[] = [
  {
    id: 'lawlens',
    monument: 'LAWLENS-X',
    name: 'LawLens-X',
    tagline: 'AI-Powered Contract Risk Intelligence',
    summary:
      'A production-grade multi-agent contract analysis system with deterministic grading and explainable AI.',
    stack: ['FastAPI', 'React', 'TypeScript', 'Ollama'],
    facts: [
      'Five-agent architecture: ClauseParser, RiskAnalyzer, RiskScorer, ScenarioSimulator, NegotiationAdvisor.',
      'Hybrid analysis — deterministic rules plus LLM contextual reasoning.',
      'Real-time Server-Sent Events streaming, with JSON-recovery, retry and timeout fallbacks.',
    ],
    signals: [{ value: '75–85%', label: 'accuracy on legal risk detection' }],
    vocabulary: ['ClauseParser', 'RiskAnalyzer', 'RiskScorer', 'ScenarioSimulator', 'NegotiationAdvisor', 'SSE'],
    links: [{ kind: 'repo', label: 'Repository', href: 'https://github.com/AnimeshhXD/LAWLENS-X' }],
    emotionArc: ['Mystery', 'Wrongness', 'Reconstruction', 'Reveal', 'Confident clarity'],
  },
  {
    id: 'triage',
    monument: 'TRIAGE ASSISTANT',
    name: 'Triage Assistant',
    tagline: 'AI-Powered Emergency Medical Triage',
    summary: 'An intelligent medical triage system for emergency assessment with sub-500ms latency.',
    stack: ['FastAPI', 'React', 'ChromaDB', 'Python', 'sentence-transformers'],
    facts: [
      'Semantic retrieval with ChromaDB and sentence-transformers matches symptoms to clinical protocols.',
      'Rule-based clinical reasoning returns a triage level — Red, Yellow or Green — with actions and risk scores.',
      'Vector search 120ms + context pruning 40ms + AI reasoning 150ms = 310ms total.',
    ],
    signals: [
      { value: '310ms', label: 'total response time' },
      { value: '99%', label: 'protocol-matching accuracy' },
    ],
    vocabulary: ['RED', 'YELLOW', 'GREEN', 'ChromaDB', 'sentence-transformers', '120ms', '40ms', '150ms', '310ms'],
    links: [
      { kind: 'live', label: 'Live', href: 'https://triage-assistant-frontend.onrender.com' },
      { kind: 'repo', label: 'Repository', href: 'https://github.com/AnimeshhXD/triage-assistant' },
    ],
    emotionArc: ['Darkness', 'Heartbeat', 'Instability', 'Reorganization', 'Stability', 'Urgency clarity'],
  },
  {
    id: 'workplace',
    monument: 'WORKPLACE OPERATIONS AGENT',
    name: 'Workplace Operations Agent',
    tagline: 'Deterministic Multi-Task AI Environment',
    summary:
      'An OpenEnv-compatible AI environment evaluating workplace task management across email, Slack and calendar.',
    stack: ['FastAPI', 'Docker', 'Python', 'OpenEnv'],
    facts: [
      'Deterministic grading of email classification, Slack incident response and calendar scheduling — reproducible scores.',
      'Three difficulty levels with strict ordering: classification, conflict resolution, coordinated incident response.',
      'Dense reward shaping: partial credit for intermediate actions, penalties for ordering violations.',
    ],
    signals: [{ value: '1.0', label: 'oracle baseline score' }],
    vocabulary: ['EMAIL', 'SLACK', 'CALENDAR', 'EASY', 'MEDIUM', 'HARD', 'WebSocket'],
    links: [{ kind: 'repo', label: 'Repository', href: 'https://github.com/AnimeshhXD/workplace_ops_agent' }],
    emotionArc: ['Chaos', 'Collision', 'Ordering', 'Alignment', 'Deterministic confidence'],
  },
  {
    id: 'benefitbridge',
    monument: 'BENEFITBRIDGE',
    name: 'BenefitBridge',
    tagline: 'Government Welfare Scheme Discovery Platform',
    summary: 'A live application connecting 1,000+ users to relevant government welfare schemes.',
    stack: ['React', 'Django', 'PostgreSQL'],
    facts: [
      'Eligibility-matching algorithm scoring multiple welfare schemes against user criteria.',
      'Role-based user and administrator views on secure JWT-based REST APIs.',
      'Indexed PostgreSQL schema for sub-100ms responses; CI/CD continuous deployment on Render.',
    ],
    signals: [
      { value: '1,000+', label: 'users connected' },
      { value: '<100ms', label: 'response times' },
    ],
    vocabulary: ['ELIGIBILITY', 'USER', 'ADMIN', 'JWT', 'REST'],
    links: [
      { kind: 'live', label: 'Live', href: 'https://benefitbridge-frontend.onrender.com/' },
      { kind: 'repo', label: 'Repository', href: 'https://github.com/AnimeshhXD/BenefitBridgeV2' },
    ],
    emotionArc: ['Isolation', 'Disconnected points', 'Discovery', 'Connection', 'Accessibility'],
  },
  {
    id: 'mavira',
    monument: 'MAVIRA OS',
    name: 'Mavira OS',
    tagline: 'Custom Linux Distribution',
    summary: 'A hardened Linux distribution built on Debian live-build.',
    stack: ['Debian', 'Bash', 'Linux', 'AppArmor'],
    facts: [
      'XFCE desktop environment, system services and boot process configured from scratch.',
      'Hardened with AppArmor policies and Fail2Ban intrusion prevention.',
      'Performance and usability optimized through custom kernel configurations.',
    ],
    signals: [],
    vocabulary: ['live-build', 'AppArmor', 'Fail2Ban', 'XFCE', 'kernel'],
    links: [
      { kind: 'site', label: 'Site', href: 'https://animeshhxd.github.io/Mavira/' },
      { kind: 'repo', label: 'Repository', href: 'https://github.com/AnimeshhXD/Mavira' },
    ],
    emotionArc: ['Instability', 'Fragmentation', 'Metallic assembly', 'Security calm', 'Silence'],
  },
  {
    id: 'healthcoach',
    monument: 'PERSONAL HEALTH COACH',
    name: 'Personal Health Coach',
    tagline: 'Multi-Agent AI Assistant',
    summary: 'A modular multi-agent system for personalized health guidance.',
    stack: ['Python', 'LLMs'],
    facts: [
      'Memory compression and cost-aware execution for efficient token usage.',
      'Streaming responses for real-time interaction.',
    ],
    signals: [],
    vocabulary: ['memory compression', 'cost-aware execution', 'streaming'],
    links: [{ kind: 'repo', label: 'Repository', href: 'https://github.com/AnimeshhXD/Personal-Health-Coach' }],
    emotionArc: ['Fragmentation', 'Gentle compression', 'Warmth', 'Continuous flow', 'Peace'],
  },
];

export function getProject(id: ProjectId): ProjectContent {
  const p = projects.find((x) => x.id === id);
  if (!p) throw new Error(`Unknown project ${id}`);
  return p;
}
