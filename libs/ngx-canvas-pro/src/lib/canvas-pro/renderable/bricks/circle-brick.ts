import { Renderable, RenderStyle } from '../renderable';
import { Brick } from './brick';

export interface CircleStyle extends RenderStyle {
  radius: number;
}

export class CircleBrick extends Brick<CircleStyle> {
  constructor() {
    super();
  }

  render(ctx: OffscreenCanvasRenderingContext2D): void {
    if (!this.style) {
      return;
    }
    const {
      x,
      y,
      radius,
      fillStyle,
      strokeStyle,
      lineWidth,
      shadowColor,
      shadowBlur,
      shadowOffsetX,
      shadowOffsetY,
    } = this.style;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    if (shadowColor) {
      ctx.shadowColor = shadowColor;
      ctx.shadowBlur = shadowBlur || 0;
      ctx.shadowOffsetX = shadowOffsetX || 0;
      ctx.shadowOffsetY = shadowOffsetY || 0;
    }
    if (fillStyle) {
      ctx.fillStyle = fillStyle;
      ctx.fill();
    }
    if (strokeStyle) {
      ctx.strokeStyle = strokeStyle;
      ctx.lineWidth = lineWidth || 1;
      ctx.stroke();
    }
  }

  // // 覆写 intersects 方法
  // override intersects(selection: { x: number, y: number, w: number, h: number }): boolean {
  //     const { x, y, radius } = this.getStyle();
  //     const distX = Math.abs(selection.x + selection.w / 2 - x);
  //     const distY = Math.abs(selection.y + selection.h / 2 - y);

  //     if (distX > (selection.w / 2 + radius) || distY > (selection.h / 2 + radius)) {
  //       return false;
  //     }

  //     if (distX <= (selection.w / 2) || distY <= (selection.h / 2)) {
  //       return true;
  //     }

  //     const dx = distX - selection.w / 2;
  //     const dy = distY - selection.h / 2;
  //     return (dx * dx + dy * dy <= (radius * radius));
  // }
}
