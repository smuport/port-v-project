import { RenderConfigurator } from '../render-configurator';
import { Brick } from './bricks/brick';

export interface RenderStyle {
  x?: number;
  y?: number;
  fillStyle?: string;
  strokeStyle?: string;
  lineWidth?: number;
  shadowColor?: string;
  shadowBlur?: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
}

export abstract class Renderable<D = any, S extends RenderStyle = any> {
  private bricks: Map<string, Brick> = new Map();
  protected selectionChecker: (selection: { x: number; y: number; w: number; h: number; }) => any[] = () => [];
  protected updater?: (data: D) => void;
  constructor(
    private data?: D,
    protected configuator?: RenderConfigurator<D, S>
  ) {
    this.data = data;
    this.configuator = configuator;
    if (configuator) {
      this.updater = configuator.createUpdater();
      if (this.data) {
        this.updater(this.data);
      }
    }
  }

  protected addBrick(key: string, child: Brick) {
    this.bricks.set(key, child);
  }

  protected getBrick(key: string) {
    if (!this.bricks.has(key)) {
      console.error(`Brick with key ${key} not found`);
      return null;
    }
    return this.bricks.get(key);
  }

  setSelectionChecker(
    checker: (selection: { x: number; y: number; w: number; h: number; }) => any[],
  ) {
    this.selectionChecker = checker;
  }

  abstract render(ctx: OffscreenCanvasRenderingContext2D): void;

  getData() {
    return this.data;
  }

  abstract extractData(data: any): D;

  setData(data: D) {
    this.data = data;
    this.updater && this.updater(data);
  }

  // 检查是否与选框相交
  checkSelection(selection: {
    x: number;
    y: number;
    w: number;
    h: number;
  }): any[] {
    return this.selectionChecker(selection);
    // return [];
    // const { x, y } = this.configuator.getStyle();
    // if (x === undefined || y === undefined) {
    // return false;
    // }
    // return !(x > selection.x + selection.w || y > selection.y + selection.h);
  }

  abstract renderSvg?(svgRoot: SVGElement): SVGElement;
}

// // 添加 renderSvg 方法到 Renderable 接口
// export interface Renderable<T = any> {
//   // 现有方法
//   setData(data: T): void;
//   getData(): T;
//   render(ctx: OffscreenCanvasRenderingContext2D): void;
//   extractData(data: any): T;
//   intersects(selection: { x: number; y: number; w: number; h: number }): boolean;
  
//   // 新增方法，用于 SVG 渲染
//   renderSvg?(): SVGElement[];
// }
