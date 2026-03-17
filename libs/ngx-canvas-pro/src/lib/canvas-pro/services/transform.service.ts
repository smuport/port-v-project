import { Injectable } from '@angular/core';
import { Layer } from '../layer';
import { BaseLayer } from '../base-layer';

@Injectable()
export class TransformService {
  // 保留变换状态变量
  public translatePos = { x: 0, y: 0 };
  public scale = 1;
  public rotation = 0;

  updateTranslate(x: number, y:number) {
    this.translatePos.x = x;
    this.translatePos.y = y;
  }

  // 其他方法需要修改，使用ViewportService获取视口信息
  handlePan(
    event: MouseEvent,
    startPos: { x: number; y: number },
    viewportWidth: number,
    viewportHeight: number,
    layers: BaseLayer[]
  ): void {
    const dx = event.clientX - startPos.x;
    const dy = event.clientY - startPos.y;

    const newTranslateX = this.translatePos.x + dx / this.scale;
    const newTranslateY = this.translatePos.y + dy / this.scale;

    this.translatePos.x = newTranslateX;
    this.translatePos.y = newTranslateY;
  }

  handleWheelPanVertical(
    event: WheelEvent,
    viewportHeight: number,
    layers: BaseLayer[]
  ): void {
    // 计算新的平移位置
    const newTranslateY = this.translatePos.y - event.deltaY;

    // 获取所有Layer中最大的高度
    let maxLayerHeight = 0;
    for (const layer of layers) {
      if (layer instanceof Layer) {
        maxLayerHeight = Math.max(maxLayerHeight, layer.h);
      }
    }

    // 计算允许的最大垂直平移范围
    const minY = Math.min(0, viewportHeight - maxLayerHeight * this.scale);

    // 应用边界限制
    this.translatePos.y = Math.max(minY, Math.min(0, newTranslateY));
  }

  handleWheelPanHorizontal(
    event: WheelEvent,
    viewportWidth: number,
    layers: BaseLayer[]
  ): void {
    // 计算新的平移位置
    const newTranslateX = this.translatePos.x - event.deltaY;

    // 获取所有Layer中最大的宽度
    let maxLayerWidth = 0;
    for (const layer of layers) {
      if (layer instanceof Layer) {
        maxLayerWidth = Math.max(maxLayerWidth, layer.w);
      }
    }

    // 计算允许的最大水平平移范围
    const minX = Math.min(0, viewportWidth - maxLayerWidth * this.scale);

    // 应用边界限制
    this.translatePos.x = Math.max(minX, Math.min(0, newTranslateX));
  }

  handleDragZoom(
    deltaY: number,
    mousePos: { x: number; y: number },
    centerX: number,
    centerY: number
  ): void {
    const zoomFactor = 1 + deltaY * 0.005;
    const newScale = this.scale * zoomFactor;
    const rotation = this.rotation;

    const cosTheta = Math.cos(-rotation);
    const sinTheta = Math.sin(-rotation);

    // 鼠标相对中心坐标并做逆旋转
    const relX = mousePos.x - centerX;
    const relY = mousePos.y - centerY;
    const rotatedX = relX * cosTheta - relY * sinTheta;
    const rotatedY = relX * sinTheta + relY * cosTheta;

    // 当前世界坐标（鼠标下的点），按现有变换逆推
    const worldX = rotatedX / this.scale + centerX - this.translatePos.x;
    const worldY = rotatedY / this.scale + centerY - this.translatePos.y;

    // 计算新的平移，使该世界点在新缩放下仍位于鼠标位置
    this.translatePos.x = rotatedX / newScale - (worldX - centerX);
    this.translatePos.y = rotatedY / newScale - (worldY - centerY);
    this.scale = newScale;
  }

  handleRotate(
    startPos: { x: number; y: number },
    mousePos: { x: number; y: number },
    centerX: number,
    centerY: number
  ): void {
    // 计算鼠标相对于画布中心的角度
    const startAngle = Math.atan2(startPos.y - centerY, startPos.x - centerX);
    const currentAngle = Math.atan2(mousePos.y - centerY, mousePos.x - centerX);

    // 计算角度差值（当前角度 - 起始角度）
    const deltaAngle = currentAngle - startAngle;

    // 添加旋转速度因子，减慢旋转速度
    const rotationSpeedFactor = 0.1; // 可以根据需要调整这个值，值越小旋转越慢

    // 更新总旋转角度
    this.rotation += deltaAngle * rotationSpeedFactor;
  }

 handleWheelZoom(
    event: WheelEvent,
    mousePos: { x: number; y: number },
    centerX: number,
    centerY: number
  ): void {
    const delta = event.deltaY > 0 ? 0.85 : 1.15;
    const newScale = this.scale * delta;
    const rotation = this.rotation;

    const cosTheta = Math.cos(-rotation);
    const sinTheta = Math.sin(-rotation);

    const relX = mousePos.x - centerX;
    const relY = mousePos.y - centerY;
    const rotatedX = relX * cosTheta - relY * sinTheta;
    const rotatedY = relX * sinTheta + relY * cosTheta;

    const worldX = rotatedX / this.scale + centerX - this.translatePos.x;
    const worldY = rotatedY / this.scale + centerY - this.translatePos.y;

    this.translatePos.x = rotatedX / newScale - (worldX - centerX);
    this.translatePos.y = rotatedY / newScale - (worldY - centerY);
    this.scale = newScale;
  }

  // 重置变换状态
  resetTransform() {
    this.translatePos = { x: 0, y: 0 };
    this.scale = 1;
    this.rotation = 0;
  }
}
