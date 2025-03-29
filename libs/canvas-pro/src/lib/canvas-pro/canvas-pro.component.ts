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
  CpClickEvent,
  CpDbClickEvent,
  CpRightClickEvent,
  CpRightClickUpEvent,
  CpRightMoveEvent,
} from './event';
import { DragState, ViewportInteractionConfig } from './interaction';

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
  // 在类属性部分添加旋转角度属性
  translatePos = { x: 0, y: 0 };
  isDragging = false;
  isRightDragging = false;
  startDragPos = { x: 0, y: 0 };
  endDragPos = { x: 0, y: 0 };
  scale = 1;
  rotation = 0; // 添加旋转角度属性，单位为弧度
  @Input() controlDataflow!: (
    dataflowTriggers$: Observable<any>[]
  ) => Observable<any>;

  private frameId: number | null = null;
  private dataflowSubscription: Subscription | null = null;
  private animationSubscription: Subscription | null = null;
  private eventSubscription: Subscription | null = null;
  private destroy$ = new Subject<void>();

  // 添加交互配置
  @Input() interactionConfig: ViewportInteractionConfig = {
    drag: {
      default: 'pan',
      shift: 'zoom',
      ctrl: 'rotate',
      alt: 'none'
    },
    wheel: {
      default: 'zoom',
      shift: 'pan-horizontal',
      ctrl: 'none',
      alt: 'none'
    }
  };
  
  // 拖拽状态
  private dragState: DragState = {
    isDragging: false,
    startPos: { x: 0, y: 0 },
    currentPos: { x: 0, y: 0 },
    deltaX: 0,
    deltaY: 0
  };
  
  // 添加点击状态跟踪
  private clickState = {
    startTime: 0,
    startPos: { x: 0, y: 0 },
    isClick: false,
    clickThreshold: 5, // 小于这个像素值被视为点击而非拖拽
    clickTimeThreshold: 300, // 小于这个毫秒值被视为点击而非拖拽
    lastClickTime: 0, // 上次点击的时间
    lastClickPos: { x: 0, y: 0 }, // 上次点击的位置
    doubleClickTimeThreshold: 300, // 双击的时间阈值
    doubleClickDistanceThreshold: 10, // 双击的距离阈值
    clickTimer: null as any // 用于延迟处理单击事件的定时器
  };
  
  // 键盘修饰键状态
  private modifierKeys = {
    shift: false,
    ctrl: false,
    alt: false
  };

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
    
    // 初始化数据流 - 更通用的实现
    let trigger$: Observable<any>;
    // 根据 layer 的数据源类型选择不同的处理方式
    if (layer.dataMode === 'push') {
      // 推送模式：直接使用 layer.dataStream$ 作为数据源
      trigger$ = layer.trigger.pipe(
        tap((data) => {
          layer.animation.update(data);
        }),
        shareReplay({ refCount: true })
      );
    } else if (layer.dataMode === 'pull') {
      // 拉取模式：使用 trigger 触发 dataSource 获取数据
      trigger$ = layer.trigger.pipe(
        exhaustMap(() => layer.dataSource),
        tap((data) => {
          layer.animation.update(data);
        }),
        shareReplay({ refCount: true })
      );
    
    } else {
      // 默认模式：兼容原有实现
      trigger$ = layer.trigger?.pipe(
        exhaustMap(() => layer?.dataSource),
        tap((data) => {
          layer.animation.update(data);
        }),
        shareReplay({ refCount: true })
      );
    }
    
    this.allDataTriggers.push(trigger$);
    
    // 初始化动画流，即渲染流
    const animation$ = layer.animation.onAnimated.asObservable().pipe(
      tap((data) => {
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
    if (parentRect) {
      this.viewportCtx.clearRect(
        0,
        0,
        this.viewport.nativeElement.width,
        this.viewport.nativeElement.height
      );
    }
    
    // 保存当前上下文状态
    this.viewportCtx.save();
    
    // 获取画布中心点
    const canvasWidth = this.viewport.nativeElement.width;
    const canvasHeight = this.viewport.nativeElement.height;
    const centerX = canvasWidth / 2;
    const centerY = canvasHeight / 2;
    
    // 应用变换：先将原点移到画布中心，然后旋转，再缩放，最后平移
    this.viewportCtx.translate(centerX, centerY);
    this.viewportCtx.rotate(this.rotation);
    this.viewportCtx.scale(this.scale, this.scale);
    this.viewportCtx.translate(-centerX + this.translatePos.x, -centerY + this.translatePos.y);
    
    // 绘制所有图层
    for (const layer of this.layers) {
      this.viewportCtx.drawImage(
        layer.canvas,
        0,
        0
      );
    }
    
    // 恢复上下文状态
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

  onMouseDown(event: MouseEvent) {
    this.dragState.isDragging = true;
    this.dragState.startPos = { x: event.clientX, y: event.clientY };
    this.dragState.currentPos = { x: event.clientX, y: event.clientY };
    this.dragState.deltaX = 0;
    this.dragState.deltaY = 0;
    
    // 保存原始起始位置用于其他计算
    this.startDragPos = { x: event.clientX, y: event.clientY };
    
    // 记录点击开始时间和位置
    this.clickState.startTime = Date.now();
    this.clickState.startPos = { x: event.clientX, y: event.clientY };
    this.clickState.isClick = true; // 初始假设这是一个点击
  }

  // 修改鼠标移动事件
  onMouseMove(event: MouseEvent) {
    if (!this.dragState.isDragging) return;
    
    // 更新拖拽状态
    this.dragState.currentPos = { x: event.clientX, y: event.clientY };
    this.dragState.deltaX = event.clientX - this.dragState.startPos.x;
    this.dragState.deltaY = event.clientY - this.dragState.startPos.y;
    
    // 检查移动距离是否超过点击阈值
    const dx = Math.abs(event.clientX - this.clickState.startPos.x);
    const dy = Math.abs(event.clientY - this.clickState.startPos.y);
    if (dx > this.clickState.clickThreshold || dy > this.clickState.clickThreshold) {
      this.clickState.isClick = false; // 移动距离超过阈值，不再视为点击
    }
    
    // 确定当前使用的交互模式
    let interactionMode = this.interactionConfig.drag?.default || 'pan';
    
    if (this.modifierKeys.shift && this.interactionConfig.drag?.shift) {
      interactionMode = this.interactionConfig.drag.shift;
    } else if (this.modifierKeys.ctrl && this.interactionConfig.drag?.ctrl) {
      interactionMode = this.interactionConfig.drag.ctrl;
    } else if (this.modifierKeys.alt && this.interactionConfig.drag?.alt) {
      interactionMode = this.interactionConfig.drag.alt;
    }
    
    // 根据交互模式执行相应操作
    switch (interactionMode) {
      case 'pan':
        this.handlePan(event);
        break;
      case 'zoom':
        this.handleDragZoom(event);
        break;
      case 'rotate':
        this.handleRotate(event);
        break;
      case 'custom':
        if (this.interactionConfig.drag?.customHandler) {
          this.interactionConfig.drag.customHandler(event, this, this.dragState);
        }
        break;
      case 'none':
      default:
        // 不执行任何操作
        break;
    }
    
    // 更新起始位置为当前位置，用于计算下一帧的增量
    this.dragState.startPos = { x: event.clientX, y: event.clientY };
  }

  // 修改鼠标松开事件
  onMouseUp(event?: MouseEvent | FocusEvent) {
    this.dragState.isDragging = false;
    this.isDragging = false;
    
    if (event && 'button' in event) {
      if (event.button === 0) {
        this.viewportCtx.canvas.style.cursor = '';
        
        // 检查是否是点击事件
        if (this.clickState.isClick) {
          const currentTime = Date.now();
          const timeElapsed = currentTime - this.clickState.startTime;
          
          // 如果时间也在阈值内，则可能是点击或双击
          if (timeElapsed < this.clickState.clickTimeThreshold) {
            // 检查是否是双击
            const timeSinceLastClick = currentTime - this.clickState.lastClickTime;
            const dx = Math.abs(event.clientX - this.clickState.lastClickPos.x);
            const dy = Math.abs(event.clientY - this.clickState.lastClickPos.y);
            const isDoubleClick = 
              timeSinceLastClick < this.clickState.doubleClickTimeThreshold && 
              dx < this.clickState.doubleClickDistanceThreshold && 
              dy < this.clickState.doubleClickDistanceThreshold;
            
            if (isDoubleClick) {
              // 如果是双击，清除之前设置的单击定时器
              if (this.clickState.clickTimer) {
                clearTimeout(this.clickState.clickTimer);
                this.clickState.clickTimer = null;
              }
              
              // 处理双击事件
              this.handleDoubleClick(event);
              // 重置最后点击时间，防止连续多次双击
              this.clickState.lastClickTime = 0;
            } else {
              // 存储当前事件对象的副本，用于延迟处理
              const eventCopy = new MouseEvent(event.type, event);
              
              // 延迟处理单击事件，给双击检测留出时间
              this.clickState.clickTimer = setTimeout(() => {
                // 处理单击事件
                this.handleClick(eventCopy);
                this.clickState.clickTimer = null;
              }, this.clickState.doubleClickTimeThreshold);
              
              // 更新最后点击信息
              this.clickState.lastClickTime = currentTime;
              this.clickState.lastClickPos = { x: event.clientX, y: event.clientY };
            }
          }
        }
      } else if (event.button === 2) {
        this.endDragPos = { x: event.clientX, y: event.clientY };
      }
    }
  }
  
  // 处理点击事件
  private handleClick(event: MouseEvent): void {
    console.log('单击事件触发', this.getAxis(event));
    
    // 创建并触发点击事件
    const cpClickEvent = new CpClickEvent(this.getAxis(event));
    this.triggerEvent(cpClickEvent);
  }

  // 处理双击事件
  private handleDoubleClick(event: MouseEvent): void {
    console.log('双击事件触发', this.getAxis(event));
    
    // 创建并触发双击事件
    const cpDbClickEvent = new CpDbClickEvent(this.getAxis(event));
    this.triggerEvent(cpDbClickEvent);
  }

  // 修改滚轮事件
  onWheel(event: WheelEvent) {
    event.preventDefault(); // 阻止默认滚动行为
    
    // 确定当前使用的交互模式
    let interactionMode = this.interactionConfig.wheel?.default || 'zoom';
    
    if (this.modifierKeys.shift && this.interactionConfig.wheel?.shift) {
      interactionMode = this.interactionConfig.wheel.shift;
    } else if (this.modifierKeys.ctrl && this.interactionConfig.wheel?.ctrl) {
      interactionMode = this.interactionConfig.wheel.ctrl;
    } else if (this.modifierKeys.alt && this.interactionConfig.wheel?.alt) {
      interactionMode = this.interactionConfig.wheel.alt;
    }
    
    // 根据交互模式执行相应操作
    switch (interactionMode) {
      case 'zoom':
        this.handleWheelZoom(event);
        break;
      case 'pan-vertical':
        this.handleWheelPanVertical(event);
        break;
      case 'pan-horizontal':
        this.handleWheelPanHorizontal(event);
        break;
      case 'custom':
        if (this.interactionConfig.wheel?.customHandler) {
          this.interactionConfig.wheel.customHandler(event, this);
        }
        break;
      case 'none':
      default:
        // 不执行任何操作
        break;
    }
  }

  // 平移处理
  private handlePan(event: MouseEvent) {
    this.viewportCtx.canvas.style.cursor = 'all-scroll';
    const dx = event.clientX - this.dragState.startPos.x;
    const dy = event.clientY - this.dragState.startPos.y;
    this.translatePos.x += dx;
    this.translatePos.y += dy;
    this.drawVierport();
  }

  // 拖拽缩放处理
  private handleDragZoom(event: MouseEvent) {
    this.viewportCtx.canvas.style.cursor = 'zoom-in';
    const mousePos = this.getMousePos(event);
    const zoomFactor = 1 + this.dragState.deltaY * 0.005;
    const newScale = this.scale * zoomFactor;
    
    // 计算新的偏移位置，使得缩放以鼠标为中心
    const worldPos = {
      x: (mousePos.x - this.translatePos.x) / this.scale,
      y: (mousePos.y - this.translatePos.y) / this.scale,
    };
    this.translatePos.x = mousePos.x - worldPos.x * newScale;
    this.translatePos.y = mousePos.y - worldPos.y * newScale;
    this.scale = newScale;
    
    this.drawVierport();
  }

  // 旋转处理
  private handleRotate(event: MouseEvent) {
    this.viewportCtx.canvas.style.cursor = 'grabbing';
    
    // 获取画布中心点
    const canvasWidth = this.viewport.nativeElement.width;
    const canvasHeight = this.viewport.nativeElement.height;
    const centerX = canvasWidth / 2;
    const centerY = canvasHeight / 2;
    
    // 获取鼠标当前位置
    const mousePos = this.getMousePos(event);
    
    // 计算鼠标相对于画布中心的角度
    const startAngle = Math.atan2(
      this.dragState.startPos.y - centerY,
      this.dragState.startPos.x - centerX
    );
    const currentAngle = Math.atan2(
      mousePos.y - centerY,
      mousePos.x - centerX
    );
    
    // 计算角度差值（当前角度 - 起始角度）
    const deltaAngle = currentAngle - startAngle;
    
    // 更新总旋转角度
    this.rotation += deltaAngle;
    
    // 重绘画布
    this.drawVierport();
  }

  // 滚轮缩放处理
  private handleWheelZoom(event: WheelEvent) {
    const mousePos = this.getMousePos(event);
    const delta = event.deltaY > 0 ? 0.98 : 1.02; // 缩放因子
    const newScale = this.scale * delta;
    
    // 计算新的偏移位置，使得缩放以鼠标为中心
    const worldPos = {
      x: (mousePos.x - this.translatePos.x) / this.scale,
      y: (mousePos.y - this.translatePos.y) / this.scale,
    };
    this.translatePos.x = mousePos.x - worldPos.x * newScale;
    this.translatePos.y = mousePos.y - worldPos.y * newScale;
    this.scale = newScale;
    
    this.updateViewportSize();
    this.drawVierport();
  }

  // 滚轮垂直平移处理
  private handleWheelPanVertical(event: WheelEvent) {
    this.translatePos.y -= event.deltaY;
    this.drawVierport();
  }

  // 滚轮水平平移处理
  private handleWheelPanHorizontal(event: WheelEvent) {
    this.translatePos.x -= event.deltaY;
    this.drawVierport();
  }

  // 启用滚轮事件
  enableWheelEvents() {
    this.viewport.nativeElement.addEventListener('wheel', (event) => this.onWheel(event));
  }


  // //鼠标点击
  // onMouseDown(event: MouseEvent) {
  //   this.isDragging = true;
  //   this.startDragPos = { x: event.clientX, y: event.clientY };
  // }

  // //鼠标移动
  // onMouseMove(event: MouseEvent) {
  //   if (this.isDragging) {
  //     this.viewportCtx.canvas.style.cursor = 'all-scroll';
  //     const dx = event.clientX - this.startDragPos.x;
  //     const dy = event.clientY - this.startDragPos.y;
  //     this.translatePos.x += dx;
  //     this.translatePos.y += dy;
  //     this.startDragPos = { x: event.clientX, y: event.clientY };
  //     this.drawVierport();
  //   }
  //   // else if (this.isRightDragging) {}
  // }
  // //鼠标松开
  // onMouseUp(event?: MouseEvent | FocusEvent) {
  //   if (event && 'button' in event) {
  //     if (event.button === 0) {
  //       this.isDragging = false;
  //       this.viewportCtx.canvas.style.cursor = '';
  //     } else if (event.button === 2) {
  //       this.endDragPos = { x: event.clientX, y: event.clientY };
  //     }
  //   }
  // }
  
  // //滚动缩小放大
  // onWheel(event: WheelEvent) {
  //   event.preventDefault(); // 阻止默认滚动行为
  //   const mousePos = this.getMousePos(event);
  //   const delta = event.deltaY > 0 ? 0.98 : 1.02; // 缩放因子（滚轮向下缩小，向上放大）
  //   const newScale = this.scale * delta;
  //   // 计算新的偏移位置，使得缩放以鼠标为中心
  //   const worldPos = {
  //     x: (mousePos.x - this.translatePos.x) / this.scale,
  //     y: (mousePos.y - this.translatePos.y) / this.scale,
  //   };
  //   this.translatePos.x = mousePos.x - worldPos.x * newScale;
  //   this.translatePos.y = mousePos.y - worldPos.y * newScale;
  //   this.scale = newScale; // 更新缩放比例
  //   // 重新计算宽度、高度和坐标
  //   this.updateViewportSize();
  //   this.drawVierport();
  // }

  //获取鼠标位置
  getMousePos(event: MouseEvent) {
    const rect = this.viewport.nativeElement.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  }


  // 添加键盘事件监听
  @HostListener('window:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Shift') this.modifierKeys.shift = true;
    if (event.key === 'Control' || event.key === 'Meta') this.modifierKeys.ctrl = true;
    if (event.key === 'Alt') this.modifierKeys.alt = true;
  }

  @HostListener('window:keyup', ['$event'])
  onKeyUp(event: KeyboardEvent): void {
    if (event.key === 'Shift') this.modifierKeys.shift = false;
    if (event.key === 'Control' || event.key === 'Meta') this.modifierKeys.ctrl = false;
    if (event.key === 'Alt') this.modifierKeys.alt = false;
  }

  // @HostListener('dblclick', ['$event'])
  // onClick($event: MouseEvent) {
  //   const cpDbEvent = new CpDbClickEvent(this.getAxis($event));
  //   this.triggerEvent(cpDbEvent);
  // }

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

  getAxis(event: MouseEvent) {
    const parentRect =
      this.elRef.nativeElement.parentElement.getBoundingClientRect();
    const scrollTop = this.elRef.nativeElement.parentElement.scrollTop;
    const scrollLeft = this.elRef.nativeElement.parentElement.scrollLeft;
    
    // 获取鼠标在画布上的位置
    const mousePos = this.getMousePos(event);
    
    // 获取画布中心点
    const canvasWidth = this.viewport.nativeElement.width;
    const canvasHeight = this.viewport.nativeElement.height;
    const centerX = canvasWidth / 2;
    const centerY = canvasHeight / 2;
    
    // 将鼠标坐标转换为相对于画布中心的坐标
    const relativeX = mousePos.x - centerX;
    const relativeY = mousePos.y - centerY;
    
    // 应用旋转的逆变换（逆时针旋转相同角度）
    const cosTheta = Math.cos(-this.rotation);
    const sinTheta = Math.sin(-this.rotation);
    const rotatedX = relativeX * cosTheta - relativeY * sinTheta;
    const rotatedY = relativeX * sinTheta + relativeY * cosTheta;
    
    // 应用缩放的逆变换
    const scaledX = rotatedX / this.scale;
    const scaledY = rotatedY / this.scale;
    
    // 应用平移的逆变换，并转换回相对于画布左上角的坐标
    const axis = {
      x: scaledX + centerX - this.translatePos.x,
      y: scaledY + centerY - this.translatePos.y
    };
    
    return axis;
  }
}
