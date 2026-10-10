/**
 * The film's running order (doc 6). Bands are scroll lengths in vh; TX bands sit between scenes.
 * Project worlds share one beat convention (see AUTHORING.md) so holds line up across the film.
 */
import type { SceneDefinition } from '../../types/scene';

export const TX_BAND = 100;

/** Readable holds for project worlds: conflict peak · title climax · full dossier. */
export const PROJECT_HOLDS = [0.36, 0.74, 0.93] as const;

export const SCENES: readonly SceneDefinition[] = [
  {
    id: 'boot',
    title: 'Boot Sequence — A Single Decision',
    band: 200,
    transitionOut: 'absorb',
    holds: [0.3, 0.64, 0.97],
    soc: 0,
    load: () => import('./Scene0Boot/index'),
  },
  {
    id: 'identity',
    title: 'Identity — Animesh Sharma',
    band: 280,
    transitionOut: 'dissolve',
    holds: [0.42, 0.72, 0.9],
    soc: 1,
    load: () => import('./Scene1Identity/index'),
  },
  {
    id: 'lawlens',
    title: 'LawLens-X',
    band: 400,
    transitionOut: 'absorb',
    holds: PROJECT_HOLDS,
    soc: 2,
    load: () => import('./ProjectWorlds/LawLensX/index'),
  },
  {
    id: 'triage',
    title: 'Triage Assistant',
    band: 400,
    transitionOut: 'collapse',
    holds: PROJECT_HOLDS,
    soc: 3,
    load: () => import('./ProjectWorlds/Triage/index'),
  },
  {
    id: 'workplace',
    title: 'Workplace Operations Agent',
    band: 400,
    transitionOut: 'absorb',
    holds: PROJECT_HOLDS,
    soc: 4,
    load: () => import('./ProjectWorlds/WorkplaceOps/index'),
  },
  {
    id: 'benefitbridge',
    title: 'BenefitBridge',
    band: 400,
    transitionOut: 'dissolve',
    holds: PROJECT_HOLDS,
    soc: 5,
    load: () => import('./ProjectWorlds/BenefitBridge/index'),
  },
  {
    id: 'mavira',
    title: 'Mavira OS',
    band: 400,
    transitionOut: 'absorb',
    holds: PROJECT_HOLDS,
    soc: 6,
    load: () => import('./ProjectWorlds/MaviraOS/index'),
  },
  {
    id: 'healthcoach',
    title: 'Personal Health Coach',
    band: 400,
    transitionOut: 'dissolve',
    holds: PROJECT_HOLDS,
    soc: 7,
    load: () => import('./ProjectWorlds/HealthCoach/index'),
  },
  {
    id: 'ending',
    title: 'Ending — The Next Chapter',
    band: 320,
    transitionOut: 'dissolve',
    holds: [0.62, 0.96],
    soc: 8,
    load: () => import('./Ending/index'),
  },
];

export function sceneIndex(id: string): number {
  return SCENES.findIndex((s) => s.id === id);
}
