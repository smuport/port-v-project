import { Renderable, RenderStyle } from '../renderable';
import { Brick } from './brick';

export interface RectStyle extends RenderStyle {
  w: number;
  h: number;
}

export class RectBrick extends Brick<RectStyle> {
  constructor() {
    super();
  }

  override render(ctx: OffscreenCanvasRenderingContext2D): void {
    if (!this.style) {
      return;
    }
    const { x, y, w, h, fillStyle, strokeStyle, lineWidth, shadowColor, shadowBlur, shadowOffsetX, shadowOffsetY } = this.style;
    if (shadowColor) {
      ctx.shadowColor = shadowColor;
      ctx.shadowBlur = shadowBlur || 0;
      ctx.shadowOffsetX = shadowOffsetX || 0;
      ctx.shadowOffsetY = shadowOffsetY || 0;
    }
    if (fillStyle) {
      ctx.fillStyle = fillStyle;
      ctx.fillRect(x, y, w, h);
    }
    if (strokeStyle) {
      ctx.strokeStyle = strokeStyle;
      ctx.lineWidth = lineWidth || 1;
      ctx.strokeRect(x, y, w, h);
    }
  }
}