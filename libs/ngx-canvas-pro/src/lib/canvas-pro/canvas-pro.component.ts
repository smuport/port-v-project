import {
  AfterViewInit,
  Component,
  ElementRef,
  HostListener,
  Input,
  OnDestroy,
  ViewChild,
} from '@angular/core';
import { Observable } from 'rxjs';

import { Layer } from './layer';
import { SvgLayer } from './svg-layer';
import { BaseLayer } from './base-layer';
import {
  CpBaseEvent,
  CpFrameSelectEvent,
  CpRightClickEvent,
  CpRightClickUpEvent,
  CpRightMoveEvent,
} from './event';
import { ViewportInteractionConfig } from './interaction';
import { InteractionHandler } from './handlers/interaction.handler';
import { RenderHandler } from './handlers/render.handler';
import { DataflowHandler } from './handlers/dataflow.handler';

@Component({
  selector: 'canvas-pro',
  templateUrl: './canvas-pro.component.html',
  styleUrls: ['./canvas-pro.component.css'],
  standalone: true,
  providers: [InteractionHandler, RenderHandler, DataflowHandler],
})
export class CanvasProComponent implements OnDestroy, AfterViewInit {
  layers: BaseLayer[] = []; // 修改为使用 BaseLayer 接口
  @ViewChild('viewport', { static: true })
  viewport!: ElementRef<HTMLCanvasElement>;
  viewportCtx!: CanvasRenderingContext2D;
  
  // 添加 SVG 容器
  svgContainer: HTMLDivElement;

  translatePos = { x: 0, y: 0 };
  // isDragging = false;
  // isRightDragging = false;
  // startDragPos = { x: 0, y: 0 };
  // endDragPos = { x: 0, y: 0 };
  scale = 1;
  rotation = 0;

  @Input() controlDataflow!: (
    dataflowTriggers$: Observable<any>[]
  ) => Observable<any>;

  // 添加交互配置
  @Input() interactionConfig: ViewportInteractionConfig = {
    drag: {
      default: 'pan',
      shift: 'zoom',
      ctrl: 'rotate',
      alt: 'none',
    },
    wheel: {
      default: 'zoom',
      shift: 'pan-horizontal',
      ctrl: 'none',
      alt: 'none',
    },
  };

  constructor(
    private elRef: ElementRef,
    private interactionHandler: InteractionHandler,
    private renderHandler: RenderHandler,
    private dataflowHandler: DataflowHandler
  ) {
    // 创建 SVG 容器
    this.svgContainer = document.createElement('div');
    this.svgContainer.style.position = 'absolute';
    this.svgContainer.style.top = '0';
    this.svgContainer.style.left = '0';
    this.svgContainer.style.width = '100%';
    this.svgContainer.style.height = '100%';
    // 允许 SVG 元素接收指针事件
    this.svgContainer.style.pointerEvents = 'auto';
  }

  ngAfterViewInit(): void {
    this.viewportCtx = this.viewport.nativeElement.getContext(
      '2d'
    ) as CanvasRenderingContext2D;

    // 添加 SVG 容器到 DOM
    this.viewport.nativeElement.parentElement?.appendChild(this.svgContainer);
    
    // 为 SVG 容器添加事件监听，将事件传递给 Canvas
    this.setupSvgEventForwarding();

    // 初始化各个处理器
    this.interactionHandler.initialize(this);
    this.renderHandler.initialize(this);
    this.dataflowHandler.initialize(this);

    this.updateViewportSize();
    this.addEvents();
  }

