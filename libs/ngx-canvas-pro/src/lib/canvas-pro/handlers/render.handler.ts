import { Injectable, ElementRef } from '@angular/core';
import { Layer } from '../layer';
import { BaseLayer } from '../base-layer';
import { ViewportService } from '../services/viewport.service';
import { TransformService } from '../services/transform.service';

@Injectable()
export class RenderHandler {
  private component: any;

  constructor(
    private viewportService: ViewportService,
    private transformService: TransformService
  ) {}

  initialize(component: any) {
    this.component = component;
  }

  // fitParent(viewport: ElementRef<HTMLCanvasElement>,
  //   parent: HTMLElement | null) {
  //     // 委托给 ViewportService 处理
  //     this.viewportService.fitParent();
  //   }

  // // 更新视口大小
  // updateViewportSize(
  //   w: number, h: number
  // ) {
  //   // 委托给 ViewportService 处理
  //   this.viewportService.updateViewportSize(w, h);
  // }

  // 绘制视口
  drawViewport(
    viewport: ElementRef<HTMLCanvasElement>,
    viewportCtx: CanvasRenderingContext2D,
    layers: Layer[],
    translatePos: { x: number; y: number },
    scale: number,
    rotation: number
  ): void {
    // 委托给 ViewportService 处理
    this.viewportService.drawViewport();
  }

  // // 获取SVG变换矩阵 - 这个方法可以移到 ViewportService 中
  // getSvgTransform(
  //   translatePos: { x: number; y: number },
  //   scale: number,
  //   rotation: number,
  //   canvasWidth: number,
  //   canvasHeight: number
  // ): string {
  //   // 获取画布中心点
  //   const centerX = canvasWidth / 2;
  //   const centerY = canvasHeight / 2;
    
  //   // 计算旋转角度（从弧度转为度）
  //   const rotationDeg = (rotation * 180) / Math.PI;
    
  //   // 构建SVG变换字符串
  //   // 注意：SVG变换的顺序与Canvas相反，最先应用的变换写在最右边
  //   return `translate(${centerX}px, ${centerY}px) ` +
  //          `rotate(${rotationDeg}deg) ` +
  //          `scale(${scale}) ` +
  //          `translate(${-centerX + translatePos.x}px, ${-centerY + translatePos.y}px)`;
  // }

  // // 获取鼠标位置
  // getMousePos(event: MouseEvent, viewport: ElementRef<HTMLCanvasElement>) {
  //   // 委托给 ViewportService 处理
  //   return this.viewportService.getMousePos(event);
  // }

  // // 获取坐标轴位置
  // getAxis(
  //   event: MouseEvent,
  //   viewport: ElementRef<HTMLCanvasElement>,
  //   elRef: ElementRef,
  //   translatePos: { x: number; y: number },
  //   scale: number,
  //   rotation: number
  // ) {
  //   // 获取鼠标在画布上的位置
  //   const mousePos = this.viewportService.getMousePos(event);
    
  //   // 委托给 ViewportService 处理坐标转换
  //   return this.viewportService.getAxis(mousePos);
  // }
}
