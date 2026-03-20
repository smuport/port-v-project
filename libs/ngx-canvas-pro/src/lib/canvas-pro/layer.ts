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
import { VirtualContext } from './virtual-context';

export type DataMode = 'pull' | 'push';

export interface LayerTile {
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
  private static readonly MAX_CANVAS_SIZE = 32767; // 浏览器 canvas 尺寸限制

  name: string;
  w = 0;
  h = 0;
  type: LayerType = 'canvas';
  canvas: OffscreenCanvas;
  ctx: OffscreenCanvasRenderingContext2D | null;
  dataSource: Observable<T> = new Observable<T>();
  trigger: Observable<U> = of();
  animation: AnimationObject<T> = new NoopAnimation();
  event$ = new Subject<E>();
  eventObservable?: Observable<
    [callback: (evt: E, data: T) => void, evt: E, data: T]
  >;
  eventMap = new Map<string, (evt: E, data: T) => void>();
  private renderables: Renderable[] = [];
  private tiles: LayerTile[] = [];
  private tileSize: number;
  private useTiles = false; // 是否使用 tiles 模式
  private hasNotifiedSize = false; // 是否已通知过尺寸更新

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
    this.updateSize(w, h);
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

  /**
   * 更新画布尺寸
   * 当尺寸超过浏览器限制时，自动切换到 tiles 模式
   */
  private updateCanvasSize(w: number, h: number) {
    // 检查是否需要使用 tiles
    const needsTiles = w > Layer.MAX_CANVAS_SIZE || h > Layer.MAX_CANVAS_SIZE;
    
    if (needsTiles) {
      this.useTiles = true;
      this.createTiles(w, h);
      // 保留一个小的主 canvas 作为后备
      this.canvas.width = 1;
      this.canvas.height = 1;
    } else {
      this.useTiles = false;
      this.tiles = [];
      this.canvas.width = w;
      this.canvas.height = h;
    }
  }

  /**
   * 创建 tiles
   */
  private createTiles(totalWidth: number, totalHeight: number) {
    this.tiles = [];
    const safeW = Math.max(0, Math.floor(totalWidth));
    const safeH = Math.max(0, Math.floor(totalHeight));

    if (safeW === 0 || safeH === 0) return;

    const cols = Math.ceil(safeW / this.tileSize);
    const rows = Math.ceil(safeH / this.tileSize);

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const x = col * this.tileSize;
        const y = row * this.tileSize;
        const width = Math.min(this.tileSize, safeW - x);
        const height = Math.min(this.tileSize, safeH - y);
        
        const tileCanvas = new OffscreenCanvas(width, height);
        const tileCtx = tileCanvas.getContext('2d', { willReadFrequently: true });
        
        if (!tileCtx) continue;

        this.tiles.push({
          x,
          y,
          width,
          height,
          canvas: tileCanvas,
          ctx: tileCtx,
        });
      }
    }

    console.log(`[Layer ${this.name}] Created ${this.tiles.length} tiles (${cols}x${rows}) for ${totalWidth}x${totalHeight}`);
  }

  /**
   * 获取 tiles（供 ViewportService 使用）
   */
  getTiles(): ReadonlyArray<LayerTile> {
    return this.tiles;
  }

  /**
   * 是否使用 tiles 模式
   */
  isUsingTiles(): boolean {
    return this.useTiles;
  }

  isValid() {
    return this.dataSource && this.trigger && this.renderables.length > 0;
  }

  /**
   * 渲染数据
   * 根据是否使用 tiles 选择不同的渲染方式
   */
  render(data: T) {
    const startTime = performance.now();
    if (this.useTiles && this.tiles.length > 0) {
      this.renderToTiles(data);
    } else {
      this.renderToSingleCanvas(data);
    }
    const endTime = performance.now();
    console.log(`[Layer ${this.name}] Render took ${endTime - startTime}ms (tiles: ${this.useTiles})`);
    // 只在首次渲染时通知尺寸更新，避免重复触发导致视图重新渲染
    if (!this.hasNotifiedSize) {
      this.onSizeUpdated(this.w, this.h);
      this.hasNotifiedSize = true;
    }
  }

  /**
   * 渲染到 tiles
   */
  private renderToTiles(data: T) {
    // 清空所有 tiles
    for (const tile of this.tiles) {
      tile.ctx.clearRect(0, 0, tile.width, tile.height);
    }

    // 创建 VirtualContext
    const virtualCtx = new VirtualContext(this.tiles, this.w, this.h);

    // 渲染所有 renderables
    for (const renderable of this.renderables) {
      const extractData = renderable.extractData(data);
      renderable.setData(extractData);
      renderable.render(virtualCtx as any);
    }
  }

  /**
   * 渲染到单个 canvas
   */
  private renderToSingleCanvas(data: T) {
    if (!this.ctx) return;
    
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    for (const renderable of this.renderables) {
      const extractData = renderable.extractData(data);
      renderable.setData(extractData);
      renderable.render(this.ctx);
    }
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
  }

  // 实现 BaseLayer 接口的 updateSize 方法
  updateSize(w: number, h: number): void {
    this.w = w;
    this.h = h;
    console.log(`[Layer ${this.name}] Updating size to ${w}x${h}`);
    this.updateCanvasSize(w, h);
    this.onSizeUpdated(w, h);
    // 重置标志位，允许新的尺寸通知
    this.hasNotifiedSize = false;
  }
}
