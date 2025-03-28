import {
  AfterViewInit,
  Component,
  ElementRef,
  HostListener,
  Input,
  OnDestroy,
  ViewChild,
} from '@angular/core';
import {
  catchError,
  exhaustMap,
  filter,
  map,
  merge,
  mergeAll,
  Observable,
  of,
  shareReplay,
  Subject,
  Subscription,
  takeUntil,
  tap,
  withLatestFrom,
} from 'rxjs';

import { Layer } from './layer';
import {
  CpBaseEvent,
  CpDbClickEvent,
  CpRightClickEvent,
  CpRightClickUpEvent,
  CpRightMoveEvent,
} from './event';

@Component({
  selector: 'canvas-pro',
  templateUrl: './canvas-pro.component.html',
  styleUrls: ['./canvas-pro.component.css'],
  standalone: true,
})
export class CanvasProComponent implements OnDestroy, AfterViewInit {
  layers: Layer[] = [];
  allDataTriggers: Observable<any>[] = [];
  allAnimationTriggers: Observable<any>[] = [];
  allEventTriggers: Observable<any>[] = [];
  @ViewChild('viewport', { static: true })
  viewport!: ElementRef<HTMLCanvasElement>;
  viewportCtx!: CanvasRenderingContext2D;
  translatePos = { x: 0, y: 0 };
  isDragging = false;
  isRightDragging = false;
  startDragPos = { x: 0, y: 0 };
  endDragPos = { x: 0, y: 0 };
  scale = 1;
  @Input() controlDataflow!: (
    dataflowTriggers$: Observable<any>[]
  ) => Observable<any>;

  private frameId: number | null = null;
  private dataflowSubscription: Subscription | null = null;
  private animationSubscription: Subscription | null = null;
  private eventSubscription: Subscription | null = null;
  private destroy$ = new Subject<void>();

  constructor(private elRef: ElementRef) {}

  ngAfterViewInit(): void {
    this.viewportCtx = this.viewport.nativeElement.getContext(
      '2d'
    ) as CanvasRenderingContext2D;
    this.updateViewportSize();
    this.addEvents();
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: Event): void {
    this.updateViewportSize();
    this.drawVierport();
  }

  addEvents(): void {
    //鼠标拖动
    // 添加鼠标滚轮事件监听
    // this.viewport.nativeElement.addEventListener('wheel', event => this.onWheel(event));
    // 添加鼠标按下事件监听
    this.viewport.nativeElement.addEventListener('mousedown', (event) =>
      this.onMouseDown(event)
    );
    // 添加鼠标移动事件监听
    this.viewport.nativeElement.addEventListener('mousemove', (event) =>
      this.onMouseMove(event)
    );
    // 添加鼠标松开事件监听
    this.viewport.nativeElement.addEventListener('mouseup', (event) =>
      this.onMouseUp(event)
    );
    // 监听窗口失去焦点事件，防止拖动状态保持
    this.viewport.nativeElement.addEventListener('blur', (event) =>
      this.onMouseUp(event)
    );
  }

  private updateViewportSize() {
    const parentRect =
      this.elRef.nativeElement.parentElement.getBoundingClientRect();
    this.viewport.nativeElement.width = parentRect.width;
    this.viewport.nativeElement.height = parentRect.height;
  }

  addLayer(layer: Layer) {
    if (!layer.isValid) {
      console.error(`${layer.name} is not valid`);
      return;
    }
    this.layers.push(layer);
    // 初始化数据流
    const trigger$ = layer.trigger?.pipe(
      exhaustMap(() => layer?.dataSource),
      tap((data) => {
        // console.log(1),
        layer.animation.update(data);
      }),
      shareReplay({ refCount: true })
    );
    this.allDataTriggers.push(trigger$);
    // 初始化动画流，即渲染流
    const animation$ = layer.animation.onAnimated.asObservable().pipe(
      tap((data) => {
        // console.log(`${layer.name} animation triggered`);
        layer.render(data);
        this.drawVierport();
      })
    );
    this.allAnimationTriggers.push(animation$);
    console.log(`${layer.name} animation added`);

    const eventObservable = layer.event$.pipe(
      withLatestFrom(trigger$),
      map(([evt, data]) => {
        const cb = layer.eventMap.get(evt.name);
        return [cb, evt, data];
      })
    );
    this.allEventTriggers.push(eventObservable);
    console.log(`${layer.name} event added, ${layer.eventMap.size}`);
  }

