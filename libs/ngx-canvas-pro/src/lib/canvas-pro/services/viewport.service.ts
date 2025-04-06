import { Injectable, ElementRef } from '@angular/core';
import { Layer } from '../layer';
import { SvgLayer } from '../svg-layer';
import { BaseLayer } from '../base-layer';
import { TransformService } from './transform.service';

@Injectable()
export class ViewportService {
  private canvasViewport: ElementRef<HTMLCanvasElement> | null = null;
  private canvasContext: CanvasRenderingContext2D | null = null;
  private svgContainer: HTMLElement | null = null;
  private layers: BaseLayer[] = [];

  constructor(private transformService: TransformService) {}

  initialize(
    canvasViewport: ElementRef<HTMLCanvasElement>,
    canvasContext: CanvasRenderingContext2D,
    svgContainer: HTMLElement
  ) {
    this.canvasViewport = canvasViewport;
    this.canvasContext = canvasContext;
    this.svgContainer = svgContainer;
  }

  setLayers(layers: BaseLayer[]) {
    this.layers = layers;
  }

  // 调整视口大小以适应父容器
  fitToParent() {
    if (!this.canvasViewport || !this.svgContainer) return;
    
    const parent = this.canvasViewport.nativeElement.parentElement;
    if (!parent) return;
    
    const parentRect = parent.getBoundingClientRect();
    this.updateViewportSize(parentRect.width, parentRect.height);
    // // 设置Canvas视口大小
    // this.canvasViewport.nativeElement.width = parentRect.width;
    // this.canvasViewport.nativeElement.height = parentRect.height;
    
    // // 设置SVG容器的物理尺寸
    // // this.svgContainer.style.width = `${parentRect.width}px`;
    // // this.svgContainer.style.height = `${parentRect.height}px`;
    // this.svgContainer.setAttribute('width', parentRect.width.toString());
    // this.svgContainer.setAttribute('height', parentRect.height.toString());
    this.drawViewport();
  }

  // 更新视口大小
  updateViewportSize(w: number, h: number) {
    if (!this.canvasViewport || !this.svgContainer) return;
    
    // 更新Canvas视口大小
    this.canvasViewport.nativeElement.width = w;
    this.canvasViewport.nativeElement.height = h;
    
    // 更新SVG容器大小
    this.svgContainer.style.width = `${w}px`;
    this.svgContainer.style.height = `${h}px`;
  }

  // 绘制视口
  drawViewport() {
    if (!this.canvasViewport || !this.canvasContext || !this.svgContainer) return;
    
    // 清除Canvas
    this.canvasContext.clearRect(
      0, 
      0, 
      this.canvasViewport.nativeElement.width, 
      this.canvasViewport.nativeElement.height
    );
    
    // 保存当前上下文状态
    this.canvasContext.save();
    
    // 获取画布中心点
    const canvasWidth = this.canvasViewport.nativeElement.width;
    const canvasHeight = this.canvasViewport.nativeElement.height;
    const centerX = canvasWidth / 2;
    const centerY = canvasHeight / 2;
    
    // 从TransformService获取变换状态
    const { translatePos, scale, rotation } = this.transformService;
    
    // 应用变换：先将原点移到画布中心，然后旋转，再缩放，最后平移
    this.canvasContext.translate(centerX, centerY);
    this.canvasContext.rotate(rotation);
    this.canvasContext.scale(scale, scale);
    this.canvasContext.translate(-centerX + translatePos.x, -centerY + translatePos.y);
    
    // 绘制所有Canvas图层
    const canvasLayers = this.layers.filter(layer => layer instanceof Layer) as Layer[];
    for (const layer of canvasLayers) {
      this.canvasContext.drawImage(layer.canvas, 0, 0);
    }
    
    // 恢复上下文状态
    this.canvasContext.restore();
    
    // 更新SVG容器的变换
    
    const svgLayers = this.layers.filter(layer => layer instanceof SvgLayer) as SvgLayer[];

    for (const layer of svgLayers) {
      
      this.applySvgTransform(layer.svgElement)
      this.svgContainer?.appendChild(layer.svgElement);

      
      // this.canvasContext.drawImage(layer.canvas, 0, 0);
    }
    // this.updateSvgTransform();
  }

