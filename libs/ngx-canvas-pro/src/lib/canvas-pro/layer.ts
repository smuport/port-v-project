import {
  map,
  Observable,
  of,
  shareReplay,
  Subject,
  tap,
  withLatestFrom,
} from 'rxjs';
import { AnimationObject, NoopAnimation } from './animation-object';
import { CpBaseEvent } from './event';
import { Renderable } from './renderable/renderable';
import { BaseLayer, LayerType } from './base-layer';
import { CustomRenderable } from './renderable/custom-renderable';

export type DataMode = 'pull' | 'push';

export class Layer<T = any, U = any> implements BaseLayer<T, U> {
  name: string;
  w: number = 0;
  h: number = 0;
  type: LayerType = 'canvas'; // 添加类型标识
  canvas: OffscreenCanvas; // 画在哪里？
  ctx: OffscreenCanvasRenderingContext2D | null;
  dataSource: Observable<T> = new Observable<T>(); // 画什么？
  trigger: Observable<U> = of(); // 何时画？
  animation: AnimationObject<T> = new NoopAnimation();
  event$ = new Subject<CpBaseEvent>();
  eventObservable?: Observable<
    [callback: (evt: CpBaseEvent, data: T) => void, evt: CpBaseEvent, data: T]
  >;
  eventMap = new Map<string, (evt: CpBaseEvent, data: T) => void>();
  private renderables: Renderable[] = [];

  // 数据模式
  private _dataMode: DataMode = 'pull';
  get dataMode(): DataMode {
    return this._dataMode;
  }

  constructor(name: string, w = 15000, h = 1500) {
    this.name = name;
    this.canvas = new OffscreenCanvas(w, h);
    this.ctx = this.canvas.getContext('2d');
    this.w = w;
    this.h = h;
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

  addEventListener(
    evtName: string,
    callback: (evt: CpBaseEvent, data: T) => void
  ) {
    this.eventMap.set(evtName, callback);
  }

  triggerEvent<A extends CpBaseEvent>(evt: A) {
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

  setRenderer(renderer: (ctx: OffscreenCanvasRenderingContext2D, data: T) => void) {
    this.renderables.push(new CustomRenderable(renderer));
    return this;   
  }

  addRenderable(renderable: Renderable) {
    this.renderables.push(renderable);
    return this;
  }

  setAnimation(ao: AnimationObject<T>): Layer {
    this.animation = ao;
    return this;
  }

  updateCanvasSize(w: number, h: number) {
    // 该函数是调整整个OffScreenCanvas画布的大小，不是调整视口大小
    this.canvas.width = w;
    this.canvas.height = h;
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
    this.updateCanvasSize(w, h);
  }
}
