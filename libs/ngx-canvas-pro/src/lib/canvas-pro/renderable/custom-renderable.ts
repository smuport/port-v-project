import { Renderable, RenderStyle } from './renderable';

export class CustomRenderable<D> extends Renderable {

  private renderer: (ctx: OffscreenCanvasRenderingContext2D, data: D) => void;
  constructor(
    data: D,
    renderer: (ctx: OffscreenCanvasRenderingContext2D, data: D) => void
  ) {
    super(data);
    this.renderer = renderer;
  }

  override render(ctx: OffscreenCanvasRenderingContext2D): void {
    this.renderer(ctx, this.getData());
  }

  override renderSvg?(svgRoot: SVGElement): SVGElement {
    throw new Error('Canvas renderable not support renderSvg.');
  }

  override extractData(data: any): D {
    this.setData(data);
    return data;
  }
}
