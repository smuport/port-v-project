import { Renderable, RenderStyle } from '../renderable';
import { Brick } from './brick';

export interface TextStyle extends RenderStyle {
  text: string;
  font?: string;
  textAlign?: CanvasTextAlign;
  textBaseline?: CanvasTextBaseline;
}

export class TextBrick extends Brick<TextStyle> {
  constructor() {
    super();

  }
  override render(ctx: OffscreenCanvasRenderingContext2D): void {
    if (!this.style) {
      return;
    }
    const { 
      x, y, text, fillStyle, font, 
      textAlign, textBaseline, 
      shadowColor, shadowBlur, shadowOffsetX, 
    shadowOffsetY } = this.style;
    if (shadowColor) {
      ctx.shadowColor = shadowColor;
      ctx.shadowBlur = shadowBlur || 0;
      ctx.shadowOffsetX = shadowOffsetX || 0;
      ctx.shadowOffsetY = shadowOffsetY || 0;
    }
    ctx.fillStyle = fillStyle || 'black';
    ctx.font = font || '16px Arial';
    ctx.textAlign = textAlign || 'start';
    ctx.textBaseline = textBaseline || 'alphabetic';
    ctx.fillText(text, x, y);
  }
}