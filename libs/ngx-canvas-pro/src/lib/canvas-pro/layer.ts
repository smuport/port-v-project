import {
  map,
  Observable,
  shareReplay,
  Subject,
  tap,
  withLatestFrom,
} from 'rxjs';
import { AnimationObject, NoopAnimation } from './animation-object';
import { CpBaseEvent } from './event';
import { Renderable } from './renderable/renderable';

export type DataMode = 'pull' | 'push';

export class Layer<T = any, U = any> {
  name: string;
  w: number = 0;
  h: number = 0;
  canvas: OffscreenCanvas; // 画在哪里？
  ctx: OffscreenCanvasRenderingContext2D | null;
  dataSource: Observable<T> = new Observable(); // 画什么？
  trigger: Observable<U> = new Observable(); // 何时画？
  animation: AnimationObject<T> = new NoopAnimation();
  event$ = new Subject<CpBaseEvent>();
  eventObservable?: Observable<
    [callback: (evt: CpBaseEvent, data: T) => void, evt: CpBaseEvent, data: T]
  >;
  eventMap = new Map<string, (evt: CpBaseEvent, data: T) => void>();
  // private renderer: (ctx: OffscreenCanvasRenderingContext2D, data: T) => void; // 怎么画？
  private renderables: Renderable[] = [];
  // private dataToRenderable: (data: T) => Renderable;
  // private dbclickCallback: (axis: {x: number, y: number}, data: T) => void;

  // 数据模式
  private _dataMode: DataMode = 'pull';
  get dataMode(): DataMode {
    return this._dataMode;
  }

  constructor(name: string, w = 15000, h = 1500) {
    this.name = name;
    this.canvas = new OffscreenCanvas(w, h);
    this.ctx = this.canvas.getContext('2d');
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

  setDataSource(dataSource: Observable<T>) {
    this.dataSource = dataSource;
  }

  setTrigger(trigger: Observable<U>) {
    this.trigger = trigger;
  }

  addRenderable(renderable: Renderable) {
    this.renderables.push(renderable);
  }

  setAnimation(ao: AnimationObject<T>): void {
    this.animation = ao;
  }

  updateCanvasSize(w: number, h: number) {
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
    if (renderable.intersects(selection)) {
      selectedData.push(renderable.getData());
    }
    // renderable.getChildren().forEach(child => this.checkRenderableSelection(child, selection, selectedData));
  }
}
