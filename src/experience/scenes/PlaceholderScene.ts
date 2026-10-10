/**
 * PlaceholderScene — keeps the film continuous while a world is under construction or failed to load.
 * Palette preset + signature at its canonical SOC + the monument title at the standard climax beat.
 */
import type { SceneContext, SceneFrame, SceneId } from '../../types/scene';
import type { PresetId } from '../../tokens/palettes';
import { BaseScene } from './BaseScene';
import { EMISSION, FOG, PARTICLE } from '../../tokens/tokens';
import type { TextBlock } from '../ui/CinematicTextLayer';
import { beat } from '../../utils/math';
import { easeOutPremium } from '../../utils/easing';

export class PlaceholderScene extends BaseScene {
  private title!: TextBlock;

  constructor(
    id: SceneId,
    preset: PresetId,
    private readonly titleText: string,
    private readonly soc: number,
  ) {
    super(id, preset);
  }

  protected build(_ctx: SceneContext): void {
    this.title = this.text({ text: this.titleText, style: 'monument', slot: 'center' });
  }

  update(f: SceneFrame): void {
    const d = this.directives;
    const p = f.progress;
    d.camera.position.set(0, 0.2, 9 - p * 1.5);
    d.camera.target.set(0, 0, 0);
    d.fog.density = FOG.F1 + (1 - f.enter) * FOG.F2;
    d.signature.soc = this.soc;
    d.signature.position.set(0, -0.2, -1.5);
    d.signature.emission = EMISSION.G1;
    d.particles.density = PARTICLE.P1.density;
    const e = beat(p, 0.68, 0.76, easeOutPremium);
    this.title.set(e, f.exit, beat(p, 0.72, 0.8));
  }
}
