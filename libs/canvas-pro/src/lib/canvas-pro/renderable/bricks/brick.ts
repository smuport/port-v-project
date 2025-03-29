import { RenderStyle } from '../renderable';

export abstract class Brick<T extends RenderStyle = RenderStyle> {
  protected style?: T;
  constructor() {}

  abstract render(ctx: OffscreenCanvasRenderingContext2D): void;

  updateStyle(style: T) {
    this.style = style;
  }
}