  // 添加新方法：设置 SVG 事件转发到 Canvas
  private setupSvgEventForwarding(): void {
  // 需要转发的鼠标事件类型
  const eventTypes = [
    'mousedown', 
    'mousemove', 
    'mouseup', 
    'wheel',
    'contextmenu'
  ];
  
  // 为每种事件类型添加监听器
  eventTypes.forEach(eventType => {
    this.svgContainer.addEventListener(eventType, (event: Event) => {
      // 检查事件目标是否为 SVG 元素
      const target = event.target as HTMLElement;
      const isSvgElement = 
                          target.tagName === 'g' || 
                          target.tagName === 'rect' || 
                          target.tagName === 'circle' || 
                          target.tagName === 'path' ||
                          target.tagName === 'polygon' ||
                          target.tagName === 'text';
      
      // 如果点击的是 SVG 元素，不转发事件，让 SVG 元素自己处理
      if (isSvgElement) {
        // 但仍然需要阻止右键菜单
        if (eventType === 'contextmenu') {
          event.preventDefault();
        }
        return;
      }
      
      // 如果点击的是 SVG 容器的空白区域，转发事件到 Canvas
      const canvasEvent = new Event(eventType, {
        bubbles: true,
        cancelable: true,
      });
      
      // 复制鼠标事件的属性
      if (event instanceof MouseEvent) {
        Object.defineProperties(canvasEvent, {
          clientX: { value: event.clientX },
          clientY: { value: event.clientY },
          button: { value: event.button },
          buttons: { value: event.buttons },
          altKey: { value: event.altKey },
          ctrlKey: { value: event.ctrlKey },
          shiftKey: { value: event.shiftKey },
          metaKey: { value: event.metaKey },
        });
      }
      
      // 复制滚轮事件的属性
      if (event instanceof WheelEvent) {
        Object.defineProperties(canvasEvent, {
          deltaX: { value: event.deltaX },
          deltaY: { value: event.deltaY },
          deltaZ: { value: event.deltaZ },
          deltaMode: { value: event.deltaMode },
        });
      }
      
      // 转发事件到 Canvas
      this.viewport.nativeElement.dispatchEvent(canvasEvent);
      
      // 阻止原始事件的默认行为和冒泡
      event.preventDefault();
      event.stopPropagation();
    });
  });
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: Event): void {
    this.updateViewportSize();
    this.drawVierport();
  }

