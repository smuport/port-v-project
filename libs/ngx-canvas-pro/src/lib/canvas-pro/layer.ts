import {
  Observable,
  of,
  Subject,
} from 'rxjs';
import { AnimationObject, NoopAnimation } from './animation-object';
import { CpBaseEvent } from './event';
import { Renderable } from './renderable/renderable';
import { BaseLayer, LayerType } from './base-layer';
import { CustomRenderable } from './renderable/custom-renderable';

export type DataMode = 'pull' | 'push';

interface LayerTile {
  x: number;
  y: number;
  width: number;
  height: number;
  canvas: OffscreenCanvas;
  ctx: OffscreenCanvasRenderingContext2D;
}

export class Layer<T = any, U = any, E extends CpBaseEvent = CpBaseEvent>
  implements BaseLayer<T, U, E>
{
  private static readonly DEFAULT_TILE_SIZE = 2048;

  name: string;
  w = 0;
  h = 0;
  type: LayerType = 'canvas'; // 添加类型标识
  canvas: OffscreenCanvas; // 画在哪里？
  ctx: OffscreenCanvasRenderingContext2D | null;
  dataSource: Observable<T> = new Observable<T>(); // 画什么？
  trigger: Observable<U> = of(); // 何时画？
  animation: AnimationObject<T> = new NoopAnimation();
  event$ = new Subject<E>();
  eventObservable?: Observable<
    [callback: (evt: E, data: T) => void, evt: E, data: T]
  >;
  eventMap = new Map<string, (evt: E, data: T) => void>();
  private renderables: Renderable[] = [];
  private tiles: LayerTile[] = [];
  private tileSize: number;

  // 数据模式
  private _dataMode: DataMode = 'pull';
  get dataMode(): DataMode {
    return this._dataMode;
  }
  onSizeUpdated = (w: number, h: number) => {console.log(`${this.name} Layer size update to w=${w} h=${h} `)};

  constructor(name: string, w = 15000, h = 1500, tileSize = Layer.DEFAULT_TILE_SIZE) {
    this.name = name;
    this.tileSize = Math.max(256, tileSize);
    this.canvas = new OffscreenCanvas(w, h);
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
    this.w = w;
    this.h = h;
    this.updateCanvasSize(w, h);
  }

  /**
   * 设置为推送数据模式
   */
  setPushMode(): this {
    this._dataMode = 'push';
    return this;
  }

  /**
   * 设置为拉取数据模式（默认模式）
   */
  setPullMode(): this {
    this._dataMode = 'pull';
    return this;
  }

  addEventListener(evtName: string, callback: (evt: E, data: T) => void) {
    this.eventMap.set(evtName, callback);
  }

  triggerEvent(evt: E) {
    this.event$.next(evt);
  }

  setDataSource(dataSource: Observable<T> | T) {
    if (dataSource instanceof Observable) {
      this.dataSource = dataSource;
    } else {
      this.dataSource = of(dataSource);
    }
  }

  setTrigger(trigger: Observable<U>) {
    this.trigger = trigger;
    return this;
  }

  setRenderer(
    renderer: (ctx: OffscreenCanvasRenderingContext2D, data: T) => void
  ) {
    this.renderables.push(new CustomRenderable(renderer));
    return this;
  }

  addRenderable(renderable: Renderable) {
    this.renderables.push(renderable);
    return this;
  }

  setAnimation(ao: AnimationObject<T>): Layer<T, U, E> {
    this.animation = ao;
    return this;
  }

  private updateCanvasSize(w: number, h: number) {
    // 该函数是调整整个OffScreenCanvas画布的大小，不是调整视口大小
    this.canvas.width = w;
    this.canvas.height = h;


    //     // 通过多个离屏瓦片承载大画布，避免单个 OffscreenCanvas 尺寸超限。
    // this.tiles = [];
    // const safeW = Math.max(0, Math.floor(w));
    // const safeH = Math.max(0, Math.floor(h));

    // if (safeW === 0 || safeH === 0) {
    //   this.canvas.width = 1;
    //   this.canvas.height = 1;
    //   this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
    //   return;
    // }

    // const cols = Math.ceil(safeW / this.tileSize);
    // const rows = Math.ceil(safeH / this.tileSize);

    // for (let row = 0; row < rows; row++) {
    //   for (let col = 0; col < cols; col++) {
    //     const x = col * this.tileSize;
    //     const y = row * this.tileSize;
    //     const width = Math.min(this.tileSize, safeW - x);
    //     const height = Math.min(this.tileSize, safeH - y);
    //     const tileCanvas = new OffscreenCanvas(width, height);
    //     const tileCtx = tileCanvas.getContext('2d', { willReadFrequently: true });
    //     if (!tileCtx) {
    //       continue;
    //     }

    //     this.tiles.push({
    //       x,
    //       y,
    //       width,
    //       height,
    //       canvas: tileCanvas,
    //       ctx: tileCtx,
    //     });
    //   }
    // }

    // if (this.tiles.length > 0) {
    //   this.canvas = this.tiles[0].canvas;
    //   this.ctx = this.tiles[0].ctx;
    // }
  }

  isValid() {
    return this.dataSource && this.trigger && this.renderables.length > 0;
  }

  // render(data: T) {
  //   this.ctx.clearRect(
  //     0,
  //     0,
  //     this.ctx.canvas.width,
  //     this.ctx.canvas.height
  //   );
  //   this.renderer(this.ctx, data);
  // }
  render(data: T) {
    if (!this.ctx) {
      return;
    }
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    for (const renderable of this.renderables) {
      const extractData = renderable.extractData(data);
      renderable.setData(extractData);
      renderable.render(this.ctx);
    }

    // todo 分块渲染，目前有问题，后续优化
    // if (this.tiles.length === 0) {
    //   return;
    // }

    // const renderDataList = this.renderables.map((renderable) => {
    //   const extractData = renderable.extractData(data);
    //   renderable.setData(extractData);
    //   return renderable;
    // });

    // for (const tile of this.tiles) {
    //   tile.ctx.clearRect(0, 0, tile.width, tile.height);
    //   tile.ctx.save();
    //   tile.ctx.translate(-tile.x, -tile.y);
    //   for (const renderable of renderDataList) {
    //     renderable.render(tile.ctx);
    //   }
    //   tile.ctx.restore();
    // }
  }

  // 检查哪些 Renderable 被选框命中，并返回对应的 data
  checkSelection(selection: {
    x: number;
    y: number;
    w: number;
    h: number;
  }): any[] {
    const selectedData: any[] = [];
    for (const renderable of this.renderables) {
      this.checkRenderableSelection(renderable, selection, selectedData);
    }
    // if (this.renderable) {
    //   this.checkRenderableSelection(this.renderable, selection, selectedData);
    // }
    return selectedData;
  }

  private checkRenderableSelection(
    renderable: Renderable<any>,
    selection: { x: number; y: number; w: number; h: number },
    selectedData: any[]
  ) {
    const selectedItems = renderable.checkSelection(selection);
    if (selectedItems.length > 0) {
      selectedItems.forEach((item: any) => {
        selectedData.push(item);
      });
    }
    // renderable.getChildren().forEach(child => this.checkRenderableSelection(child, selection, selectedData));
  }

  // 实现 BaseLayer 接口的 updateSize 方法
  updateSize(w: number, h: number): void {
    this.w = w;
    this.h = h;
    this.updateCanvasSize(w, h);
    this.onSizeUpdated(w, h);
  }
}