    // 更新SVG容器的变换
    private applySvgTransform(svgGroup: SVGSVGElement) {
      // console.log('updateSvgTransform', this.svgContainer);
      if (!this.svgContainer || !this.canvasViewport) return;
      
      const canvasWidth = this.canvasViewport.nativeElement.width;
      const canvasHeight = this.canvasViewport.nativeElement.height;
      const centerX = canvasWidth / 2;
      const centerY = canvasHeight / 2;
      
      // 从TransformService获取变换状态
      const { translatePos, scale, rotation } = this.transformService;
      
      // 计算旋转角度（从弧度转为度）
      const rotationDeg = (rotation * 180) / Math.PI;
      
      // 构建SVG变换字符串
      // 注意：SVG变换的顺序与Canvas相反，最先应用的变换写在最右边
      const transform = `translate(${centerX}px, ${centerY}px) ` +
                        `rotate(${rotationDeg}deg) ` +
                        `scale(${scale}) ` +
                        `translate(${-centerX + translatePos.x}px, ${-centerY + translatePos.y}px)`;
      
      svgGroup.style.transform = transform;
      svgGroup.style.transformOrigin = '0 0';
    }

  // 更新SVG容器的变换
  private updateSvgTransform() {
    console.log('updateSvgTransform', this.svgContainer);
    if (!this.svgContainer || !this.canvasViewport) return;
    
    const canvasWidth = this.canvasViewport.nativeElement.width;
    const canvasHeight = this.canvasViewport.nativeElement.height;
    const centerX = canvasWidth / 2;
    const centerY = canvasHeight / 2;
    
    // 从TransformService获取变换状态
    const { translatePos, scale, rotation } = this.transformService;
    
    // 计算旋转角度（从弧度转为度）
    const rotationDeg = (rotation * 180) / Math.PI;
    
    // 构建SVG变换字符串
    // 注意：SVG变换的顺序与Canvas相反，最先应用的变换写在最右边
    const transform = `translate(${centerX}px, ${centerY}px) ` +
                      `rotate(${rotationDeg}deg) ` +
                      `scale(${scale}) ` +
                      `translate(${-centerX + translatePos.x}px, ${-centerY + translatePos.y}px)`;
    
    this.svgContainer.style.transform = transform;
    this.svgContainer.style.transformOrigin = '0 0';
  }

  // 获取鼠标位置
  getMousePos(event: MouseEvent) {
    if (!this.canvasViewport) return { x: 0, y: 0 };
    
    const rect = this.canvasViewport.nativeElement.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  }

  // 获取坐标轴位置（将视口坐标转换为图层坐标）
  getAxis(mousePos: { x: number; y: number }) {
    if (!this.canvasViewport) return { x: 0, y: 0 };
    
    // 获取画布中心点
    const canvasWidth = this.canvasViewport.nativeElement.width;
    const canvasHeight = this.canvasViewport.nativeElement.height;
    const centerX = canvasWidth / 2;
    const centerY = canvasHeight / 2;
    
    // 从TransformService获取变换状态
    const { translatePos, scale, rotation } = this.transformService;
    
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
    return {
      x: scaledX + centerX - translatePos.x,
      y: scaledY + centerY - translatePos.y,
    };
  }
  
  // 获取当前视口的宽高
  getViewportSize() {
    if (!this.canvasViewport) return { width: 0, height: 0 };
    
    return {
      width: this.canvasViewport.nativeElement.width,
      height: this.canvasViewport.nativeElement.height
    };
  }
  
  // 获取Canvas元素
  getCanvasElement(): HTMLCanvasElement | null {
    return this.canvasViewport ? this.canvasViewport.nativeElement : null;
  }
}