  startAnimation() {
    if (this.frameId) {
      console.log('animation already started.');
      return;
    }
    this.animationSubscription = merge(...this.allAnimationTriggers)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        error: (e) => {
          console.log(`animation error: ${e}`);
        },
        complete: () => {
          console.log(`animation completed`);
        },
      });
    console.log('animation start.');
    const animate = () => {
      this.layers.forEach((layer) => layer.animation.animate());
      this.frameId = requestAnimationFrame(animate);
    };
    this.frameId = requestAnimationFrame(animate);
  }

  stopAnimation() {
    if (this.frameId) {
      console.log('animation stop.');
      cancelAnimationFrame(this.frameId);
      this.frameId = null;
    } else {
      console.log('animation not start yet.');
    }
    if (this.animationSubscription) {
      this.animationSubscription.unsubscribe();
      this.animationSubscription = null;
    }
  }

  startDataflow() {
    if (this.dataflowSubscription) {
      console.log('dataflow already started');
      return;
    }
    console.log(`dataflow started: ${this.allDataTriggers}`);
    const dataflowControl$ = this.controlDataflow
      ? this.controlDataflow(this.allDataTriggers)
      : merge(...this.allDataTriggers).pipe(
          catchError((err: unknown, caught) => {
            return of(null);
          })
        );
    this.dataflowSubscription = dataflowControl$
      .pipe(takeUntil(this.destroy$))
      .subscribe();
  }

  stopDataflow() {
    if (this.dataflowSubscription) {
      this.dataflowSubscription.unsubscribe();
      this.dataflowSubscription = null;
    }
  }

  startListenEvent() {
    this.eventSubscription = merge(...this.allEventTriggers)
      .pipe(
        filter(([cb, evt, data]) => {
          return !evt.isStopped();
        }),
        tap(([cb, evt, data]) => {
          if (cb) {
            cb(evt, data);
          }
        })
      )
      .subscribe();
  }

  stopListenEvent() {
    if (this.eventSubscription) {
      this.eventSubscription.unsubscribe();
      this.eventSubscription = null;
    }
  }

  drawVierport(): void {
    const parentElement = this.viewport.nativeElement.parentElement;
    if (!parentElement) {
      return;
    }
    const parentRect = parentElement.getBoundingClientRect();
    if (!parentRect) {
    }
    if (parentRect) {
      this.viewportCtx.clearRect(0, 0, this.viewport.nativeElement.width, this.viewport.nativeElement.height);
    }
    for (const layer of this.layers) {
      this.viewportCtx.drawImage(
        layer.canvas,
        this.translatePos.x,
        this.translatePos.y
      );
    }
    this.viewportCtx.restore();
  }

  reDrawViewport() {
    const parentRect = this.getParentRect();
    if (!parentRect) {
      console.warn('parentRect is null');
      return;
    }
    console.log(this.translatePos.x);
    if (this.translatePos.x >= 0) {
      this.translatePos.x = 0 - parentRect.width + 400;
    } else {
      this.translatePos.x = 0;
    }
    this.drawVierport();
  }

  private getParentRect() {
    const parentElement = this.viewport.nativeElement.parentElement;
    if (!parentElement) {
      return null;
    }
    const parentRect = parentElement.getBoundingClientRect();
    return parentRect;
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.stopDataflow();
    this.stopAnimation();
    this.stopListenEvent();
    this.destroy$.complete();
  }

  //鼠标点击
  onMouseDown(event: MouseEvent) {
    this.isDragging = true;
    this.startDragPos = { x: event.clientX, y: event.clientY };
  }

  //鼠标移动
  onMouseMove(event: MouseEvent) {
    if (this.isDragging) {
      this.viewportCtx.canvas.style.cursor = 'all-scroll';
      const dx = event.clientX - this.startDragPos.x;
      const dy = event.clientY - this.startDragPos.y;
      this.translatePos.x += dx;
      this.translatePos.y += dy;
      this.startDragPos = { x: event.clientX, y: event.clientY };
      this.drawVierport();
    }
    // else if (this.isRightDragging) {}
  }
  //鼠标松开
  onMouseUp(event?: MouseEvent | FocusEvent) {
    if (event && 'button' in event) {
      if (event.button === 0) {
        this.isDragging = false;
        this.viewportCtx.canvas.style.cursor = '';
      } else if (event.button === 2) {
        this.endDragPos = { x: event.clientX, y: event.clientY };
      }
    }
  }

  //获取鼠标位置
  getMousePos(event: MouseEvent) {
    const rect = this.viewport.nativeElement.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  }

  //滚动缩小放大
  onWheel(event: WheelEvent) {
    event.preventDefault(); // 阻止默认滚动行为
    const mousePos = this.getMousePos(event);
    const delta = event.deltaY > 0 ? 0.98 : 1.02; // 缩放因子（滚轮向下缩小，向上放大）
    const newScale = this.scale * delta;
    // 计算新的偏移位置，使得缩放以鼠标为中心
    const worldPos = {
      x: (mousePos.x - this.translatePos.x) / this.scale,
      y: (mousePos.y - this.translatePos.y) / this.scale,
    };
    this.translatePos.x = mousePos.x - worldPos.x * newScale;
    this.translatePos.y = mousePos.y - worldPos.y * newScale;
    this.scale = newScale; // 更新缩放比例
    // 重新计算宽度、高度和坐标
    this.updateViewportSize();
    this.drawVierport();
  }

  @HostListener('dblclick', ['$event'])
  onClick($event: MouseEvent) {
    const cpDbEvent = new CpDbClickEvent(this.getAxis($event));
    this.triggerEvent(cpDbEvent);
  }

  @HostListener('contextmenu', ['$event'])
  onRightClick($event: MouseEvent) {
    $event.preventDefault();
    const cpREvent = new CpRightClickEvent(this.getAxis($event));
    this.triggerEvent(cpREvent);
  }

  @HostListener('mousemove', ['$event'])
  onRightMove($event: MouseEvent) {
    $event.preventDefault();
    const cpRMoveEvent = new CpRightMoveEvent(this.getAxis($event));
    this.triggerEvent(cpRMoveEvent);
  }

  @HostListener('mouseup', ['$event'])
  onRightClickUp($event: MouseEvent) {
    if ($event.button === 2) {
      $event.preventDefault();
      const cpRUpEvent = new CpRightClickUpEvent(this.getAxis($event));
      this.triggerEvent(cpRUpEvent);
    }
  }

  private triggerEvent<T extends CpBaseEvent>(cpEvent: T) {
    for (let i = this.layers.length - 1; i >= 0; i--) {
      const layer = this.layers[i];
      layer.triggerEvent(cpEvent);
    }
  }

  private getAxis(event: MouseEvent) {
    const parentRect =
      this.elRef.nativeElement.parentElement.getBoundingClientRect();
    const scrollTop = this.elRef.nativeElement.parentElement.scrollTop;
    const scrollLeft = this.elRef.nativeElement.parentElement.scrollLeft;
    // 缩放比例和平移量
    const scale = this.scale;
    const translatePos = this.translatePos;
    const axis = {
      x:
        (event.clientX - parentRect.left + scrollLeft - translatePos.x) / scale,
      y: (event.clientY - parentRect.top + scrollTop - translatePos.y) / scale,
    };
    return axis;
  }
}
