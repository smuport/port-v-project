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
  isDragging = false;
  isRightDragging = false;
  startDragPos = { x: 0, y: 0 };
  endDragPos = { x: 0, y: 0 };
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
    this.svgContainer.style.pointerEvents = 'none';
  }

  ngAfterViewInit(): void {
    this.viewportCtx = this.viewport.nativeElement.getContext(
      '2d'
    ) as CanvasRenderingContext2D;

    // 添加 SVG 容器到 DOM
    this.viewport.nativeElement.parentElement?.appendChild(this.svgContainer);

    // 初始化各个处理器
    this.interactionHandler.initialize(this);
    this.renderHandler.initialize(this);
    this.dataflowHandler.initialize(this);

    this.updateViewportSize();
    this.addEvents();
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
      this.onMouseUp(event)
    );
    // 添加滚轮事件监听
    this.viewport.nativeElement.addEventListener('wheel', (event) =>
      this.onWheel(event)
    );
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
    this.startDragPos = { x: event.clientX, y: event.clientY };
  }

  onMouseMove(event: MouseEvent) {
    this.interactionHandler.handleMouseMove(event, this.interactionConfig);
  }

  onMouseUp(event?: MouseEvent | FocusEvent) {
    this.interactionHandler.handleMouseUp(event as MouseEvent);
    this.isDragging = false;
  }

  onWheel(event: WheelEvent) {
    this.interactionHandler.handleWheel(event, this.interactionConfig);
  }

  // 交互操作方法，供处理器调用
  handlePan(event: MouseEvent) {
    this.viewportCtx.canvas.style.cursor = 'all-scroll';
    const dx = event.clientX - this.interactionHandler.dragState.startPos.x;
    const dy = event.clientY - this.interactionHandler.dragState.startPos.y;
    this.translatePos.x += dx;
    this.translatePos.y += dy;
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

  // 滚轮垂直平移处理
  handleWheelPanVertical(event: WheelEvent) {
    this.translatePos.y -= event.deltaY;
    this.drawVierport();
  }

  // 滚轮水平平移处理
  handleWheelPanHorizontal(event: WheelEvent) {
    this.translatePos.x -= event.deltaY;
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

  triggerEvent<T extends CpBaseEvent>(cpEvent: T) {
    for (let i = this.layers.length - 1; i >= 0; i--) {
      const layer = this.layers[i];
      layer.triggerEvent(cpEvent);
    }
  }
}
