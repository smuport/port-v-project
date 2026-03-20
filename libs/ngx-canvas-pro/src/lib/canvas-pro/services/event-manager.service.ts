import { Injectable, Renderer2, RendererFactory2 } from '@angular/core';
import { ViewportInteractionConfig } from '../interaction';

@Injectable()
export class EventManagerService {
  private renderer: Renderer2;
  private eventListeners: (() => void)[] = [];

  constructor(rendererFactory: RendererFactory2) {
    this.renderer = rendererFactory.createRenderer(null, null);
  }

  addManagedEventListener(
    target: any,
    eventName: string,
    callback: (event: any) => void
  ): void {
    const unsubscribe = this.renderer.listen(target, eventName, callback);
    this.eventListeners.push(unsubscribe);
  }

  setupViewportWarpperEvents(wrapper: HTMLDivElement,
    handlers: {
      onScroll: (event: Event) => void;
    }
  ) {
    this.addManagedEventListener(wrapper, 'scroll', (event) =>
      handlers.onScroll(event)
    );
  }

  setupCanvasEvents(
    canvasElement: HTMLElement,
    handlers: {
      onMouseDown: (event: MouseEvent) => void;
      onMouseMove: (event: MouseEvent) => void;
      onMouseUp: (event: MouseEvent) => void;
      onBlur: (event: FocusEvent) => void;
      onWheel: (event: WheelEvent) => void;
      onScroll?: (event: Event) => void;
    }
  ): void {
    this.addManagedEventListener(canvasElement, 'mousedown', (event) =>
      handlers.onMouseDown(event)
    );

    this.addManagedEventListener(canvasElement, 'mousemove', (event) =>
      handlers.onMouseMove(event)
    );

    this.addManagedEventListener(canvasElement, 'mouseup', (event) =>
      handlers.onMouseUp(event)
    );

    this.addManagedEventListener(canvasElement, 'blur', (event) =>
      handlers.onBlur(event)
    );

    this.addManagedEventListener(canvasElement, 'wheel', (event) =>
      handlers.onWheel(event)
    );
    this.addManagedEventListener(canvasElement, 'scroll', (event) =>
      handlers.onScroll?.(event)
    );
  }

  setupGlobalEvents(handlers: {
    onGlobalMouseUp: (event: MouseEvent) => void;
  }): void {
    this.addManagedEventListener(window, 'mouseup', (event) =>
      handlers.onGlobalMouseUp(event)
    );
  }

  destroy(): void {
    this.eventListeners.forEach((unsubscribe) => unsubscribe());
    this.eventListeners = [];
  }
}
