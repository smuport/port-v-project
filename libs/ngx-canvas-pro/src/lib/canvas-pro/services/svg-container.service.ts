import { Injectable, Renderer2, RendererFactory2 } from '@angular/core';
import { SvgLayer } from '../svg-layer';

@Injectable()
export class SvgContainerService {
  private svgContainer: HTMLDivElement | null = null;
  private renderer: Renderer2;
  private eventListeners: (() => void)[] = [];

  constructor(rendererFactory: RendererFactory2) {
    this.renderer = rendererFactory.createRenderer(null, null);
  }

  attachToParent(parent: HTMLElement): void {
    if (this.svgContainer) {
      return;
    }

    // 创建SVG容器
    this.svgContainer = this.renderer.createElement('div');
    
    // 设置SVG容器样式，确保与Canvas完全重叠
    this.renderer.setStyle(this.svgContainer, 'position', 'absolute');
    this.renderer.setStyle(this.svgContainer, 'top', '0');
    this.renderer.setStyle(this.svgContainer, 'left', '0');
    this.renderer.setStyle(this.svgContainer, 'width', '100%');
    this.renderer.setStyle(this.svgContainer, 'height', '100%');
    this.renderer.setStyle(this.svgContainer, 'pointer-events', 'none');
    this.renderer.setStyle(this.svgContainer, 'z-index', '1');
    this.renderer.setStyle(this.svgContainer, 'transform-origin', '0 0');
    
    // 添加到父元素
    this.renderer.appendChild(parent, this.svgContainer);
  }

  addSvgLayer(layer: SvgLayer): void {
    if (!this.svgContainer || !layer.svgElement) {
      return;
    }
    
    // 设置SVG元素样式
    this.renderer.setStyle(layer.svgElement, 'position', 'absolute');
    this.renderer.setStyle(layer.svgElement, 'top', '0');
    this.renderer.setStyle(layer.svgElement, 'left', '0');
    this.renderer.setStyle(layer.svgElement, 'width', '100%');
    this.renderer.setStyle(layer.svgElement, 'height', '100%');
    this.renderer.setStyle(layer.svgElement, 'pointer-events', 'auto');
    
    // 添加到SVG容器
    this.renderer.appendChild(this.svgContainer, layer.svgElement);
  }

  updateViewportSize(w: number, h: number) {
    // this.renderer.setAttribute(this.svgContainer?.firstChild, 'width', `${w}`);
    // this.renderer.setAttribute(this.svgContainer?.firstChild, 'height', `${h}`);
    // svg 宽高应该和offscreencanvas 一样大小
    //viewBox 应该和viewport大小一样
    // 该函数是调整视口大小
    this.renderer.setAttribute(this.svgContainer?.firstChild, 'viewBox', `0 0 ${w} ${h}`);

  }

  setupEventForwarding(canvas: HTMLCanvasElement): void {
    
    if (!this.svgContainer) {
      return;
    }
    
    // 设置事件转发
    const events = ['mousedown', 'mousemove', 'mouseup', 'wheel', 'click', 'dblclick'];
    
    for (const eventName of events) {
      const unsubscribe = this.renderer.listen(this.svgContainer, eventName, (event: Event) => {
        // 阻止事件冒泡
        event.stopPropagation();
        
        // 创建新事件并分发到Canvas
        const newEvent = new Event(eventName, {
          bubbles: true,
          cancelable: true,
        });
        
        // 复制事件属性
              // 复制鼠标事件的属性
      if (event instanceof MouseEvent) {
        Object.defineProperties(newEvent, {
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
        Object.defineProperties(newEvent, {
          deltaX: { value: event.deltaX },
          deltaY: { value: event.deltaY },
          deltaZ: { value: event.deltaZ },
          deltaMode: { value: event.deltaMode },
        });
      }
        
        // 分发到Canvas
        canvas.dispatchEvent(newEvent);
      });
      
      this.eventListeners.push(unsubscribe);
    }
  }



  updateTransform(
    translateX: number,
    translateY: number,
    scale: number,
    rotation: number
  ): void {
    if (!this.svgContainer) {
      return;
    }
    
    // 获取Canvas的宽度和高度
    const canvas = this.svgContainer.parentElement?.querySelector('canvas');
    if (!canvas) {
      return;
    }
    
    const width = canvas.width;
    const height = canvas.height;
    
    // 计算中心点
    const centerX = width / 2;
    const centerY = height / 2;
    
    // 计算旋转角度（从弧度转为度）
    const rotationDeg = (rotation * 180) / Math.PI;
    
    // 构建CSS变换矩阵
    // 注意：CSS变换的顺序是从右到左应用的，与Canvas相反
    const transform = 
      `translate(${centerX}px, ${centerY}px) ` +
      `rotate(${rotationDeg}deg) ` +
      `scale(${scale}) ` +
      `translate(${-centerX + translateX}px, ${-centerY + translateY}px)`;
    
    // 应用变换
    this.renderer.setStyle(this.svgContainer, 'transform', transform);
  }

  destroy(): void {
    // 清理事件监听器
    for (const unsubscribe of this.eventListeners) {
      unsubscribe();
    }
    this.eventListeners = [];
    
    // 移除SVG容器
    if (this.svgContainer && this.svgContainer.parentElement) {
      this.renderer.removeChild(this.svgContainer.parentElement, this.svgContainer);
    }
    
    this.svgContainer = null;
  }
}