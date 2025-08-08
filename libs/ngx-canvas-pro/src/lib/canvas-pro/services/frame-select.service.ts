import { Injectable } from '@angular/core';
import { BaseLayer } from '../base-layer';
import { CpFrameSelectEvent } from '../event';

@Injectable()
export class FrameSelectService {
  public frameSelectRect = { x: 0, y: 0, width: 0, height: 0 };
  public isFrameSelecting = false;
  private selectedItems: any[] = [];

  startFrameSelect(mousePos: { x: number; y: number }): void {
    this.isFrameSelecting = true;
    this.frameSelectRect = {
      x: mousePos.x,
      y: mousePos.y,
      width: 0,
      height: 0,
    };
  }

  updateFrameSelect(mousePos: { x: number; y: number }): void {
    if (!this.isFrameSelecting) return;

    this.frameSelectRect.width = mousePos.x - this.frameSelectRect.x;
    this.frameSelectRect.height = mousePos.y - this.frameSelectRect.y;
  }

  drawFrameSelectRect(ctx: CanvasRenderingContext2D): void {
    if (!this.isFrameSelecting) return;

    ctx.save();
    ctx.strokeStyle = 'rgba(0, 123, 255, 0.8)';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 3]);
    ctx.strokeRect(
      this.frameSelectRect.x,
      this.frameSelectRect.y,
      this.frameSelectRect.width,
      this.frameSelectRect.height
    );
    ctx.fillStyle = 'rgba(0, 123, 255, 0.1)';
    ctx.fillRect(
      this.frameSelectRect.x,
      this.frameSelectRect.y,
      this.frameSelectRect.width,
      this.frameSelectRect.height
    );
    ctx.restore();
  }

  finishFrameSelect(
    layers: BaseLayer[],
    event: MouseEvent
  ): CpFrameSelectEvent | null {
    console.log('触发finish');

    if (!this.isFrameSelecting) return null;

    // 标准化选择框（处理负宽度/高度）
    const selection = this.normalizeRect(this.frameSelectRect);

    // 检查每个图层中的元素是否在选择框内
    this.selectedItems = [];
    for (const layer of layers) {
      const selectedData = layer.checkSelection(selection);
      if (selectedData && selectedData.length > 0) {
        this.selectedItems.push(...selectedData);
      }
    }

    // 创建框选事件
    const cpFrameSelectEvent = new CpFrameSelectEvent(event);
    cpFrameSelectEvent.selection = selection;
    cpFrameSelectEvent.selectedItems = this.selectedItems;

    // 重置框选状态
    this.isFrameSelecting = false;
    this.frameSelectRect = { x: 0, y: 0, width: 0, height: 0 };

    return cpFrameSelectEvent;
  }

  private normalizeRect(rect: {
    x: number;
    y: number;
    width: number;
    height: number;
  }) {
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
