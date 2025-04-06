import { Injectable } from '@angular/core';
import { Layer } from '../layer';
import { BaseLayer } from '../base-layer';

@Injectable()
export class TransformService {
  // 保留变换状态变量
  public translatePos = { x: 0, y: 0 };
  public scale = 1;
  public rotation = 0;

  // 其他方法需要修改，使用ViewportService获取视口信息
  handlePan(
    event: MouseEvent, 
    startPos: { x: number, y: number }, 
    viewportWidth: number,
    viewportHeight: number,
    layers: BaseLayer[]
  ): void {
    const dx = event.clientX - startPos.x;
    const dy = event.clientY - startPos.y;
    
    // 考虑旋转角度，计算在旋转坐标系中的位移
    const cosTheta = Math.cos(this.rotation);
    const sinTheta = Math.sin(this.rotation);
    
    // 在旋转坐标系中的位移
    const rotatedDx = dx * cosTheta + dy * sinTheta;
    const rotatedDy = -dx * sinTheta + dy * cosTheta;
    
    // 计算新的平移位置
    const newTranslateX = this.translatePos.x + rotatedDx;
    const newTranslateY = this.translatePos.y + rotatedDy;
    
    // 获取所有Layer中最大的尺寸
    let maxLayerWidth = 0;
    let maxLayerHeight = 0;
    
    for (const layer of layers) {
      maxLayerWidth = Math.max(maxLayerWidth, layer.w);
      maxLayerHeight = Math.max(maxLayerHeight, layer.h);
      // if (layer instanceof Layer) {
       
      // }
    }
    
    // 计算允许的最大平移范围
    const minX = Math.min(0, viewportWidth - maxLayerWidth * this.scale);
    const minY = Math.min(0, viewportHeight - maxLayerHeight * this.scale);
    
    // 应用边界限制
    this.translatePos.x = Math.max(minX, Math.min(0, newTranslateX));
    this.translatePos.y = Math.max(minY, Math.min(0, newTranslateY));
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
    mousePos: { x: number, y: number }
  ): void {
    const zoomFactor = 1 + deltaY * 0.005;
    const newScale = this.scale * zoomFactor;

    // 计算新的偏移位置，使得缩放以鼠标为中心
    const worldPos = {
      x: (mousePos.x - this.translatePos.x) / this.scale,
      y: (mousePos.y - this.translatePos.y) / this.scale,
    };
    this.translatePos.x = mousePos.x - worldPos.x * newScale;
    this.translatePos.y = mousePos.y - worldPos.y * newScale;
    this.scale = newScale;
  }

  handleRotate(
    startPos: { x: number, y: number },
    mousePos: { x: number, y: number },
    centerX: number,
    centerY: number
  ): void {
    // 计算鼠标相对于画布中心的角度
    const startAngle = Math.atan2(
      startPos.y - centerY,
      startPos.x - centerX
    );
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
    mousePos: { x: number, y: number }
  ): void {
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
  }
  
  // 重置变换状态
  resetTransform() {
    this.translatePos = { x: 0, y: 0 };
    this.scale = 1;
    this.rotation = 0;
  }
}