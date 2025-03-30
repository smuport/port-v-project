import { Renderable, RenderStyle } from './renderable';

export class SvgRenderable<D> extends Renderable {
  renderer: (svgRoot: SVGElement, data: D) => void;

  constructor(
    data: D,
    renderer: (svgRoot: SVGElement, data: D) => void
  ) {
    super(data);
    this.renderer = renderer;
  }

  override render(ctx: OffscreenCanvasRenderingContext2D): void {
    throw new Error('Svg renderable not support render canvas.');
  }

  override renderSvg?(svgRoot: SVGElement): SVGElement {
    this.renderer(svgRoot, this.getData());
    return svgRoot;
  }

  override extractData(data: any): D {
    this.setData(data);
    return data;
  }
}
