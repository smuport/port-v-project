import {
  Observable,
  Subject,
} from 'rxjs';
import { AnimationObject, NoopAnimation } from './animation-object';
import { CpBaseEvent } from './event';
import { Renderable } from './renderable/renderable';

// 修改 SvgLayer 类以实现 BaseLayer 接口
import { BaseLayer, LayerType } from './base-layer';

export class SvgLayer<T = any, U = any> implements BaseLayer<T, U> {
  name: string;
  w: number = 0;
  h: number = 0;
  svgElement: SVGSVGElement; // SVG 元素
  dataSource: Observable<T> = new Observable(); // 画什么？
  trigger: Observable<U> = new Observable(); // 何时画？
  animation: AnimationObject<T> = new NoopAnimation();
  event$ = new Subject<CpBaseEvent>();
  eventObservable?: Observable<
    [callback: (evt: CpBaseEvent, data: T) => void, evt: CpBaseEvent, data: T]
  >;
  eventMap = new Map<string, (evt: CpBaseEvent, data: T) => void>();
  private renderables: Renderable[] = [];
  private svgNamespace = 'http://www.w3.org/2000/svg';
  
  // 数据模式
  private _dataMode: 'pull' | 'push' = 'pull';
  get dataMode(): 'pull' | 'push' {
    return this._dataMode;
  }

  constructor(name: string, w = 15000, h = 1500) {
    this.name = name;
    // 创建 SVG 元素
    this.svgElement = document.createElementNS(this.svgNamespace, 'svg') as SVGSVGElement;
    this.svgElement.setAttribute('width', w.toString());
    this.svgElement.setAttribute('height', h.toString());
    this.svgElement.setAttribute('viewBox', `0 0 ${w} ${h}`);
    this.svgElement.style.position = 'absolute';
    this.svgElement.style.top = '0';
    this.svgElement.style.left = '0';
    this.svgElement.style.pointerEvents = 'none'; // 默认不接收鼠标事件
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
    return this;
  }

  triggerEvent<A extends CpBaseEvent>(evt: A) {
    this.event$.next(evt);
  }

  setDataSource(dataSource: Observable<T>) {
    this.dataSource = dataSource;
    return this;
  }

  setTrigger(trigger: Observable<U>) {
    this.trigger = trigger;
    return this;
  }

  addRenderable(renderable: Renderable) {
    this.renderables.push(renderable);
    return this;
  }

  setAnimation(ao: AnimationObject<T>): void {
    this.animation = ao;
  }

  updateSvgSize(w: number, h: number) {
    this.w = w;
    this.h = h;
    this.svgElement.setAttribute('width', w.toString());
    this.svgElement.setAttribute('height', h.toString());
    this.svgElement.setAttribute('viewBox', `0 0 ${w} ${h}`);
  }

  isValid() {
    return this.dataSource && this.trigger && this.renderables.length > 0;
  }

  render(data: T) {
    // 清除所有子元素
    while (this.svgElement.firstChild) {
      this.svgElement.removeChild(this.svgElement.firstChild);
    }
    
    // 渲染所有 renderables
    for (const renderable of this.renderables) {
      const extractData = renderable.extractData(data);
      renderable.setData(extractData);
      // 这里需要修改 renderable 接口以支持 SVG 渲染
      if ('renderSvg' in renderable && typeof renderable.renderSvg === 'function') {
        renderable.renderSvg(this.svgElement);
        // for (const element of svgElements) {
        //   this.svgElement.appendChild(element);
        // }
      }
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
    if (renderable.intersects(selection)) {
      selectedData.push(renderable.getData());
    }
  }
  type: LayerType = 'svg'; // 添加类型标识
  
  // 实现 BaseLayer 接口的 updateSize 方法
  updateSize(w: number, h: number): void {
    this.updateSvgSize(w, h);
  }
}