  addEvents(): void {
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
      this.onBlur(event)
    );
    // 添加全局鼠标松开事件监听，处理鼠标在画布外松开的情况
    window.addEventListener('mouseup', (event) => this.onGlobalMouseUp(event));
  }

  updateViewportSize() {
    this.renderHandler.updateViewportSize(this.viewport, this.elRef);
  }
  

  // 修改 addLayer 方法以支持两种类型的 Layer
  addLayer(layer: BaseLayer) {
    if (!layer.isValid()) {
      console.error(`${layer.name} is not valid`);
      return;
    }
    
    // 如果是 SVG Layer，将其 SVG 元素添加到容器中
    if (layer.type === 'svg') {
      const svgLayer = layer as SvgLayer;
      this.svgContainer.appendChild(svgLayer.svgElement);
      
      // 为 SVG 元素设置 pointer-events 属性，确保它可以接收事件
      svgLayer.svgElement.style.pointerEvents = 'auto';
    }
    
    this.layers.push(layer);
    this.dataflowHandler.addLayer(layer);
  }

  // 修改 drawViewport 方法以支持两种类型的 Layer
  drawVierport(): void {
    // 使用 renderHandler 处理 Canvas 绘制
    const canvasLayers: Layer[] = this.layers.filter((layer) => layer instanceof Layer);
    this.renderHandler.drawViewport(
      this.viewport,
      this.viewportCtx,
      canvasLayers,
      this.translatePos,
      this.scale,
      this.rotation
    );
    
    // 更新 SVG Layers 的变换
    for (const layer of this.layers) {
      if (layer.type === 'svg') {
        const svgLayer = layer as SvgLayer;
        const transform = `translate(${this.translatePos.x}px, ${this.translatePos.y}px) scale(${this.scale}) rotate(${this.rotation}rad)`;
        svgLayer.svgElement.style.transform = transform;
      }
    }
  }

  startAnimation() {
    this.dataflowHandler.startAnimation(this.layers);
  }

  stopAnimation() {
    this.dataflowHandler.stopAnimation();
  }

  startDataflow() {
    this.dataflowHandler.startDataflow(this.controlDataflow);
  }

  stopDataflow() {
    this.dataflowHandler.stopDataflow();
  }

  startListenEvent() {
    this.dataflowHandler.startListenEvent();
  }

  stopListenEvent() {
    this.dataflowHandler.stopListenEvent();
  }

  // drawVierport(): void {
  //   this.renderHandler.drawViewport(
  //     this.viewport,
  //     this.viewportCtx,
  //     this.layers,
  //     this.translatePos,
  //     this.scale,
  //     this.rotation
  //   );
  // }

  reDrawViewport() {
    const parentRect = this.getParentRect();
    if (!parentRect) {
      console.warn('parentRect is null');
      return;
    }

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
    // 移除 SVG 容器
    this.svgContainer.remove();
    this.dataflowHandler.destroy();
  }

  // 事件处理方法，现在只是代理到对应的处理器
  onMouseDown(event: MouseEvent) {
    this.interactionHandler.handleMouseDown(event);
    // this.startDragPos = { x: event.clientX, y: event.clientY };
  }

  onMouseMove(event: MouseEvent) {
    this.interactionHandler.handleMouseMove(event, this.interactionConfig);
  }

  // 添加框选相关属性 - 修改为公共属性以便 InteractionHandler 访问
  public frameSelectRect = { x: 0, y: 0, width: 0, height: 0 };
  public isFrameSelecting = false;
  private selectedItems: any[] = [];

  // onMouseUp(event?: MouseEvent | FocusEvent) {
  //   this.interactionHandler.handleMouseUp(event as MouseEvent);
  //   this.isDragging = false;
  // }

   // 添加 blur 事件处理方法
   onBlur(event: FocusEvent): void {
    // 如果正在框选，完成框选
    if (this.isFrameSelecting) {
      this.finishFrameSelect();
    }
    this.onMouseUp(event);
  }

  // 添加全局鼠标松开事件处理
  onGlobalMouseUp(event: MouseEvent): void {
    // 如果鼠标在画布外松开，但仍在框选状态，则完成框选
    if (this.isFrameSelecting) {
      this.finishFrameSelect();
    }
    
    // 重置拖拽状态 - 只通过 interactionHandler 管理
    if (this.interactionHandler.dragState.isDragging) {
      this.interactionHandler.dragState.isDragging = false;
    }
  }

  // 修改 onMouseUp 方法，处理框选完成
  onMouseUp(event?: MouseEvent | FocusEvent) {
    console.log('onMouseUp', this.isFrameSelecting);
    // 如果正在进行框选，完成框选
    if (this.isFrameSelecting) {
      this.finishFrameSelect();
    }
    
    this.interactionHandler.handleMouseUp(event as MouseEvent);
    
    // this.isDragging = false;
  }

  onWheel(event: WheelEvent) {
    this.interactionHandler.handleWheel(event, this.interactionConfig);
  }

  // 交互操作方法，供处理器调用
  handlePan(event: MouseEvent) {
    this.viewportCtx.canvas.style.cursor = 'all-scroll';
    const dx = event.clientX - this.interactionHandler.dragState.startPos.x;
    const dy = event.clientY - this.interactionHandler.dragState.startPos.y;
    
    // 计算新的平移位置
    const newTranslateX = this.translatePos.x + dx;
    const newTranslateY = this.translatePos.y + dy;
    
    // 获取视口尺寸
    const viewportWidth = this.viewport.nativeElement.width;
    const viewportHeight = this.viewport.nativeElement.height;
    
    // 获取所有Layer中最大的尺寸
    let maxLayerWidth = 0;
    let maxLayerHeight = 0;
    
    for (const layer of this.layers) {
      if (layer instanceof Layer) {
        maxLayerWidth = Math.max(maxLayerWidth, layer.w);
        maxLayerHeight = Math.max(maxLayerHeight, layer.h);
      }
    }
    
    // 计算允许的最大平移范围
    // 正方向不能超过0（即不能露出Layer左上方的空白）
    // 负方向不能超过视口尺寸与Layer尺寸的差值（不能露出Layer右下方的空白）
    const minX = Math.min(0, viewportWidth - maxLayerWidth * this.scale);
    const minY = Math.min(0, viewportHeight - maxLayerHeight * this.scale);
    
    // 应用边界限制
    this.translatePos.x = Math.max(minX, Math.min(0, newTranslateX));
    this.translatePos.y = Math.max(minY, Math.min(0, newTranslateY));
    
    this.drawVierport();
  }

  // 滚轮垂直平移处理
  handleWheelPanVertical(event: WheelEvent) {
    // 计算新的平移位置
    const newTranslateY = this.translatePos.y - event.deltaY;
    
    // 获取视口尺寸
    const viewportHeight = this.viewport.nativeElement.height;
    
    // 获取所有Layer中最大的高度
    let maxLayerHeight = 0;
    for (const layer of this.layers) {
      if (layer instanceof Layer) {
        maxLayerHeight = Math.max(maxLayerHeight, layer.h);
      }
    }
    
    // 计算允许的最大垂直平移范围
    const minY = Math.min(0, viewportHeight - maxLayerHeight * this.scale);
    
    // 应用边界限制
    this.translatePos.y = Math.max(minY, Math.min(0, newTranslateY));
    
    this.drawVierport();
  }

  // 滚轮水平平移处理
  handleWheelPanHorizontal(event: WheelEvent) {
    // 计算新的平移位置
    const newTranslateX = this.translatePos.x - event.deltaY;
    
    // 获取视口尺寸
    const viewportWidth = this.viewport.nativeElement.width;
    
    // 获取所有Layer中最大的宽度
    let maxLayerWidth = 0;
    for (const layer of this.layers) {
      if (layer instanceof Layer) {
        maxLayerWidth = Math.max(maxLayerWidth, layer.w);
      }
    }
    
    // 计算允许的最大水平平移范围
    const minX = Math.min(0, viewportWidth - maxLayerWidth * this.scale);
    
    // 应用边界限制
    this.translatePos.x = Math.max(minX, Math.min(0, newTranslateX));
    
    this.drawVierport();
  }

  handleDragZoom(event: MouseEvent) {
    this.viewportCtx.canvas.style.cursor = 'zoom-in';
    const mousePos = this.getMousePos(event);
    const zoomFactor = 1 + this.interactionHandler.dragState.deltaY * 0.005;
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

  handleRotate(event: MouseEvent) {
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
      this.interactionHandler.dragState.startPos.y - centerY,
      this.interactionHandler.dragState.startPos.x - centerX
    );
    const currentAngle = Math.atan2(mousePos.y - centerY, mousePos.x - centerX);

    // 计算角度差值（当前角度 - 起始角度）
    const deltaAngle = currentAngle - startAngle;

    // 更新总旋转角度
    this.rotation += deltaAngle;

    // 重绘画布
    this.drawVierport();
  }

  // 滚轮缩放处理
  handleWheelZoom(event: WheelEvent) {
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

  // 获取鼠标位置
  getMousePos(event: MouseEvent) {
    return this.renderHandler.getMousePos(event, this.viewport);
  }

  // 获取坐标轴位置
  getAxis(event: MouseEvent) {
    return this.renderHandler.getAxis(
      event,
      this.viewport,
      this.elRef,
      this.translatePos,
      this.scale,
      this.rotation
    );
  }

  // // 启用滚轮事件
  // enableWheelEvents(): void {
  //   // 如果已经添加了滚轮事件监听器，则不需要再次添加
  //   this.viewport.nativeElement.addEventListener('wheel', (event) =>
  //     this.onWheel(event)
  //   );
  // }

  // 添加键盘事件监听
  @HostListener('window:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    this.interactionHandler.handleKeyDown(event);
  }

  @HostListener('window:keyup', ['$event'])
  onKeyUp(event: KeyboardEvent): void {
    this.interactionHandler.handleKeyUp(event);
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

  @HostListener('wheel', ['$event'])
  onWheelEvent(event: WheelEvent): void {
    this.onWheel(event);
  }

  triggerEvent<T extends CpBaseEvent>(cpEvent: T) {
    for (let i = this.layers.length - 1; i >= 0; i--) {
      const layer = this.layers[i];
      layer.triggerEvent(cpEvent);
    }
  }

  // 添加处理框选的方法
  handleFrameSelect(event: MouseEvent) {
    console.log('handleFrameSelect');
    this.viewportCtx.canvas.style.cursor = 'crosshair';
    
    if (!this.isFrameSelecting) {
      // 开始框选
      this.isFrameSelecting = true;
      const mousePos = this.getMousePos(event);
      this.frameSelectRect = {
        x: mousePos.x,
        y: mousePos.y,
        width: 0,
        height: 0
      };
    } else {
      // 更新框选区域
      const mousePos = this.getMousePos(event);
      this.frameSelectRect.width = mousePos.x - this.frameSelectRect.x;
      this.frameSelectRect.height = mousePos.y - this.frameSelectRect.y;
    }
    
    // 重绘视图，包括框选矩形
    this.drawVierport();
    this.drawFrameSelectRect();
  }
  
  // 绘制框选矩形
  private drawFrameSelectRect() {
    if (!this.isFrameSelecting) return;
    
    this.viewportCtx.save();
    this.viewportCtx.strokeStyle = 'rgba(0, 123, 255, 0.8)';
    this.viewportCtx.lineWidth = 1;
    this.viewportCtx.setLineDash([5, 3]);
    this.viewportCtx.strokeRect(
      this.frameSelectRect.x,
      this.frameSelectRect.y,
      this.frameSelectRect.width,
      this.frameSelectRect.height
    );
    this.viewportCtx.fillStyle = 'rgba(0, 123, 255, 0.1)';
    this.viewportCtx.fillRect(
      this.frameSelectRect.x,
      this.frameSelectRect.y,
      this.frameSelectRect.width,
      this.frameSelectRect.height
    );
    this.viewportCtx.restore();
  }
  
  // 完成框选
  finishFrameSelect() {
    if (!this.isFrameSelecting) return;
    
    // 标准化选择框（处理负宽度/高度）
    const selection = this.normalizeRect(this.frameSelectRect);
    
    // 检查每个图层中的元素是否在选择框内
    this.selectedItems = [];
    for (const layer of this.layers) {
      if (layer instanceof Layer) {
        const selectedData = layer.checkSelection(selection);
        if (selectedData && selectedData.length > 0) {
          this.selectedItems.push(...selectedData);
        }
      }
    }
    
    // 触发框选事件
    const cpFrameSelectEvent = new CpFrameSelectEvent();
    cpFrameSelectEvent.selection = selection;
    cpFrameSelectEvent.selectedItems = this.selectedItems;
    this.triggerEvent(cpFrameSelectEvent);
    
    // 重置框选状态
    this.isFrameSelecting = false;
    this.frameSelectRect = { x: 0, y: 0, width: 0, height: 0 };
    this.drawVierport();
    
    console.log('框选完成，选中项：', this.selectedItems);
  }
  
  // 标准化矩形（处理负宽度/高度）
  private normalizeRect(rect: { x: number, y: number, width: number, height: number }) {
    const normalized = { x: rect.x, y: rect.y, w: rect.width, h: rect.height };
    
    if (normalized.w < 0) {
      normalized.x += normalized.w;
      normalized.w = Math.abs(normalized.w);
    }
    
    if (normalized.h < 0) {
      normalized.y += normalized.h;
      normalized.h = Math.abs(normalized.h);
    }
    
    return normalized;
  }
  

}
