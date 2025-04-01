import { Renderable, RenderStyle } from './renderable';

export class CustomRenderable<D> extends Renderable {

  private renderer: (ctx: OffscreenCanvasRenderingContext2D, data: D) => void;
  constructor(
    renderer: (ctx: OffscreenCanvasRenderingContext2D, data: D) => void,
    initialData?: D,
  ) {
    super(initialData);
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

  // override checkSelection(selection: { x: number; y: number; w: number; h: number; }): any[] {
  //     return this.selectionChecker(selection);
  // }
}
