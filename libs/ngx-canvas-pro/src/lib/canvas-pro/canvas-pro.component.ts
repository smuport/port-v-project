import {
  AfterViewInit,
  Component,
  ElementRef,
  HostListener,
  Input,
  OnDestroy,
  Renderer2,
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
// import { RenderHandler } from './handlers/render.handler';
import { DataflowHandler } from './handlers/dataflow.handler';

// 导入服务
import { SvgContainerService } from './services/svg-container.service';
import { EventManagerService } from './services/event-manager.service';
import { FrameSelectService } from './services/frame-select.service';
import { TransformService } from './services/transform.service';
import { ViewportService } from './services/viewport.service';

@Component({
  selector: 'canvas-pro',
  templateUrl: './canvas-pro.component.html',
  styleUrls: ['./canvas-pro.component.css'],
  standalone: true,
  providers: [
    InteractionHandler,
    // RenderHandler,
    DataflowHandler,
    SvgContainerService,
    EventManagerService,
    FrameSelectService,
    TransformService,
    ViewportService,
  ],
})
export class CanvasProComponent implements OnDestroy, AfterViewInit {
  layers: BaseLayer[] = [];
  @ViewChild('canvasViewport', { static: true })
  viewport!: ElementRef<HTMLCanvasElement>;
  viewportCtx!: CanvasRenderingContext2D;

  @Input() controlDataflow!: (
    dataflowTriggers$: Observable<any>[]
  ) => Observable<any>;

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
    private interactionHandler: InteractionHandler,
    // private renderHandler: RenderHandler,
    private dataflowHandler: DataflowHandler,
    private svgContainerService: SvgContainerService,
    private eventManagerService: EventManagerService,
    private frameSelectService: FrameSelectService,
    private transformService: TransformService,
    private viewportService: ViewportService
  ) {}

  ngAfterViewInit(): void {
    this.viewportCtx = this.viewport.nativeElement.getContext(
      '2d'
    ) as CanvasRenderingContext2D;

    // 添加 SVG 容器到 DOM
    this.svgContainerService.attachToParent(
      this.viewport.nativeElement.parentElement!
    );

    // 为 SVG 容器添加事件监听，将事件传递给 Canvas
    this.svgContainerService.setupEventForwarding(this.viewport.nativeElement);

    // 初始化视口服务
    this.viewportService.initialize(
      this.viewport,
      this.viewportCtx,
      this.svgContainerService.getContainer()
    );
    this.viewportService.setLayers(this.layers);

    // 初始化各个处理器
    this.interactionHandler.initialize(this);
    // this.renderHandler.initialize(this);
    this.dataflowHandler.initialize(this);
    this.fitViewportToParent();
    this.setupEvents();
  }

  fitViewportToParent() {
    this.viewportService.fitToParent();
  }

  setupEvents(): void {
    // 设置 Canvas 事件
    this.eventManagerService.setupCanvasEvents(this.viewport.nativeElement, {
      onMouseDown: (event) => this.onMouseDown(event),
      onMouseMove: (event) => this.onMouseMove(event),
      onMouseUp: (event) => this.onMouseUp(event),
      onBlur: (event) => this.onBlur(event),
      onWheel: (event) => this.onWheel(event),
    });

    // 设置全局事件
    this.eventManagerService.setupGlobalEvents({
      onGlobalMouseUp: (event) => this.onGlobalMouseUp(event),
    });
  }

  // updateViewportSize(w: number, h: number) {
  //   // 同时更新canvas和svg的视口
  //   this.renderHandler.updateViewportSize(w, h);
  //   this.svgContainerService.updateViewportSize(w, h);
  // }
  // 使用视口服务更新视口大小
  updateViewportSize(w: number, h: number) {
    this.viewportService.updateViewportSize(w, h);
  }

  addLayer(layer: BaseLayer) {
    if (!layer.isValid()) {
      console.error(`${layer.name} is not valid`);
      return;
    }

    // 如果是 SVG Layer，将其 SVG 元素添加到容器中
    // if (layer.type === 'svg') {
    //   this.svgContainerService.addSvgLayer(layer as SvgLayer);
    // }

    this.layers.push(layer);
    this.dataflowHandler.addLayer(layer);
  }

  // drawVierport(): void {
  //   // 使用 renderHandler 处理 Canvas 绘制
  //   const canvasLayers: Layer[] = this.layers.filter((layer) => layer instanceof Layer);
  //   this.renderHandler.drawViewport(
  //     this.viewport,
  //     this.viewportCtx,
  //     canvasLayers,
  //     this.transformService.translatePos,
  //     this.transformService.scale,
  //     this.transformService.rotation
  //   );

  //   // 更新 SVG Layers 的变换
  //   this.svgContainerService.updateTransform(
  //     this.transformService.translatePos.x,
  //     this.transformService.translatePos.y,
  //     this.transformService.scale,
  //     this.transformService.rotation
  //   );

  //   // 绘制框选矩形
  //   this.frameSelectService.drawFrameSelectRect(this.viewportCtx);
  // }

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

  private getParentElement() {
    const parentElement = this.viewport.nativeElement.parentElement;
    if (!parentElement) {
      return null;
    }
    return parentElement;
  }

  ngOnDestroy() {
    // 清理各个服务
    this.eventManagerService.destroy();
    this.svgContainerService.destroy();
    this.dataflowHandler.destroy();
  }

  // 事件处理方法
  onMouseDown(event: MouseEvent) {
    this.interactionHandler.handleMouseDown(event);
  }

  onMouseMove(event: MouseEvent) {
    this.interactionHandler.handleMouseMove(event, this.interactionConfig);
  }

  onBlur(event: FocusEvent): void {
    // 如果正在框选，完成框选
    // this.finishFrameSelect();
    // this.onMouseUp(event);
  }

  onGlobalMouseUp(event: MouseEvent): void {
    // 如果鼠标在画布外松开，但仍在框选状态，则完成框选
    this.finishFrameSelect(event);
    // 重置拖拽状态
    if (this.interactionHandler.dragState.isDragging) {
      this.interactionHandler.dragState.isDragging = false;
    }
  }

  onMouseUp(event: MouseEvent) {
    // 如果正在进行框选，完成框选
    if (this.frameSelectService.isFrameSelecting) {
      const selectEvent = this.frameSelectService.finishFrameSelect(
        this.layers,
        event
        // this.layers.filter(layer => layer instanceof Layer) as Layer[]
      );
      if (selectEvent) {
        this.triggerEvent(selectEvent);
      }
    }

    this.interactionHandler.handleMouseUp(event as MouseEvent);
  }

  onWheel(event: WheelEvent) {
    this.interactionHandler.handleWheel(event, this.interactionConfig);
  }

  // 交互操作方法，供处理器调用
  handlePan(event: MouseEvent, startPos: { x: number; y: number }) {
    const viewportSize = this.viewportService.getViewportSize();
    this.transformService.handlePan(
      event,
      startPos,
      viewportSize.width,
      viewportSize.height,
      this.layers
    );
    this.drawVierport();
  }

  // 在handleWheelPanVertical方法中
  handleWheelPanVertical(event: WheelEvent) {
    const viewportSize = this.viewportService.getViewportSize();
    this.transformService.handleWheelPanVertical(
      event,
      viewportSize.height,
      this.layers
    );
    this.drawVierport();
  }

  // 在handleWheelPanHorizontal方法中
  handleWheelPanHorizontal(event: WheelEvent) {
    const viewportSize = this.viewportService.getViewportSize();
    this.transformService.handleWheelPanHorizontal(
      event,
      viewportSize.width,
      this.layers
    );
    this.drawVierport();
  }

  // 在handleRotate方法中
  handleRotate(event: MouseEvent, startPos: { x: number; y: number }) {
    this.viewportCtx.canvas.style.cursor = 'grabbing';
    const mousePos = this.viewportService.getMousePos(event);
    const viewportSize = this.viewportService.getViewportSize();
    this.transformService.handleRotate(
      startPos,
      mousePos,
      viewportSize.width / 2,
      viewportSize.height / 2
    );
    this.drawVierport();
  }

  // // 在drawVierport方法中
  // drawVierport(): void {
  //   this.viewportService.drawViewport();
  //   this.frameSelectService.drawFrameSelectRect(this.viewportCtx);
  // }

  handleDragZoom(event: MouseEvent) {
    this.viewportCtx.canvas.style.cursor = 'zoom-in';
    this.transformService.handleDragZoom(
      this.interactionHandler.dragState.deltaY,
      this.getMousePos(event)
    );
    this.drawVierport();
  }

  // handleRotate(event: MouseEvent) {
  //   this.viewportCtx.canvas.style.cursor = 'grabbing';
  //   this.transformService.handleRotate(
  //     event,
  //     this.interactionHandler.dragState.startPos,
  //     this.getMousePos(event),
  //     this.viewport.nativeElement
  //   );
  //   this.drawVierport();
  // }

  handleWheelZoom(event: WheelEvent) {
    this.transformService.handleWheelZoom(event, this.getMousePos(event));
    this.drawVierport();
  }

  // 使用视口服务绘制视口
  drawVierport(): void {
    // 绘制视口
    this.viewportService.drawViewport();

    // 绘制框选矩形
    this.frameSelectService.drawFrameSelectRect(this.viewportCtx);
  }

  // 使用视口服务获取鼠标位置
  getMousePos(event: MouseEvent) {
    return this.viewportService.getMousePos(event);
  }

  // 使用视口服务获取坐标轴位置
  getAxis(event: MouseEvent) {
    const mousePos = this.viewportService.getMousePos(event);
    return this.viewportService.getAxis(mousePos);
  }

  // // 获取鼠标位置
  // getMousePos(event: MouseEvent) {
  //   return this.renderHandler.getMousePos(event, this.viewport);
  // }

  // // 获取坐标轴位置
  // getAxis(event: MouseEvent) {
  //   return this.renderHandler.getAxis(
  //     event,
  //     this.viewport,
  //     this.elRef,
  //     this.transformService.translatePos,
  //     this.transformService.scale,
  //     this.transformService.rotation
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

  triggerEvent<T extends CpBaseEvent>(cpEvent: T) {
    for (let i = this.layers.length - 1; i >= 0; i--) {
      const layer = this.layers[i];
      layer.triggerEvent(cpEvent);
    }
  }

  // 添加处理框选的方法
  handleFrameSelect(event: MouseEvent) {
    this.viewportCtx.canvas.style.cursor = 'crosshair';

    if (!this.frameSelectService.isFrameSelecting) {
      // 开始框选
      const mousePos = this.getMousePos(event);
      this.frameSelectService.startFrameSelect(mousePos);
    } else {
      // 更新框选区域
      const mousePos = this.getMousePos(event);
      this.frameSelectService.updateFrameSelect(mousePos);
    }

    // 重绘视图
    this.drawVierport();
  }
  // 添加代理方法，供 InteractionHandler 调用
  finishFrameSelect(event: MouseEvent): void {
    if (this.frameSelectService.isFrameSelecting) {
      const selectEvent = this.frameSelectService.finishFrameSelect(
        // this.layers.filter(layer => layer instanceof Layer) as Layer[]
        this.layers,
        event
      );
      if (selectEvent) {
        this.triggerEvent(selectEvent);
      }
    }
    this.drawVierport();
  }
}
