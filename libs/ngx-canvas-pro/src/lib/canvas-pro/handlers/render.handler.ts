import { Injectable, ElementRef } from '@angular/core';
import { Layer } from '../layer';
import { BaseLayer } from '../base-layer';

@Injectable()
export class RenderHandler {
  private component: any;

  constructor() {}

  initialize(component: any) {
    this.component = component;
  }

  fitParent(viewport: ElementRef<HTMLCanvasElement>,
    parent: HTMLElement | null) {
      if (!parent) {
        return;
      }
      const parentRect =
      parent.getBoundingClientRect();
      viewport.nativeElement.width = parentRect.width;
      viewport.nativeElement.height = parentRect.height;
    }

  // 更新视口大小
  updateViewportSize(
    w: number, h: number
  ) {
    this.component.viewport.nativeElement.width = w;
    this.component.viewport.nativeElement.height = h;
  }

  // 绘制视口
  drawViewport(
    viewport: ElementRef<HTMLCanvasElement>,
    viewportCtx: CanvasRenderingContext2D,
    layers: Layer[],
    translatePos: { x: number; y: number },
    scale: number,
    rotation: number
  ): void {
    const parentElement = viewport.nativeElement.parentElement;
    if (!parentElement) {
      return;
    }

    const parentRect = parentElement.getBoundingClientRect();
    if (parentRect) {
      viewportCtx.clearRect(
        0,
        0,
        viewport.nativeElement.width,
        viewport.nativeElement.height
      );
    }

    // 保存当前上下文状态
    viewportCtx.save();

    // 获取画布中心点
    const canvasWidth = viewport.nativeElement.width;
    const canvasHeight = viewport.nativeElement.height;
    const centerX = canvasWidth / 2;
    const centerY = canvasHeight / 2;

    // 应用变换：先将原点移到画布中心，然后旋转，再缩放，最后平移
    viewportCtx.translate(centerX, centerY);
    viewportCtx.rotate(rotation);
    viewportCtx.scale(scale, scale);
    viewportCtx.translate(-centerX + translatePos.x, -centerY + translatePos.y);

    // 绘制所有图层
    for (const layer of layers) {
      viewportCtx.drawImage(layer.canvas, 0, 0);
    }

    // 恢复上下文状态
    viewportCtx.restore();
  }

  // 获取SVG变换矩阵
  getSvgTransform(
    translatePos: { x: number; y: number },
    scale: number,
    rotation: number,
    canvasWidth: number,
    canvasHeight: number
  ): string {
    // 获取画布中心点
    const centerX = canvasWidth / 2;
    const centerY = canvasHeight / 2;
    
    // 计算旋转角度（从弧度转为度）
    const rotationDeg = (rotation * 180) / Math.PI;
    
    // 构建SVG变换字符串
    // 注意：SVG变换的顺序与Canvas相反，最先应用的变换写在最右边
    return `translate(${centerX}px, ${centerY}px) ` +
           `rotate(${rotationDeg}deg) ` +
           `scale(${scale}) ` +
           `translate(${-centerX + translatePos.x}px, ${-centerY + translatePos.y}px)`;
  }

  // 获取鼠标位置
  getMousePos(event: MouseEvent, viewport: ElementRef<HTMLCanvasElement>) {
    const rect = viewport.nativeElement.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  }

  // 获取坐标轴位置
  getAxis(
    event: MouseEvent,
    viewport: ElementRef<HTMLCanvasElement>,
    elRef: ElementRef,
    translatePos: { x: number; y: number },
    scale: number,
    rotation: number
  ) {
    // 获取鼠标在画布上的位置
    const mousePos = this.getMousePos(event, viewport);

    // 获取画布中心点
    const canvasWidth = viewport.nativeElement.width;
    const canvasHeight = viewport.nativeElement.height;
    const centerX = canvasWidth / 2;
    const centerY = canvasHeight / 2;

    // 将鼠标坐标转换为相对于画布中心的坐标
    const relativeX = mousePos.x - centerX;
    const relativeY = mousePos.y - centerY;

    // 应用旋转的逆变换（逆时针旋转相同角度）
    const cosTheta = Math.cos(-rotation);
    const sinTheta = Math.sin(-rotation);
    const rotatedX = relativeX * cosTheta - relativeY * sinTheta;
    const rotatedY = relativeX * sinTheta + relativeY * cosTheta;

    // 应用缩放的逆变换
    const scaledX = rotatedX / scale;
    const scaledY = rotatedY / scale;

    // 应用平移的逆变换，并转换回相对于画布左上角的坐标
    const axis = {
      x: scaledX + centerX - translatePos.x,
      y: scaledY + centerY - translatePos.y,
    };

    return axis;
  }
}
